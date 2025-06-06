from typing import Optional, List
import os
import shutil
from fastapi import UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.models import ModelVersion
from app.schemas.model_version import ModelVersionCreate, ModelVersionUpdate
from app.core.config import settings

def count_model_versions(
    db: Session, *, lang_pair_id: Optional[int] = None
) -> int:
    """
    Count all model versions with optional filtering by language pair ID.
    """
    query = db.query(ModelVersion)
    if lang_pair_id:
        query = query.filter(ModelVersion.lang_pair_id == lang_pair_id)
    return query.count()

def get_multi(
    db: Session, *, skip: int = 0, limit: int = 100, lang_pair_id: Optional[int] = None
) -> List[ModelVersion]:
    query = db.query(ModelVersion)
    if lang_pair_id:
        query = query.filter(ModelVersion.lang_pair_id == lang_pair_id)
    query = query.order_by(desc(ModelVersion.release_date))
    return query.offset(skip).limit(limit).all()

def get(db: Session, version_id: int) -> Optional[ModelVersion]:
    return db.query(ModelVersion).filter(ModelVersion.version_id == version_id).first()

def save_uploaded_file(file: UploadFile, version_id: int, file_type: str) -> tuple:
    """
    Save an uploaded file to the appropriate directory and return the filename and path
    
    Args:
        file: The uploaded file
        version_id: The version ID to create the directory for
        file_type: Either 'model' or 'hparams'
    
    Returns:
        tuple: (original_filename, server_path)
    """
    # Create version directory if it doesn't exist
    version_dir = os.path.join(settings.MODEL_FILES_STORAGE_PATH, str(version_id))
    os.makedirs(version_dir, exist_ok=True)
    
    # Get original filename
    original_filename = file.filename
    
    # Create server path
    server_path = os.path.join(version_dir, original_filename)
    
    # Save file
    with open(server_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return original_filename, server_path

def create(
    db: Session, 
    *, 
    obj_in: ModelVersionCreate, 
    model_file: Optional[UploadFile] = None,
    hparams_file: Optional[UploadFile] = None,
    base_model_file: Optional[UploadFile] = None,
    base_hparams_file: Optional[UploadFile] = None
) -> ModelVersion:
    db_obj = ModelVersion(
        lang_pair_id=obj_in.lang_pair_id,
        version_name=obj_in.version_name,
        release_date=obj_in.release_date,
        description=obj_in.description
    )
    
    # Create the record first to get the version_id
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Process uploaded finetuned model files if provided
    if model_file:
        model_filename, model_path = save_uploaded_file(model_file, db_obj.version_id, 'model')
        db_obj.model_file_name = model_filename
        db_obj.model_file_path_on_server = model_path
    
    if hparams_file:
        hparams_filename, hparams_path = save_uploaded_file(hparams_file, db_obj.version_id, 'hparams')
        db_obj.hparams_file_name = hparams_filename
        db_obj.hparams_file_path_on_server = hparams_path
    
    # Process uploaded base model files if provided
    if base_model_file:
        base_model_filename, base_model_path = save_uploaded_file(base_model_file, db_obj.version_id, 'base_model')
        db_obj.base_model_file_name = base_model_filename
        db_obj.base_model_file_path_on_server = base_model_path
    
    if base_hparams_file:
        base_hparams_filename, base_hparams_path = save_uploaded_file(base_hparams_file, db_obj.version_id, 'base_hparams')
        db_obj.base_hparams_file_name = base_hparams_filename
        db_obj.base_hparams_file_path_on_server = base_hparams_path
    
    # Update the record with file information
    if model_file or hparams_file or base_model_file or base_hparams_file:
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    
    return db_obj

def update(
    db: Session,
    *, 
    db_obj: ModelVersion, 
    obj_in: ModelVersionUpdate,
    model_file: Optional[UploadFile] = None,
    hparams_file: Optional[UploadFile] = None,
    base_model_file: Optional[UploadFile] = None,
    base_hparams_file: Optional[UploadFile] = None
) -> ModelVersion:
    # Update fields from obj_in
    if obj_in.version_name is not None:
        db_obj.version_name = obj_in.version_name
    if obj_in.release_date is not None:
        db_obj.release_date = obj_in.release_date
    if obj_in.description is not None:
        db_obj.description = obj_in.description
    if obj_in.lang_pair_id is not None:
        db_obj.lang_pair_id = obj_in.lang_pair_id
    
    # Process uploaded finetuned model files if provided
    if model_file:
        # Remove old file if exists
        if db_obj.model_file_path_on_server and os.path.exists(db_obj.model_file_path_on_server):
            os.remove(db_obj.model_file_path_on_server)
        
        model_filename, model_path = save_uploaded_file(model_file, db_obj.version_id, 'model')
        db_obj.model_file_name = model_filename
        db_obj.model_file_path_on_server = model_path
    
    if hparams_file:
        # Remove old file if exists
        if db_obj.hparams_file_path_on_server and os.path.exists(db_obj.hparams_file_path_on_server):
            os.remove(db_obj.hparams_file_path_on_server)
        
        hparams_filename, hparams_path = save_uploaded_file(hparams_file, db_obj.version_id, 'hparams')
        db_obj.hparams_file_name = hparams_filename
        db_obj.hparams_file_path_on_server = hparams_path

    # Process uploaded base model files if provided
    if base_model_file:
        # Remove old file if exists
        if db_obj.base_model_file_path_on_server and os.path.exists(db_obj.base_model_file_path_on_server):
            os.remove(db_obj.base_model_file_path_on_server)
        
        base_model_filename, base_model_path = save_uploaded_file(base_model_file, db_obj.version_id, 'base_model')
        db_obj.base_model_file_name = base_model_filename
        db_obj.base_model_file_path_on_server = base_model_path
    
    if base_hparams_file:
        # Remove old file if exists
        if db_obj.base_hparams_file_path_on_server and os.path.exists(db_obj.base_hparams_file_path_on_server):
            os.remove(db_obj.base_hparams_file_path_on_server)
        
        base_hparams_filename, base_hparams_path = save_uploaded_file(base_hparams_file, db_obj.version_id, 'base_hparams')
        db_obj.base_hparams_file_name = base_hparams_filename
        db_obj.base_hparams_file_path_on_server = base_hparams_path
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def remove(db: Session, *, version_id: int) -> ModelVersion:
    obj = db.query(ModelVersion).get(version_id)
    if obj:
        # Delete finetuned model files if they exist
        if obj.model_file_path_on_server and os.path.exists(obj.model_file_path_on_server):
            os.remove(obj.model_file_path_on_server)
        if obj.hparams_file_path_on_server and os.path.exists(obj.hparams_file_path_on_server):
            os.remove(obj.hparams_file_path_on_server)
        
        # Delete base model files if they exist
        if obj.base_model_file_path_on_server and os.path.exists(obj.base_model_file_path_on_server):
            os.remove(obj.base_model_file_path_on_server)
        if obj.base_hparams_file_path_on_server and os.path.exists(obj.base_hparams_file_path_on_server):
            os.remove(obj.base_hparams_file_path_on_server)
        
        # Try to remove the version directory
        version_dir = os.path.join(settings.MODEL_FILES_STORAGE_PATH, str(version_id))
        if os.path.exists(version_dir):
            try:
                os.rmdir(version_dir)  # Will only succeed if directory is empty
            except OSError:
                pass  # Directory not empty, ignore
        
        db.delete(obj)
        db.commit()
    return obj 