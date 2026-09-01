from celery import Celery
from celery.schedules import crontab

from app.config import settings


celery_app = Celery(
    "taskpulse",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)


# Tasks that Celery needs to know about
celery_app.autodiscover_tasks(
    [
        "app.tasks.report_generation",
        "app.tasks.data_processing",
        "app.tasks.bulk_email",
        "app.tasks.image_resize",
        "app.tasks.scheduled",
    ]
)


# Celery Beat schedules
celery_app.conf.beat_schedule = {

    "cleanup-old-jobs-every-midnight": {
        "task": "app.tasks.scheduled.cleanup_old_jobs",
        "schedule": crontab(
            hour=0,
            minute=0,
        ),
    },

    "refresh-dashboard-every-five-minutes": {
        "task": "app.tasks.scheduled.refresh_dashboard",
        "schedule": 300.0,
    },

    "generate-summary-every-hour": {
        "task": "app.tasks.scheduled.generate_summary",
        "schedule": 3600.0,
    },
}


celery_app.conf.timezone = "Asia/Kolkata"