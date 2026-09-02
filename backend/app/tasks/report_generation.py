import time
from datetime import datetime, timezone

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.job import Job
from app.models.job_log import JobLog
from app.redis_client import redis_client
from app.tasks.utils import is_cancelled
from app.enums import JobStatus,JobType
# =========================================================
# REPORT GENERATION PROCESSING STAGES imported from utils.py
# =========================================================

STAGES = [
    "Loading report configuration",
    "Fetching source data",
    "Validating report data",
    "Preparing report structure",
    "Processing report sections",
    "Generating report content",
    "Applying report formatting",
    "Generating final document",
    "Saving generated report",
    "Finalizing report generation",
]

# =========================================================
# CELERY TASK
# =========================================================

@celery_app.task(
    bind=True,
    max_retries=3,
)
def generate_report(self, job_id: str):

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
                    message="Report generation started",
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
            # Simulate report-generation work
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
                "Report generation "
                "completed successfully"
            ),
            "report": (
                f"/reports/report-{job.id}.pdf"
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
                    "Report generation "
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
                            f"Report generation failed: "
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