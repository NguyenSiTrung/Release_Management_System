from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.deps import get_db, get_current_release_manager_user
from app.crud import crud_testset
from app.schemas.testset import Testset, TestsetCreate, TestsetUpdate
from app.db.models import User

router = APIRouter()

@router.get("/", response_model=List[Testset])
def read_testsets(
    db: Session = Depends(get_db),
    lang_pair_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve testsets with optional filtering and pagination.
    """
    testsets = crud_testset.get_testsets(
        db,
        lang_pair_id=lang_pair_id,
        skip=skip,
        limit=limit
    )
    return testsets

@router.post("/", response_model=Testset)
def create_testset(
    *,
    db: Session = Depends(get_db),
    testset_in: TestsetCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new testset. Only release manager or admin can create.
    """
    try:
        testset = crud_testset.create_testset(db, testset_in)
        return testset
    except IntegrityError as e:
        error_msg = str(e)
        if "UNIQUE constraint failed: testsets.testset_name" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A testset with this name already exists. Testset names must be unique across all language pairs."
            )
        elif "FOREIGN KEY constraint failed" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The specified language pair does not exist."
            )
        else:
            # Re-raise any other integrity errors
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {error_msg}"
            )

@router.put("/{testset_id}", response_model=Testset)
def update_testset(
    *,
    db: Session = Depends(get_db),
    testset_id: int,
    testset_in: TestsetUpdate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a testset. Only release manager or admin can update.
    """
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    testset = crud_testset.update_testset(
        db, testset_id=testset_id, testset=testset_in
    )
    return testset

@router.delete("/{testset_id}", response_model=bool)
def delete_testset(
    *,
    db: Session = Depends(get_db),
    testset_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a testset. Only release manager or admin can delete.
    """
    testset = crud_testset.get_testset(db, testset_id=testset_id)
    if not testset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    return crud_testset.delete_testset(db, testset_id=testset_id) 