from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from pydantic import ConfigDict

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
    model_config = ConfigDict(from_attributes=True)  # lets pydantic read straight off the ORM object

    id: int
    job_id: UUID          # was `int` — the column is actually UUID
    message: str
    level: str
    timestamp: datetime   # was `created_at` — that field doesn't exist on JobLog, the real column is `timestamp`

#Web socket progress update
class JobProgress(BaseModel):

    job_id: int

    progress: int

    stage: str