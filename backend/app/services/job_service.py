# app/services/job_service.py
import json
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app import redis_client
from app.models.job import Job
from app.tasks.data_processing import process_data
from app.tasks.bulk_email import send_bulk_email
from app.tasks.image_resize import resize_image
from app.tasks.report_generation import generate_report
from app.tasks.scheduled import *
from app.enums import JobStatus,JobType
from .cache_service import get_progress_key
from app.redis_client import redis_client
from app.database import get_db
from uuid import UUID  

from app.services.cache_service import (
    get_progress,
    create_async_pubsub,
    get_progress_channel,
    get_log_channel,
    get_logs,
    add_log,
    publish_log
)
from app.services.worker_service import dispatch_job
TASK_MAP = {
    "data_processing": process_data,
    "bulk_email": send_bulk_email,
    "image_resize": resize_image,
    "report_generation": generate_report,

}

def get_all_jobs(db: Session, user_id: int):
    return db.query(Job).filter(Job.user_id == user_id).all()

def create_job(
    db: Session,
    user_id: int,
    job_type: str,
    # title: str ,
):
    # Validate job type
    task = TASK_MAP.get(job_type)

    if not task:
        raise ValueError(
            f"Unsupported job type: {job_type}"
        )

    # Create database Job
    job = Job(
        user_id=user_id,
        job_type=JobType(job_type),
        status=JobStatus.PENDING,
        progress=0,
    )
    job.created_at = datetime.now(timezone.utc)

    db.add(job)

    # Save the Job first so it gets an ID
    db.commit()
    db.refresh(job)

    # Send the Job to Celery
    celery_task_id = dispatch_job(
        db=db,
        job=job,
        task=task,
    )

    return job, celery_task_id

def get_job_alllogs(db: Session, job_id: int):
    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise ValueError(
            f"Job with ID {job_id} not found"
        )

    return job.logs

def cancel_job(db:Session , job_id:int):
   
    try:

        job = db.get(Job, job_id)

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )

        if job.status not in ["queued", "running"]:
            raise HTTPException(
                status_code=400,
                detail="Job cannot be cancelled"
            )

        # Put the cancellation request in Redis

        redis_client.set(
            f"job:cancel:{job_id}",
            "1"
        )

        return {
            "job_id": job_id,
            "status": "cancellation_requested"
        }

    finally:

        db.close()

async def handle_job_progress(
    websocket,
    job_id,
):
    # ----------------------------------------------------------------------------------------
    # Get progress that already exists,if already completed, send it and close the connection
    # ----------------------------------------------------------------------------------------

    current_progress = await get_progress(
        job_id
    )

    if current_progress is not None:
        # Send the current progress to the client
        await websocket.send_json(
            {
                "job_id": str(job_id),
                "progress": current_progress,
            }
        )
        #if current progress is 100, close the connection
        if current_progress >= 100:
            await websocket.close()
            return
        
    #if in a situation when progress is either lost or not yet set.   
    elif current_progress is None:
        # fetch the progress from the database and send it to the client whatever it is
        db = get_db()
        job = db.query(Job).filter(Job.id == job_id).first()
        await websocket.send_json(
                {
                    "job_id": str(job_id),
                    "progress": job.progress if job else 0,
                }
            )
        await websocket.close()
        return
    # ---------------------------------------------
    # estabilish pub/sub for new progress
    # ---------------------------------------------

    pubsub = create_async_pubsub()

    channel = get_progress_channel(
        job_id
    )

    await pubsub.subscribe(
        channel
    )

    # ---------------------------------------------
    # Listen for new progress
    # ---------------------------------------------

    try:

        while True:

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1,
            )

            if message is not None:

                progress = int(
                    message["data"]
                )

                await websocket.send_json(
                    {
                        "job_id": str(job_id),
                        "progress": progress,
                    }
                )

                if progress >= 100:
                    await websocket.close()
                    break

    finally:

        await pubsub.unsubscribe(
            channel
        )

        await pubsub.aclose()

        key = get_progress_key(job_id)

        redis_client.delete(
            key
        )



async def event_stream(job_id: UUID):
        

        pubsub = create_async_pubsub()

        channel = get_log_channel(job_id)

        try:

            # -----------------------------
            # 1. Historical logs
            # -----------------------------

            logs = await get_logs(job_id)

            for log in logs:

                yield (
                    f"data: {json.dumps(log)}\n\n"
                )

            # -----------------------------
            # 2. Subscribe for new logs
            # -----------------------------

            await pubsub.subscribe(channel)

            # -----------------------------
            # 3. Live logs
            # -----------------------------

            while True:

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1,
                )

                if message is not None:

                    yield (
                        f"data: {message['data']}\n\n"
                    )

        finally:

            await pubsub.unsubscribe(channel)

            await pubsub.aclose()

