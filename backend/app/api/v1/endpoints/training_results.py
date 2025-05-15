from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_release_manager_user
from app.crud import crud_training_result
from app.schemas.training_result import TrainingResult, TrainingResultCreate, TrainingResultUpdate
from app.db.models import User

router = APIRouter()

@router.get("/", response_model=List[TrainingResult])
def read_training_results(
    *,
    db: Session = Depends(get_db),
    version_id: Optional[int] = None,  # Optional to handle both router inclusions
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve training results for a specific model version.
    """
    if not version_id:
        # No version_id provided, return empty list or handle as needed
        return []
    
    training_results = crud_training_result.get_training_results_by_version(
        db,
        version_id=version_id,
        skip=skip,
        limit=limit
    )
    return training_results

@router.get("/{version_id}", response_model=List[TrainingResult])
def read_training_results_by_id(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    skip: int = 0,
    limit: int = 100
) -> Any:
    """
    Retrieve training results for a specific model version.
    """
    training_results = crud_training_result.get_training_results_by_version(
        db,
        version_id=version_id,
        skip=skip,
        limit=limit
    )
    return training_results

@router.post("/", response_model=TrainingResult)
def create_training_result(
    *,
    db: Session = Depends(get_db),
    version_id: Optional[int] = None,  # Optional to handle both router inclusions
    training_result_in: TrainingResultCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new training result. Only release manager or admin can create.
    """
    # Version ID from path takes precedence, otherwise use the one from the request body
    version_id_to_use = version_id if version_id else training_result_in.version_id
    
    # Update the version_id in the input model
    training_result_in_dict = training_result_in.dict()
    training_result_in_dict["version_id"] = version_id_to_use
    updated_training_result_in = TrainingResultCreate(**training_result_in_dict)
    
    training_result = crud_training_result.create_training_result(db, updated_training_result_in)
    return training_result

@router.post("/{version_id}", response_model=TrainingResult)
def create_training_result_by_id(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    training_result_in: TrainingResultCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new training result. Only release manager or admin can create.
    """
    if training_result_in.version_id != version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Version ID in path does not match version ID in request body"
        )
    training_result = crud_training_result.create_training_result(db, training_result_in)
    return training_result

@router.put("/{result_id}", response_model=TrainingResult)
def update_training_result(
    *,
    db: Session = Depends(get_db),
    result_id: int,
    training_result_in: TrainingResultUpdate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a training result. Only release manager or admin can update.
    """
    training_result = crud_training_result.get_training_result(db, result_id=result_id)
    if not training_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training result not found"
        )
    training_result = crud_training_result.update_training_result(
        db, result_id=result_id, training_result=training_result_in
    )
    return training_result

@router.delete("/{result_id}", response_model=bool)
def delete_training_result(
    *,
    db: Session = Depends(get_db),
    result_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a training result. Only release manager or admin can delete.
    """
    training_result = crud_training_result.get_training_result(db, result_id=result_id)
    if not training_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training result not found"
        )
    return crud_training_result.delete_training_result(db, result_id=result_id) 