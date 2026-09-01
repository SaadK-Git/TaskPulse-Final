import uuid

from sqlalchemy import (
    Column,
    Enum,
    Integer,
    String,
    ForeignKey,
    DateTime,
    JSON,
)

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.enums import JobStatus, JobType
from datetime import datetime

from app.database import Base


class Job(Base):

    __tablename__ = "jobs"


    # =====================================================
    # Primary Key
    # =====================================================

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )


    # =====================================================
    # Owner
    # =====================================================

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )


    # =====================================================
    # Job Type
    # =====================================================

    job_type = Column(
        Enum(JobType),
        nullable=False,
    )


    # =====================================================
    # Job Status
    # =====================================================

    status = Column(
        Enum(JobStatus),
        default=JobStatus.PENDING,
        nullable=False,
        index=True,
    )


    # =====================================================
    # Input Parameters
    # =====================================================

    parameters = Column(
        JSON,
        nullable=True,
    )

    # =====================================================
    # Result
    # =====================================================

    result = Column(
        JSON,
        nullable=True,
    )


    # =====================================================
    # Error
    # =====================================================

    error = Column(
        String(500),
        nullable=True,
    )


    # =====================================================
    # Progress
    # =====================================================

    progress = Column(
        Integer,
        default=0,
        nullable=False,
    )


    # =====================================================
    # Celery Task ID
    # =====================================================

    celery_task_id = Column(
        String(255),
        nullable=True,
        index=True,
    )


    # =====================================================
    # Execution Timestamps
    # =====================================================

    started_at = Column(
        DateTime,
        nullable=True,
    )

    completed_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )


    # =====================================================
    # Relationships
    # =====================================================

    user = relationship(
        "User",
        back_populates="jobs",
    )

    logs = relationship(
        "JobLog",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="JobLog.timestamp",
    )