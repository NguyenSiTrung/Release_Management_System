from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_release_manager_user
from app.crud import crud_release_note
from app.schemas.release_note import ReleaseNote, ReleaseNoteCreate, ReleaseNoteUpdate
from app.db.models import User

router = APIRouter()

@router.get("/{version_id}", response_model=ReleaseNote)
def read_release_note(
    *,
    db: Session = Depends(get_db),
    version_id: int
) -> Any:
    """
    Get release note for a specific model version.
    """
    release_note = crud_release_note.get_release_note(db, version_id=version_id)
    if not release_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release note not found"
        )
    return release_note

@router.post("/{version_id}", response_model=ReleaseNote)
def create_release_note(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    release_note_in: ReleaseNoteCreate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Create new release note. Only release manager or admin can create.
    """
    if release_note_in.version_id != version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Version ID in path does not match version ID in request body"
        )
    release_note = crud_release_note.create_release_note(db, release_note_in)
    return release_note

@router.put("/{version_id}", response_model=ReleaseNote)
def update_release_note(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    release_note_in: ReleaseNoteUpdate,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Update a release note. Only release manager or admin can update.
    """
    release_note = crud_release_note.get_release_note(db, version_id=version_id)
    if not release_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release note not found"
        )
    release_note = crud_release_note.update_release_note(
        db, version_id=version_id, release_note=release_note_in
    )
    return release_note

@router.delete("/{version_id}", response_model=bool)
def delete_release_note(
    *,
    db: Session = Depends(get_db),
    version_id: int,
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Delete a release note. Only release manager or admin can delete.
    """
    release_note = crud_release_note.get_release_note(db, version_id=version_id)
    if not release_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Release note not found"
        )
    return crud_release_note.delete_release_note(db, version_id=version_id) 