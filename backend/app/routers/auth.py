from fastapi import APIRouter, Depends, HTTPException, status,Request, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth_schema import UserCreate, Userlogin
import app.services.auth_service as auth_service
from app.config import limiter, settings

router = APIRouter(prefix="/auth")

@router.post("/register")
@limiter.limit(settings.RATE_LIMIT)
def register_user(
    request: Request,
    user_create: UserCreate,
    db: Session = Depends(get_db)
):
    user = auth_service.register_user(
        user_create,
        db
    )

    return {
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at
        }
    }

@router.post("/login")
@limiter.limit(settings.RATE_LIMIT) 
def login_user(
    response : Response,
    request: Request,
    user_login: Userlogin,
    db: Session = Depends(get_db)
):
    token = auth_service.login_user(
        user_login,
        db
    )
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    return {
        "message": "Login successful"
    }

@router.get("/me")
@limiter.limit(settings.RATE_LIMIT)
def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "created_at": current_user.created_at
    }

@router.get("/logout")
@limiter.limit(settings.RATE_LIMIT)
def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    response.delete_cookie(
        key="access_token"
    )

    return {
        "message": "Logout successful"
    }