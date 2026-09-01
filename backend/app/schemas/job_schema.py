from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


# =====================================================
# CREATE JOB
# =====================================================

class JobCreate(BaseModel):

    job_type: str = Field(..., max_length=100)


# =====================================================
# JOB RESPONSE
# =====================================================

class JobResponse(BaseModel):

    id: UUID

    job_type: str

    status: str

    progress: int = 0

    result: dict | None = None

    error: str | None = None

    created_at: datetime

    started_at: datetime | None = None

    completed_at: datetime | None = None


# =====================================================
# JOB LOG RESPONSE
# =====================================================

class JobLogRead(BaseModel):

    id: int

    job_id: int

    message: str

    level: str

    created_at: datetime

#Web socket progress update
class JobProgress(BaseModel):

    job_id: int

    progress: int

    stage: str