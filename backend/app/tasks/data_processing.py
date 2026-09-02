# app/tasks/data_processing.py

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
# data processing STAGES 
# # =========================================================
STAGES = [
    "Loading source data",
    "Validating input records",
    "Cleaning data",
    "Removing duplicate records",
    "Normalizing data",
    "Transforming data",
    "Applying business rules",
    "Aggregating results",
    "Validating processed data",
    "Saving processed results",
]


# =========================================================
# CELERY TASK
# =========================================================

@celery_app.task(
    bind=True,
    max_retries=3,
)
def process_data(self, job_id: str):

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
        #
        # If this task is delivered again after the job
        # has already completed, do not execute it again.
        # =================================================

        if job.status == JobStatus.COMPLETED:

            return job.result


        # =================================================
        # PHASE 3
        # Establish RUNNING state
        #
        # This happens only when the job is entering
        # execution for the first time.
        #
        # If Celery retries the task later, the job will
        # already have status="running", so we don't
        # recreate this initial state or initial log.
        # =================================================

        if job.status != JobStatus.RUNNING:

            job.status = JobStatus.RUNNING

            job.started_at = (
                datetime.now(timezone.utc)
            )

            job.progress = 0

            db.commit()


            # ---------------------------------------------
            # Initial JobLog
            # ---------------------------------------------

            db.add(
                JobLog(
                    job_id=job.id,
                    message="Data processing started",
                    level="info",
                )
            )

            db.commit()


        # =================================================
        # PHASE 4
        # Determine the stage from which execution starts
        #
        # PostgreSQL is the durable checkpoint.
        #
        # Example:
        #
        # progress = 70
        #
        # means stages 1-7 have already been completed.
        #
        # Therefore:
        #
        # start_index = 70 // 10
        #             = 7
        #
        # and Python's range(7, 10) begins with stage 8.
        # =================================================

        completed_progress = job.progress or 0

        start_index = completed_progress // 10


        # =================================================
        # PHASE 5
        # Execute the processing stages
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


            # -------------------------------------------------
            # Simulate the actual work of this stage
            # -------------------------------------------------

            time.sleep(3)


            # =================================================
            # PHASE 5A
            # Durable PostgreSQL checkpoint + JobLog
            #
            # These two operations belong to the same
            # PostgreSQL transaction.
            #
            # Therefore we don't end up with:
            #
            #     progress = 70
            #     but no Stage 7 log
            #
            # or vice versa.
            # =================================================

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


            # =================================================
            # PHASE 5B
            # Redis live-progress update
            #
            # Redis is being used for the dashboard/WebSocket
            # side of the architecture.
            #
            # PostgreSQL remains the durable checkpoint.
            #
            # If Redis temporarily fails, we DON'T want to
            # destroy the actual data-processing task.
            # =================================================

            try:

                redis_client.set(
                    progress_key,
                    progress,
                )

            except Exception:

                # Redis is unavailable.
                #
                # The actual task has still successfully
                # completed this stage because the durable
                # PostgreSQL checkpoint already exists.
                #
                # The dashboard may temporarily lack the
                # latest live progress value.

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
                "Data processing "
                "completed successfully"
            ),
            "stages_completed": len(STAGES),
        }


        # =================================================
        # Persist final Job state
        # =================================================

        db.commit()


        # =================================================
        # Final completion log
        # =================================================

        db.add(
            JobLog(
                job_id=job.id,
                message=(
                    "Data processing "
                    "completed successfully"
                ),
                level="info",
            )
        )

        db.commit()


        # =================================================
        # Dashboard cache invalidation
        # =================================================

        try:

            redis_client.delete(
                "dashboard:stats"
            )

        except Exception:

            pass


        # =================================================
        # Return result to Celery
        # =================================================

        return job.result


    # =====================================================
    # PHASE 7
    # Exception / Retry handling
    # =====================================================

    except Exception as exc:

        # ---------------------------------------------
        # Roll back any uncommitted database changes
        # ---------------------------------------------

        db.rollback()


        try:

            # -----------------------------------------
            # Ask Celery to retry the task
            #
            # Retry delays:
            #
            # attempt 1 → 1 second
            # attempt 2 → 2 seconds
            # attempt 3 → 4 seconds
            # -----------------------------------------

            raise self.retry(
                exc=exc,
                countdown=2 ** self.request.retries,
            )


        except self.MaxRetriesExceededError:

            # =========================================
            # All retries exhausted
            # =========================================

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


                # -------------------------------------
                # Record permanent failure
                # -------------------------------------

                db.add(
                    JobLog(
                        job_id=job.id,
                        message=(
                            f"Data processing failed: "
                            f"{exc}"
                        ),
                        level="error",
                    )
                )

                db.commit()


                # -------------------------------------
                # Dashboard cache is now stale
                # -------------------------------------

                try:

                    redis_client.delete(
                        "dashboard:stats"
                    )

                except Exception:

                    pass


            raise


    # =====================================================
    # PHASE 8
    # Always close the database session
    # =====================================================

    finally:

        db.close()