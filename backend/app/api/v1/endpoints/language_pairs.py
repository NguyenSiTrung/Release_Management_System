from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_release_manager_user
from app.crud import crud_language_pair
from app.schemas.language_pair import LanguagePair, LanguagePairCreate, LanguagePairUpdate
from app.db.models import User

router = APIRouter()

@router.get("/", response_model=List[LanguagePair])
def read_language_pairs(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    source_code: Optional[str] = None,
    target_code: Optional[str] = None
) -> Any:
    """
    Retrieve language pairs with optional filtering and pagination.
    """
    lang_pairs = crud_language_pair.get_language_pairs(
        db,
        skip=skip,
        limit=limit,
        source_code=source_code,
        target_code=target_code
    )
    return lang_pairs

@router.get("/{lang_pair_id}", response_model=LanguagePair)
def read_language_pair(
    *,
    db: Session = Depends(get_db),
    lang_pair_id: int
) -> Any:
    """
    Get a specific language pair by id.
    """
    lang_pair = crud_language_pair.get_language_pair(db, lang_pair_id=lang_pair_id)
    if not lang_pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Language pair not found"
        )
    return lang_pair

@router.post("/", response_model=LanguagePair)
def create_language_pair(
    *,
    db: Session = Depends(get_db),
    lang_pair_in: LanguagePairCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new language pair. Only release manager or admin can create.
    """
    lang_pair = crud_language_pair.create_language_pair(db, lang_pair_in)
    return lang_pair

@router.put("/{lang_pair_id}", response_model=LanguagePair)
def update_language_pair(
    *,
    db: Session = Depends(get_db),
    lang_pair_id: int,
    lang_pair_in: LanguagePairUpdate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a language pair. Only release manager or admin can update.
    """
    lang_pair = crud_language_pair.get_language_pair(db, lang_pair_id=lang_pair_id)
    if not lang_pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Language pair not found"
        )
    lang_pair = crud_language_pair.update_language_pair(
        db, lang_pair_id=lang_pair_id, lang_pair=lang_pair_in
    )
    return lang_pair

@router.delete("/{lang_pair_id}", response_model=bool)
def delete_language_pair(
    *,
    db: Session = Depends(get_db),
    lang_pair_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a language pair. Only release manager or admin can delete.
    """
    lang_pair = crud_language_pair.get_language_pair(db, lang_pair_id=lang_pair_id)
    if not lang_pair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Language pair not found"
        )
    return crud_language_pair.delete_language_pair(db, lang_pair_id=lang_pair_id) 