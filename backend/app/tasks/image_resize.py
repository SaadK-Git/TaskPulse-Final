import time
from datetime import datetime, timezone

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.job import Job
from app.models.job_log import JobLog
from app.redis_client import redis_client
from app.tasks.utils import is_cancelled
from app.enums import JobStatus,JobType,JobLogLevel

from app.services.cache_service import (
    get_progress,
    get_progress_channel,
    add_log,
    publish_log,
    publish_progress,
    set_progress,
    set_progress_status,
    publish_progress_status,
    create_async_pubsub,
)
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

            set_progress_status(job_id, "running")
            publish_progress_status(job_id, "running")

            db.commit()

            #Cache the initial log message in Redis and save in PostgreSQL    

            log = {
                "job_id": str(job.id),
                "message": "Image resize processing started",
                "level": "info",
            }

            log["level"] = JobLogLevel.INFO

            db.add(
                JobLog(**log)
            )

            db.commit()

            add_log(job_id, log)
            publish_log(job_id, log)
        # =================================================
        # PHASE 4
        # Determine resume point
        # =================================================

        completed_progress = job.progress or 0

        start_index = max(completed_progress // 10 - 1, 0)


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

                job.completed_at = datetime.now(timezone.utc)  

                log = {
                    "job_id": str(job.id),
                    "message": "Image resize processing cancelled",
                    "level": "warning",
                }

                # For PostgreSQL
                log["level"] = JobLogLevel.WARNING

                db.add(JobLog(**log))               

                job.result = {
                    "message": "Job cancelled"
                }

                db.commit()
                # db.refresh(job)
                #Adding the cancellation log to Redis through key+channel.
                add_log(job_id, log)
                publish_log(job_id, log)

                #progress status key update.
                set_progress_status(job_id, "cancelled")
                publish_progress_status(job_id, "cancelled")

                return {
                    "status": "cancelled"
                }

            #==============================
            stage = STAGES[index]

            progress = (index + 1) * 10


            # ---------------------------------------------
            # Simulate stage work
            # ---------------------------------------------

            time.sleep(30)


            # ---------------------------------------------
            # Durable checkpoint + JobLog
            # ---------------------------------------------

            job.progress = progress

            log = {
                "job_id": str(job.id),
                "message": (
                    f"Stage {index + 1}/"
                    f"{len(STAGES)}: "
                    f"{stage} — "
                    f"{progress}% complete"
                ),
                "level": "info",
            }

            # For PostgreSQL
            log["level"] = JobLogLevel.INFO

            db.add(JobLog(**log))

            db.commit()


            # ---------------------------------------------
            # Redis live progress
            # ---------------------------------------------

            try:
                #setting progress key + publishing the progress to respective channel for websocket.
                set_progress(
                    job_id,
                    progress,
                )

                publish_progress(
                    job_id,
                    progress,
                )

                add_log(job_id, log)
                publish_log(job_id, log)
                #set progress key for logs + publishing the log to respective channel for websocket.

            except Exception:

                pass


        # =================================================
        # PHASE 6
        # Task completed
        # =================================================
        job.progress = 100

        job.completed_at = (
            datetime.now(timezone.utc)
        )

        job.result = {
            "message": (
                "Image resize processing "
                "completed successfully"
            ),
            "stages_completed": len(STAGES),
        }

        db.commit()


        # ---------------------------------------------
        # Final completion log
        # ---------------------------------------------
        log = {
            "job_id": str(job.id),
            "message": "Image resize processing completed successfully",
            "level": "info",
        }

        add_log(job_id, log)
        publish_log(job_id, log)

        log["level"] = JobLogLevel.INFO    

        db.add(
            JobLog(**log)
        )

        db.commit()

        # ---------------------------------------------
        # Final Status Update.
        # ---------------------------------------------

        #progress status key update.
        set_progress_status(job_id, "completed")
        publish_progress_status(job_id, "completed")

        job.status = JobStatus.COMPLETED

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

                set_progress_status(job_id, "failed")
                publish_progress_status(job_id, "failed")

                job.status = JobStatus.FAILED

                job.error = str(exc)

                job.completed_at = (
                    datetime.now(timezone.utc)
                )

                db.commit()

                log = {
                    "job_id": str(job.id),
                    "message": (
                        f"Image resize processing failed: "
                        f"{exc}"
                    ),
                    "level": "error",
                }

                db.add(
                    JobLog(**log)
                )

                log["level"] = JobLogLevel.ERROR

                add_log(job_id, log)
                publish_log(job_id, log)

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