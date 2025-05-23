from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import logging

from app.core.config import settings
from app.core.security import verify_password
from app.db.database import SessionLocal
from app.db.models import User
from app.crud import crud_user
from app.schemas.token import TokenPayload

# Khởi tạo logger cho module này
logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator:
    """
    Database dependency - yields a database session
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {str(e)}")
        logger.exception("Exception details:")
        db.rollback()
        raise
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get the current user from JWT token
    """
    auth_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.sub is None:
            logger.warning("JWT token missing 'sub' field")
            raise auth_exception
    except JWTError as e:
        logger.warning(f"JWT validation error: {str(e)}")
        raise auth_exception
    
    user = crud_user.get_user(db, user_id=token_data.sub)
    if user is None:
        logger.warning(f"User with ID {token_data.sub} not found in database")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.debug(f"Authenticated user: {user.username} (ID: {user.user_id})")
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user
    """
    if current_user.status != "active":
        logger.warning(f"User {current_user.username} (ID: {current_user.user_id}) is not active")
        raise HTTPException(status_code=400, detail="Inactive user")
    logger.debug(f"Active user verified: {current_user.username} (ID: {current_user.user_id})")
    return current_user

def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get the current admin user
    """
    if current_user.role != "admin":
        logger.warning(f"Non-admin user {current_user.username} attempted admin action")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    logger.debug(f"Admin user verified: {current_user.username} (ID: {current_user.user_id})")
    return current_user

def get_current_release_manager_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get the current user with release manager privileges (admin or release_manager)
    """
    if current_user.role not in ["admin", "release_manager"]:
        logger.warning(f"User {current_user.username} attempted release manager action without privileges")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    logger.debug(f"Release manager verified: {current_user.username} (ID: {current_user.user_id})")
    return current_user 