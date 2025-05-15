from datetime import timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.core.security import create_access_token
from app.crud import crud_user
from app.schemas.token import Token
from app.schemas.user import UserCreate, User

router = APIRouter()

@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = crud_user.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        # Check if the user exists but is not active
        potential_user = crud_user.get_user_by_username(db, username=form_data.username)
        if potential_user:
            if potential_user.status == "pending":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Your account is pending approval. Please wait for administrator approval.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            elif potential_user.status == "rejected":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Your account has been rejected. Please contact an administrator.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            data={"sub": str(user.user_id), "role": user.role}, 
            expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/register", response_model=User)
def register_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate
) -> Any:
    """
    Register new user.
    """
    user = crud_user.get_user_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this email already exists in the system."
        )
    user = crud_user.get_user_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The user with this username already exists in the system."
        )
    user = crud_user.create_user(db, user_in)
    
    # Return a message to user based on account status
    if user.status == "pending":
        # Convert SQLAlchemy model to dict for JSON response
        user_data: Dict[str, Any] = {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "created_at": user.created_at,
            "updated_at": user.updated_at
        }
        
        # Add a header to indicate pending status
        headers = {"X-Account-Status": "pending"}
        return JSONResponse(
            content=user_data,
            headers=headers,
            status_code=status.HTTP_201_CREATED
        )
    
    return user

@router.post("/refresh", response_model=Token)
def refresh_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Refresh access token.
    """
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": create_access_token(
            data={"sub": str(current_user.user_id)}, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    } 