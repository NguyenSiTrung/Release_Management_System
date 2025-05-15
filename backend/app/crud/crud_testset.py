from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.models import Testset
from app.schemas.testset import TestsetCreate, TestsetUpdate


def get_testsets(
    db: Session, lang_pair_id: Optional[int] = None, skip: int = 0, limit: int = 100
) -> List[Testset]:
    """
    Get all testsets with optional filtering by language pair ID.
    """
    query = db.query(Testset)
    if lang_pair_id:
        query = query.filter(Testset.lang_pair_id == lang_pair_id)
    return query.offset(skip).limit(limit).all()


def get_testset(db: Session, testset_id: int) -> Optional[Testset]:
    """
    Get a specific testset by its ID.
    """
    return db.query(Testset).filter(Testset.testset_id == testset_id).first()


def create_testset(
    db: Session, testset_in: TestsetCreate
) -> Testset:
    """
    Create a new testset.
    """
    db_testset = Testset(
        lang_pair_id=testset_in.lang_pair_id,
        testset_name=testset_in.testset_name,
        description=testset_in.description,
        source_file_path=testset_in.source_file_path,
        target_file_path=testset_in.target_file_path
    )
    db.add(db_testset)
    db.commit()
    db.refresh(db_testset)
    return db_testset


def update_testset(
    db: Session, testset_id: int, testset: TestsetUpdate
) -> Testset:
    """
    Update a testset.
    """
    db_testset = get_testset(db, testset_id)
    if db_testset:
        update_data = testset.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_testset, field, value)
        db.commit()
        db.refresh(db_testset)
    return db_testset


def delete_testset(db: Session, testset_id: int) -> bool:
    """
    Delete a testset.
    """
    db_testset = get_testset(db, testset_id)
    if db_testset:
        db.delete(db_testset)
        db.commit()
        return True
    return False 