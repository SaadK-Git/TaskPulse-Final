from fastapi import (
    Depends,
    HTTPException,
    Request,
    status
)

from jose import (
    JWTError,
    ExpiredSignatureError,
    jwt
)

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.config import settings
from app.enums import UserRole

def get_current_user(
    request: Request,
    requiredRole : UserRole = UserRole.MEMBER,
    db: Session = Depends(get_db)
    
) -> User:

    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    try:

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )

        user_id = payload.get("sub")
        role = payload.get("role") 

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user

def require_role(role: UserRole):
    print("CREATING DEPENDENCY:", role)

    def dependency(
        current_user: User = Depends(get_current_user),
    ):
        print("------------------------")
        print("dependency id:", id(dependency))
        print("required:", role)
        print("current :", current_user.role)
        print("------------------------")

        if current_user.role != role:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions",
            )

        return current_user

    return dependency