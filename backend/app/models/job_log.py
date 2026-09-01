import uuid

from sqlalchemy import (
    Column,
    Enum,
    Integer,
    String,
    ForeignKey,
    DateTime,
)
from app.enums import JobLogLevel,JobStatus,JobType

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from datetime import datetime

from app.database import Base


class JobLog(Base):

    __tablename__ = "job_logs"


    # =====================================================
    # Primary Key
    # =====================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    # =====================================================
    # Associated Job
    # =====================================================

    job_id = Column(
        UUID(as_uuid=True),
        ForeignKey(
            "jobs.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # =====================================================
    # Message
    # =====================================================

    message = Column(
        String(500),
        nullable=False,
    )


    # =====================================================
    # Log Level
    # =====================================================

    level = Column(
        Enum(
            JobLogLevel,
            name="job_log_levels",
        ),
        default=JobLogLevel.INFO,
        nullable=False,
    )


    # =====================================================
    # Timestamp
    # =====================================================

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )


    # =====================================================
    # Relationship
    # =====================================================

    job = relationship(
        "Job",
        back_populates="logs",
    )