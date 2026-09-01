from datetime import datetime, timedelta, UTC
from logging import exception
from webbrowser import get
# from passlib.context import CryptContext
from jose import jwt
from app.models.user import User
from app.config import settings
from app.schemas.auth_schema import UserCreate,Userlogin
from sqlalchemy.orm import Session
from fastapi import  HTTPException, status
from app.database import get_db
import bcrypt
from app.enums import UserRole


def hash_password(password: str) -> str:
    hashed = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    )
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

def create_access_token(
    user_id: int,
    name: str,
    role: str,
):
    payload = {
        "sub": str(user_id),
        "name": name,
        "role": role,
        "exp": datetime.now(UTC)
        + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    return token



def decode_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.JWTError:
        return None
    

def register_user(user_create: UserCreate, db: Session):

    existing_user = (
        db.query(User)
        .filter(User.email == user_create.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    hashed_password = hash_password(
        user_create.password
    )

    user = User(
        name=user_create.name,
        email=user_create.email,
        password_hash=hashed_password,
        role = UserRole(user_create.role),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)

    except Exception as e:
        db.rollback()

        print(e)  # Log the exception for debugging purposes

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

    return user

def login_user(
    login_data: Userlogin,
    db: Session
) -> str:

    user = (
        db.query(User)
        .filter(User.name == login_data.name)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail= "User Does not exist",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail = "Invalid credentials"
        )

    token = create_access_token(
        user_id=user.id,
        name=user.name,
        role=user.role
    )

    return token
