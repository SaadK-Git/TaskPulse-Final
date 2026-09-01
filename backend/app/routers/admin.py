from fastapi import APIRouter, Depends, Request
from app.dependencies import require_role
from app.config import settings, limiter
from app.enums import UserRole
from app.database import get_db
from sqlalchemy.orm import Session
from app.services.admin_service import activate_User, deactivate_User, get_AllUsers, get_allProjects
router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/allUsers")
@limiter.limit(settings.RATE_LIMIT)
def get_all_users(
    request : Request,
    current_user = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    state: bool = True
):
    return get_AllUsers(db, page, page_size, state)

@router.get("/allProjects")
@limiter.limit(settings.RATE_LIMIT)
def get_all_projects(
    request : Request,
    current_user = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db),
    page: int = 1,
    page_size: int = 10,
    jobtype: str = "",
    state: bool = True
):
    return get_allProjects(db, page, page_size, jobtype, state)

@router.put("/users/{user_id}/deactivate")
@limiter.limit(settings.RATE_LIMIT)
def deactivate_user(
    request : Request,
    user_id: int,
    current_user = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    return deactivate_User(db, user_id)

@router.put("/users/{user_id}/activate")
@limiter.limit(settings.RATE_LIMIT) 
def activate_user(
    request : Request,
    user_id: int,
    current_user = require_role(UserRole.ADMIN),
    db: Session = Depends(get_db)
):
    return activate_User(db, user_id)