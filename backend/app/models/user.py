from sqlalchemy import Column, Enum, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base
from app.enums import UserRole

class User(Base):

    __tablename__ = "users"


    # =====================================================
    # Primary Key
    # =====================================================

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )


    # =====================================================
    # User Information
    # =====================================================

    name = Column(
        String(150),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )


    # =====================================================
    # Authorization
    # =====================================================

    role = Column(
        Enum(
            UserRole,
            name="user_roles",
        ),
        default=UserRole.MEMBER,
        nullable=False,
    )


    # =====================================================
    # Account Status
    # =====================================================

    is_active = Column(
        Boolean,
        default=True,
        nullable=False,
    )


    # =====================================================
    # Timestamp
    # =====================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )


    # =====================================================
    # Relationships
    # =====================================================

    jobs = relationship(
        "Job",
        back_populates="user",
        cascade="all, delete-orphan",
    )