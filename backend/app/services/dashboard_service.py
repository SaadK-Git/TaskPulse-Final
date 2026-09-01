from app.models import user, job
from app.enums import JobStatus
from . import worker_service


def get_Admin_dashboard_stats(db):
    # Get total number of users
    total_users = db.query(user.User).count()

    # Get total number of jobs
    total_jobs = db.query(job.Job).count()

    # Get number of active workers
    active_workers = worker_service.get_worker_count()

    return {
        "total_users": total_users,
        "total_jobs": total_jobs,
        "worker_status": {
            "active_workers": active_workers
        }
    }


def get_Member_dashboard_stats(db, user_id):
    # Get total number of jobs for this member
    total_jobs = (
        db.query(job.Job)
        .filter(job.Job.user_id == user_id)
        .count()
    )

    # Get number of pending jobs
    pending_jobs = (
        db.query(job.Job)
        .filter(
            job.Job.user_id == user_id,
            job.Job.status == JobStatus.PENDING
        )
        .count()
    )

    # Get number of running jobs
    running_jobs = (
        db.query(job.Job)
        .filter(
            job.Job.user_id == user_id,
            job.Job.status == JobStatus.RUNNING
        )
        .count()
    )

    # Get number of completed jobs
    completed_jobs = (
        db.query(job.Job)
        .filter(
            job.Job.user_id == user_id,
            job.Job.status == JobStatus.COMPLETED
        )
        .count()
    )

    # Get number of failed jobs
    failed_jobs = (
        db.query(job.Job)
        .filter(
            job.Job.user_id == user_id,
            job.Job.status == JobStatus.FAILED
        )
        .count()
    )

    # Get completed jobs so we can calculate average duration
    completed_jobs_list = (
        db.query(job.Job)
        .filter(
            job.Job.user_id == user_id,
            job.Job.status == JobStatus.COMPLETED,
            job.Job.started_at.isnot(None),
            job.Job.completed_at.isnot(None)
        )
        .all()
    )

    average_duration_by_type = {
        "data_processing": 0,
        "report_generation": 0,
        "bulk_email": 0,
        "image_resize": 0
    }

    for job_item in completed_jobs_list:
        duration = (
            job_item.completed_at - job_item.started_at
        ).total_seconds()

        job_type = job_item.job_type

        average_duration_by_type[job_type] += duration

    for job_type in average_duration_by_type:
        type_jobs = [
            job_item
            for job_item in completed_jobs_list
            if job_item.job_type == job_type
        ]

        if len(type_jobs) > 0:
            total_duration = average_duration_by_type[job_type]
            average_duration_by_type[job_type] = (
                total_duration / len(type_jobs)
            )

    return {
        "total_jobs": total_jobs,
        "pending_jobs": pending_jobs,
        "running": running_jobs,
        "completed": completed_jobs,
        "failed": failed_jobs,
        "average_duration_by_type": average_duration_by_type
    }