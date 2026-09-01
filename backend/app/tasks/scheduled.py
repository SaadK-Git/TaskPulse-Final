from datetime import datetime, timedelta, timezone

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.job import Job
from app.redis_client import redis_client

from app.enums import JobStatus
@celery_app.task
def cleanup_old_jobs():

    db = SessionLocal()

    try:

        cutoff_date = (
            datetime.now(timezone.utc)
            - timedelta(days=7)
        )

        old_jobs = (
            db.query(Job)
            .filter(Job.created_at < cutoff_date)
            .all()
        )

        for job in old_jobs:
            db.delete(job)

        db.commit()

        redis_client.delete("dashboard:stats")

        return {
            "deleted_jobs": len(old_jobs)
        }

    finally:

        db.close()


@celery_app.task
def refresh_dashboard():

    db = SessionLocal()

    try:

        total_jobs = db.query(Job).count()

        pending_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.PENDING)
            .count()
        )

        running_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.RUNNING)
            .count()
        )

        completed_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.COMPLETED)
            .count()
        )

        failed_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.FAILED)
            .count()
        )

        dashboard_stats = {
            "total_jobs": total_jobs,
            "pending_jobs": pending_jobs,
            "running_jobs": running_jobs,
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
        }

        redis_client.set(
            "dashboard:stats",
            str(dashboard_stats),
            ex=300,
        )

        return dashboard_stats

    finally:

        db.close()


@celery_app.task
def generate_summary():

    db = SessionLocal()

    try:

        total_jobs = db.query(Job).count()

        completed_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.COMPLETED)
            .count()
        )

        failed_jobs = (
            db.query(Job)
            .filter(Job.status == JobStatus.FAILED)
            .count()
        )

        message = (
            f"Hourly summary: "
            f"{total_jobs} total jobs, "
            f"{completed_jobs} completed, "
            f"{failed_jobs} failed."
        )

        print(message)

        return {
            "message": message
        }

    finally:

        db.close()