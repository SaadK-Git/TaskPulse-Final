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
from .cache_service import get_progress_key,get_progress_status_channel,set_progress_status,get_progress_status
from app.redis_client import redis_client
from app.database import SessionLocal
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

def get_all_jobs(db: Session, user_id: int,page: int = 1, page_size: int = 10):
    return db.query(Job).filter(Job.user_id == user_id).offset((page - 1) * page_size).limit(page_size).all()

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

        if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
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
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()

    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        await websocket.send_json(
            {
                "job_id": str(job_id),
                "progress": job.progress,
            }
        )
        await websocket.close()
        return 
    #get the current progress and status of the job from Redis
    current_progress = await get_progress(
        job_id
    )
    #
    current_status = await get_progress_status(
        job_id
    )
    #Checking because some kind of race condition might have occured,bear with me.
    if current_status in ["failed", "cancelled","completed"]:
        await websocket.send_json(
            {
                "job_id": str(job_id),
                "progress": current_progress if current_progress is not None else job.progress
            }
        )
        await websocket.close()
        return
    #finally closing the database connection for good.
    db.close()

    #once we handle all the different post "live" scenarios,we can now imagine being in a "live" scenario where the job is still running.
    if current_progress is not None:
        # Send the current progress to the client
        await websocket.send_json(
            {
                "job_id": str(job_id),
                "progress": current_progress,
            }
        )

    # ---------------------------------------------
    # estabilish pub/sub for new progress
    # ---------------------------------------------

    pubsub = create_async_pubsub()

    #getting channel keys for progress and status updates.
    progress_channel = get_progress_channel(
        job_id
    )
    progress_status_channel = get_progress_status_channel(
        job_id
    )

    #Subscribing to the respective channels.
    await pubsub.subscribe(
        progress_channel
    )

    await pubsub.subscribe(
        progress_status_channel
    )

    # ---------------------------------------------
    # Listen for new progress
    # ---------------------------------------------
    #Starting the connection with the client and sending the progress updates as they come in.
    try:

        while True:

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1,
            )

                
            if message is not None:

                #Get the name of the channel,which could either be "status" or the "progress" percentage.
                channel = message["channel"]    

                #Check whether the task has already been failed or cancelled.
                if channel == progress_status_channel and message["data"] in ["failed", "cancelled"]:

                    #Stop the connection as soon as the task has been failed or cancelled.
                    await websocket.send_json(
                        {
                            "job_id": str(job_id),
                            "progress": await get_progress(job_id),
                        }
                    )
                    await websocket.close()
                    break

                #Continue fetching the data if the procedure is not either canceled or failed.
                progress = int(
                    message["data"]
                )

                
                #Send the progress to the client
                await websocket.send_json(
                    {
                        "job_id": str(job_id),
                        "progress": progress,
                    }
                )

                #If the progress is 100, close the connection since the task has been completed.
                if progress >= 100:
                    await websocket.close()
                    break

    finally:

        #Do final cleanup,unsubscribe from the channels and close the pubsub connection.
        await pubsub.unsubscribe(
            progress_channel
        )
        await pubsub.aclose()


async def event_stream_jobStatus(job_id: UUID):
    # ----------------------------------------------------------------------------------------
    # Get progress that already exists,if already completed, send it and close the connection
    # ----------------------------------------------------------------------------------------
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    db.close()

    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        yield f"data: {job.status.value}\n\n"
        return
    #otherwise continue with the pub/sub for new logs
    pubsub = create_async_pubsub()
    
    #establish connection with pubsub channels for status updates.
    progress_status_channel = get_progress_status_channel(job_id)

    try:

        await pubsub.subscribe(progress_status_channel)

        while True:

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1,
            )

            if message is not None:

                yield (
                    f"data: {message['data']}\n\n"
                )

            if message["data"] in ["failed", "cancelled"]:                 
                break          

    finally:

        await pubsub.unsubscribe(progress_status_channel)

        await pubsub.aclose()

async def event_stream_jobLogs(job_id: UUID):
  # ----------------------------------------------------------------------------------------
    # Get progress that already exists,if already completed, send it and close the connection
    # ----------------------------------------------------------------------------------------
    db = SessionLocal()
    job = db.query(Job).filter(Job.id == job_id).first()
    db.close()

    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        yield get_job_alllogs(db, job_id)
        return

    #otherwise continue with the pub/sub for new logs
    pubsub = create_async_pubsub()

    log_channel = get_log_channel(job_id)
    status_channel = get_progress_status_channel(job_id)

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

        await pubsub.subscribe(log_channel)
        await pubsub.subscribe(status_channel)

        # -----------------------------
        # 3. Live logs
        # -----------------------------

        while True:

            message = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=1,
            )
            if message is not None and message["channel"] == status_channel and message["data"] in ["failed", "cancelled"]:
                #Stop the stream.
                break

            if message is not None:

                yield (
                    f"data: {message['data']}\n\n"
                )

    finally:

        await pubsub.unsubscribe(log_channel)
        await pubsub.unsubscribe(status_channel)
        await pubsub.aclose()

