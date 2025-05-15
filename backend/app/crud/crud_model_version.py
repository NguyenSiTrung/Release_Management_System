from typing import Optional, List
from sqlalchemy.orm import Session
from app.db.models import ModelVersion
from app.schemas.model_version import ModelVersionCreate, ModelVersionUpdate

def get_model_version(db: Session, version_id: int) -> Optional[ModelVersion]:
    return db.query(ModelVersion).filter(ModelVersion.version_id == version_id).first()

def get_model_versions(
    db: Session,
    lang_pair_id: int,
    skip: int = 0,
    limit: int = 100,
    sort_by: str = "release_date",
    sort_desc: bool = True
) -> List[ModelVersion]:
    query = db.query(ModelVersion).filter(ModelVersion.lang_pair_id == lang_pair_id)
    
    if sort_by == "release_date":
        if sort_desc:
            query = query.order_by(ModelVersion.release_date.desc())
        else:
            query = query.order_by(ModelVersion.release_date.asc())
    elif sort_by == "version_name":
        if sort_desc:
            query = query.order_by(ModelVersion.version_name.desc())
        else:
            query = query.order_by(ModelVersion.version_name.asc())
    
    return query.offset(skip).limit(limit).all()

def create_model_version(db: Session, model_version: ModelVersionCreate) -> ModelVersion:
    db_model_version = ModelVersion(**model_version.model_dump())
    db.add(db_model_version)
    db.commit()
    db.refresh(db_model_version)
    return db_model_version

def update_model_version(
    db: Session,
    version_id: int,
    model_version: ModelVersionUpdate
) -> Optional[ModelVersion]:
    db_model_version = get_model_version(db, version_id)
    if not db_model_version:
        return None
    
    update_data = model_version.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_model_version, field, value)
    
    db.commit()
    db.refresh(db_model_version)
    return db_model_version

def delete_model_version(db: Session, version_id: int) -> bool:
    db_model_version = get_model_version(db, version_id)
    if not db_model_version:
        return False
    
    db.delete(db_model_version)
    db.commit()
    return True 