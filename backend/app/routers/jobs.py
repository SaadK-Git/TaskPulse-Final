# app/routers/jobs.py

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import redis_client
from app.database import get_db
from app.dependencies import get_current_user,require_role
from app.models.job import Job
from app.schemas.job_schema import JobCreate, JobResponse,JobLogRead
from app.services.job_service import create_job, get_all_jobs, get_job_alllogs, cancel_job,handle_job_progress,event_stream_jobLogs,event_stream_jobStatus
from app.enums import UserRole
from uuid import UUID
from app.enums import UserRole

from fastapi import APIRouter, WebSocket

from app.config import settings, limiter

router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)
###For user..

#------------------------------
@router.get(
       "/getjobs/{page}",
        response_model=list[JobResponse], 
)
@limiter.limit(settings.RATE_LIMIT)
def get_jobs(
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MEMBER)),
    page: int = 1,
    page_size: int = 10
):
    return get_all_jobs(db, current_user.id, page, page_size)
#---------------------------------
@router.post(
    "/createJob"
)
@limiter.limit(settings.RATE_LIMIT)
def create_new_job(
    request: Request,
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MEMBER))
):

    try:

        job, celery_result = create_job(
            db=db,
            user_id=current_user.id,
            job_type=payload.job_type
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


    return {
        "id": job.id,
        "job_type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "task_id": celery_result,
    }

@router.get(
    "/jobLogs/{job_id}",
    response_model=list[JobLogRead],
)
@limiter.limit(settings.RATE_LIMIT)
def get_job_logs(
    request: Request,
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MEMBER)),
):
    return get_job_alllogs(db, job_id)

@router.post("/canceljobs/{job_id}")
@limiter.limit(settings.RATE_LIMIT)
def cancelJob(
    request: Request,
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(UserRole.MEMBER))
    ):

    return cancel_job(db, job_id)
    
@router.websocket("/ws/progress/{job_id}")
async def job_progress_websocket(
    websocket: WebSocket,
    job_id: UUID
):
    print("🔥🔥🔥 ROUTE ENTERED 🔥🔥🔥")
    await websocket.accept()
    print("🔥🔥🔥 ACCEPTED 🔥🔥🔥")
    await handle_job_progress(
        websocket,
        job_id,
    )

@router.get("/logs/sse/{job_id}")
async def job_logs_sse(job_id: UUID):

    return StreamingResponse(
        event_stream_jobLogs(job_id),
        media_type="text/event-stream",
    )

@router.get("/jobstatus/sse/{job_id}")
async def job_status_sse(job_id: UUID):

    return StreamingResponse(
        event_stream_jobStatus(job_id),
        media_type="text/event-stream",
    )