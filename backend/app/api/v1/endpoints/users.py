from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_admin_user, get_current_user
from app.crud import crud_user
from app.schemas.user import User, UserCreate, UserUpdate, PendingUserApproval
from app.db.models import User as UserModel

router = APIRouter()

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Retrieve users. Only admin can access this endpoint.
    """
    users = crud_user.get_users(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(get_db),
    user_in: UserCreate,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Create new user. Only admin can create new users.
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
    return user

@router.get("/me", response_model=User)
def read_user_me(
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Get current user.
    """
    return current_user

@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(get_db),
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_user)
) -> Any:
    """
    Update own user.
    """
    if user_in.email and user_in.email != current_user.email:
        user = crud_user.get_user_by_email(db, email=user_in.email)
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this email already exists in the system."
            )
    if user_in.username and user_in.username != current_user.username:
        user = crud_user.get_user_by_username(db, username=user_in.username)
        if user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this username already exists in the system."
            )
    user = crud_user.update_user(db, user_id=current_user.user_id, user=user_in)
    return user

@router.get("/pending", response_model=List[User])
def get_pending_users(
    db: Session = Depends(get_db),
    skip: int = 0, 
    limit: int = 100,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Get users with pending approval status. Only admins can access this endpoint.
    """
    users = crud_user.get_pending_users(db, skip=skip, limit=limit)
    return users

@router.post("/approve/{user_id}", response_model=User)
def approve_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    approval: PendingUserApproval,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Approve or reject a pending user. Only admins can approve users.
    """
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    if user.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not in pending status"
        )
        
    is_approved = approval.status == "approved"
    updated_user = crud_user.approve_user(db, user_id=user_id, approve=is_approved)
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update user status"
        )
        
    return updated_user

@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    current_user: UserModel = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get a specific user by id. Only admin can access this endpoint.
    """
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Update a user. Only admin can update users.
    """
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    if user_in.email and user_in.email != user.email:
        existing_user = crud_user.get_user_by_email(db, email=user_in.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this email already exists in the system."
            )
    if user_in.username and user_in.username != user.username:
        existing_user = crud_user.get_user_by_username(db, username=user_in.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The user with this username already exists in the system."
            )
    user = crud_user.update_user(db, user_id=user_id, user=user_in)
    return user

@router.delete("/{user_id}", response_model=bool)
def delete_user(
    *,
    db: Session = Depends(get_db),
    user_id: int,
    current_user: UserModel = Depends(get_current_admin_user)
) -> Any:
    """
    Delete a user. Only admin can delete users.
    """
    user = crud_user.get_user(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return crud_user.delete_user(db, user_id=user_id) 