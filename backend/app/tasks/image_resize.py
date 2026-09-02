import time
from datetime import datetime, timezone

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.job import Job
from app.models.job_log import JobLog
from app.redis_client import redis_client
from app.tasks.utils import is_cancelled,STAGES
from app.enums import JobStatus,JobType

# =========================================================
# IMAGE RESIZE PROCESSING STAGES 
# =========================================================
STAGES = [
    "Loading source image",
    "Validating image format",
    "Reading image metadata",
    "Preparing resize operation",
    "Calculating target dimensions",
    "Resizing image",
    "Applying image transformations",
    "Optimizing image",
    "Saving resized image",
    "Finalizing image processing",
]
# =========================================================
# CELERY TASK
# =========================================================

@celery_app.task(
    bind=True,
    max_retries=3,
)
def resize_image(self, job_id: str):

    db = SessionLocal()

    progress_key = f"job:progress:{job_id}"

    try:

        # =================================================
        # PHASE 1
        # Fetch the Job from PostgreSQL
        # =================================================

        job = db.get(Job, job_id)

        if not job:
            raise ValueError(
                f"Job {job_id} not found"
            )


        # =================================================
        # PHASE 2
        # Idempotency guard
        # =================================================

        if job.status == JobStatus.COMPLETED:

            return job.result


        # =================================================
        # PHASE 3
        # Establish RUNNING state
        # =================================================

        if job.status != JobStatus.RUNNING:

            job.status = JobStatus.RUNNING

            job.started_at = (
                datetime.now(timezone.utc)
            )

            job.progress = 0

            db.commit()


            db.add(
                JobLog(
                    job_id=job.id,
                    message="Image resize processing started",
                    level="info",
                )
            )

            db.commit()


        # =================================================
        # PHASE 4
        # Determine resume point
        # =================================================

        completed_progress = job.progress or 0

        start_index = completed_progress // 10


        # =================================================
        # PHASE 5
        # Execute stages
        # =================================================

        for index in range(
            start_index,
            len(STAGES),
        ):
            # ==============================
            # CHECK FOR CANCELLATION
            # ==============================

            if is_cancelled(job_id):

                job.status = JobStatus.CANCELLED

                db.commit()

                return {
                    "status": "cancelled"
                }

            #===============================
            stage = STAGES[index]

            progress = (index + 1) * 10


            # ---------------------------------------------
            # Simulate image-processing work
            # ---------------------------------------------

            time.sleep(3)


            # ---------------------------------------------
            # Durable checkpoint + JobLog
            # ---------------------------------------------

            job.progress = progress

            db.add(
                JobLog(
                    job_id=job.id,
                    message=(
                        f"Stage {index + 1}/"
                        f"{len(STAGES)}: "
                        f"{stage} — "
                        f"{progress}% complete"
                    ),
                    level="info",
                )
            )

            db.commit()


            # ---------------------------------------------
            # Redis live progress
            # ---------------------------------------------

            try:

                redis_client.set(
                    progress_key,
                    progress,
                )

            except Exception:

                pass


        # =================================================
        # PHASE 6
        # Task completed
        # =================================================

        job.status = JobStatus.COMPLETED

        job.progress = 100

        job.completed_at = (
            datetime.now(timezone.utc)
        )

        job.result = {
            "message": (
                "Image resize processing "
                "completed successfully"
            ),
            "output": (
                f"/outputs/{job.id}.jpg"
            ),
            "stages_completed": len(STAGES),
        }

        db.commit()


        # ---------------------------------------------
        # Final completion log
        # ---------------------------------------------

        db.add(
            JobLog(
                job_id=job.id,
                message=(
                    "Image resize processing "
                    "completed successfully"
                ),
                level="info",
            )
        )

        db.commit()


        # ---------------------------------------------
        # Dashboard cache invalidation
        # ---------------------------------------------

        try:

            redis_client.delete(
                "dashboard:stats"
            )

        except Exception:

            pass


        return job.result


    # =====================================================
    # PHASE 7
    # Exception / Retry handling
    # =====================================================

    except Exception as exc:

        db.rollback()

        try:

            raise self.retry(
                exc=exc,
                countdown=2 ** self.request.retries,
            )

        except self.MaxRetriesExceededError:

            job = db.get(
                Job,
                job_id,
            )

            if job:

                job.status = JobStatus.FAILED

                job.error = str(exc)

                job.completed_at = (
                    datetime.now(timezone.utc)
                )

                db.commit()


                db.add(
                    JobLog(
                        job_id=job.id,
                        message=(
                            f"Image resize processing failed: "
                            f"{exc}"
                        ),
                        level="error",
                    )
                )

                db.commit()


                try:

                    redis_client.delete(
                        "dashboard:stats"
                    )

                except Exception:

                    pass


            raise


    # =====================================================
    # PHASE 8
    # Close database session
    # =====================================================

    finally:

        db.close()