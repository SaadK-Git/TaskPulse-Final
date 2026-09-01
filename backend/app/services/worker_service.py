from datetime import datetime, timezone

from app.celery_app import celery_app
from app.models.job import Job
from app.database import SessionLocal
from app.enums import JobStatus

def dispatch_job(
    db,
    job,
    task,
):
    # Send the job to Celery
    celery_result = task.delay(
        job_id=job.id,
        # job_type=job.job_type,
    )

    # Store the Celery task ID
    job.celery_task_id = celery_result.id
    job.status = JobStatus.PENDING
    job.started_at = (
            datetime.now(timezone.utc)
        )

    db.commit()
    db.refresh(job)

    return celery_result.id


def get_task_status(task_id: str):
    # Get the Celery task using its ID
    result = celery_app.AsyncResult(task_id)

    return {
        "task_id": task_id,
        "state": result.state,
        "result": result.result if result.successful() else None,
    }


def get_worker_count():
    inspect = celery_app.control.inspect()

    workers = inspect.ping()

    if not workers:
        return 0

    return len(workers)