from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
import os
import shutil
from fastapi import UploadFile
from app.db.models import Testset, EvaluationJob, TrainingResult
from app.schemas.testset import TestsetCreate, TestsetUpdate
from app.core.config import settings


def count_testsets(
    db: Session, lang_pair_id: Optional[int] = None
) -> int:
    """
    Count all testsets with optional filtering by language pair ID.
    """
    query = db.query(Testset)
    if lang_pair_id:
        query = query.filter(Testset.lang_pair_id == lang_pair_id)
    return query.count()


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
    Get testset by ID.
    """
    return db.query(Testset).filter(Testset.testset_id == testset_id).first()


def create_testset(db: Session, testset_in: TestsetCreate) -> Testset:
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


def update_testset(db: Session, testset_id: int, testset: Dict[str, Any] | TestsetUpdate) -> Testset:
    """
    Update a testset.
    """
    db_testset = get_testset(db, testset_id)
    if not db_testset:
        return None

    # If it's a Pydantic model, convert to dict
    update_data = {}
    if hasattr(testset, "dict"):
        # Convert Pydantic model to dict
        update_data = testset.dict(exclude_unset=True)
    else:
        # Already a dict
        update_data = testset

    for key, value in update_data.items():
        setattr(db_testset, key, value)

    db.add(db_testset)
    db.commit()
    db.refresh(db_testset)
    return db_testset


def delete_testset(db: Session, testset_id: int) -> bool:
    """
    Delete a testset.
    """
    db_testset = get_testset(db, testset_id)
    if not db_testset:
        return False
    
    # Delete associated files if they exist
    if db_testset.source_file_path_on_server and os.path.exists(db_testset.source_file_path_on_server):
        try:
            os.remove(db_testset.source_file_path_on_server)
        except Exception as e:
            print(f"Error removing source file: {str(e)}")
            
    if db_testset.target_file_path_on_server and os.path.exists(db_testset.target_file_path_on_server):
        try:
            os.remove(db_testset.target_file_path_on_server)
        except Exception as e:
            print(f"Error removing target file: {str(e)}")
    
    # Try to remove the testset directory
    testset_dir = os.path.join(str(settings.testsets_storage_path), str(testset_id))
    if os.path.exists(testset_dir):
        try:
            os.rmdir(testset_dir)  # Will only succeed if directory is empty
        except OSError:
            pass  # Directory not empty, ignore

    db.delete(db_testset)
    db.commit()
    return True


def save_uploaded_file(file: UploadFile, testset_id: int, file_type: str) -> tuple:
    """
    Save an uploaded file to the appropriate directory and return the filename and path
    
    Args:
        file: The uploaded file
        testset_id: The testset ID to create the directory for
        file_type: Either 'source' or 'target'
    
    Returns:
        tuple: (original_filename, server_path)
    """
    # Use the new testsets storage path
    testsets_dir = str(settings.testsets_storage_path)
    os.makedirs(testsets_dir, exist_ok=True)
    
    # Create testset directory if it doesn't exist
    testset_dir = os.path.join(testsets_dir, str(testset_id))
    os.makedirs(testset_dir, exist_ok=True)
    
    # Get original filename
    original_filename = file.filename
    
    # Create server path
    server_path = os.path.join(testset_dir, original_filename)
    
    # Save file
    with open(server_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return original_filename, server_path 