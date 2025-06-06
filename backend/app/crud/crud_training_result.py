from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.db.models import TrainingResult
from app.schemas.training_result import TrainingResultCreate, TrainingResultUpdate


def get_training_results_by_version(
    db: Session, version_id: int, skip: int = 0, limit: int = 100
) -> List[TrainingResult]:
    """
    Get all training results for a specific model version.
    """
    return db.query(TrainingResult).filter(
        TrainingResult.version_id == version_id
    ).offset(skip).limit(limit).all()


# Alias for get_training_results_by_version to maintain API compatibility
def get_multi_by_version(
    db: Session, version_id: int, skip: int = 0, limit: int = 100
) -> List[TrainingResult]:
    """
    Alias for get_training_results_by_version.
    """
    return get_training_results_by_version(db, version_id, skip, limit)


def get_training_result(db: Session, result_id: int) -> Optional[TrainingResult]:
    """
    Get a specific training result by its ID.
    """
    return db.query(TrainingResult).filter(
        TrainingResult.result_id == result_id
    ).first()


def get_by_version_and_testset(db: Session, version_id: int, testset_id: int) -> Optional[TrainingResult]:
    """
    Get a training result by version_id and testset_id.
    """
    return db.query(TrainingResult).filter(
        TrainingResult.version_id == version_id,
        TrainingResult.testset_id == testset_id
    ).first()


def create(
    db: Session, obj_in: TrainingResultCreate
) -> TrainingResult:
    """
    Create a new training result.
    """
    db_training_result = TrainingResult(
        version_id=obj_in.version_id,
        testset_id=obj_in.testset_id,
        base_model_bleu=obj_in.base_model_bleu,
        base_model_comet=obj_in.base_model_comet,
        finetuned_model_bleu=obj_in.finetuned_model_bleu,
        finetuned_model_comet=obj_in.finetuned_model_comet,
        training_details_notes=obj_in.training_details_notes
    )
    db.add(db_training_result)
    db.commit()
    db.refresh(db_training_result)
    return db_training_result


def update(
    db: Session, 
    db_obj: TrainingResult, 
    obj_in: Dict[str, Any]
) -> TrainingResult:
    """
    Update a training result.
    """
    for field, value in obj_in.items():
        setattr(db_obj, field, value)
    db.commit()
    db.refresh(db_obj)
    return db_obj


# Legacy method names for backwards compatibility
def create_training_result(db: Session, training_result_in: TrainingResultCreate) -> TrainingResult:
    return create(db=db, obj_in=training_result_in)


def update_training_result(db: Session, result_id: int, training_result: TrainingResultUpdate) -> TrainingResult:
    db_obj = get_training_result(db, result_id)
    if not db_obj:
        return None
    
    if isinstance(training_result, dict):
        update_data = training_result
    else:
        update_data = training_result.dict(exclude_unset=True)
        
    return update(db=db, db_obj=db_obj, obj_in=update_data)


def delete_training_result(db: Session, result_id: int) -> bool:
    """
    Delete a training result.
    """
    db_training_result = get_training_result(db, result_id)
    if db_training_result:
        db.delete(db_training_result)
        db.commit()
        return True
    return False 