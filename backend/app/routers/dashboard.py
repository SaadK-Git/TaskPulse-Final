from app.schemas.dashboard_schema import AdmindashboardSchema,MemberDashboardSchema
from fastapi import APIRouter, Depends, Request
from app.dependencies import require_role
from app.config import settings,limiter
from app.enums import UserRole
from app.models import Job,User
from app.services.dashboard_service import get_Admin_dashboard_stats, get_Member_dashboard_stats
from app.database import get_db
from sqlalchemy.orm import Session
router = APIRouter(prefix = "/dashboard")

@router.get("/adminStats")
@limiter.limit(settings.RATE_LIMIT)
def getAdminDashboardStats(
    request : Request,
    current_user = require_role(UserRole.ADMIN),
    db : Session = Depends(get_db),
    response_model = AdmindashboardSchema
):
    return get_Admin_dashboard_stats(db, current_user.id)

@router.get("/memberStats")
@limiter.limit(settings.RATE_LIMIT)
def getMemberDashboardStats(
    request : Request,
    current_user = require_role(UserRole.MEMBER),
    db : Session = Depends(get_db),
    response_model = MemberDashboardSchema
):
    return get_Member_dashboard_stats(db, current_user.id)
