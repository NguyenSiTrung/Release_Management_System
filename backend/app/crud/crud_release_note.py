from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import ReleaseNote
from app.schemas.release_note import ReleaseNoteCreate, ReleaseNoteUpdate


def get_release_note(db: Session, version_id: int) -> Optional[ReleaseNote]:
    """
    Get a release note for a specific model version.
    """
    return db.query(ReleaseNote).filter(ReleaseNote.version_id == version_id).first()


# Add alias for backward compatibility
get_by_version = get_release_note


def create_release_note(
    db: Session, release_note_in: ReleaseNoteCreate
) -> ReleaseNote:
    """
    Create a new release note.
    """
    db_release_note = ReleaseNote(
        version_id=release_note_in.version_id,
        title=release_note_in.title,
        content=release_note_in.content,
        author_id=release_note_in.author_id
    )
    db.add(db_release_note)
    db.commit()
    db.refresh(db_release_note)
    return db_release_note


def update_release_note(
    db: Session, version_id: int, release_note: ReleaseNoteUpdate
) -> ReleaseNote:
    """
    Update a release note.
    """
    db_release_note = get_release_note(db, version_id)
    if db_release_note:
        update_data = release_note.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_release_note, field, value)
        db.commit()
        db.refresh(db_release_note)
    return db_release_note


def delete_release_note(db: Session, version_id: int) -> bool:
    """
    Delete a release note.
    """
    db_release_note = get_release_note(db, version_id)
    if db_release_note:
        db.delete(db_release_note)
        db.commit()
        return True
    return False 