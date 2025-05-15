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


def get_training_result(db: Session, result_id: int) -> Optional[TrainingResult]:
    """
    Get a specific training result by its ID.
    """
    return db.query(TrainingResult).filter(
        TrainingResult.result_id == result_id
    ).first()


def create_training_result(
    db: Session, training_result_in: TrainingResultCreate
) -> TrainingResult:
    """
    Create a new training result.
    """
    db_training_result = TrainingResult(
        version_id=training_result_in.version_id,
        testset_id=training_result_in.testset_id,
        base_model_bleu=training_result_in.base_model_bleu,
        base_model_comet=training_result_in.base_model_comet,
        finetuned_model_bleu=training_result_in.finetuned_model_bleu,
        finetuned_model_comet=training_result_in.finetuned_model_comet,
        training_details_notes=training_result_in.training_details_notes
    )
    db.add(db_training_result)
    db.commit()
    db.refresh(db_training_result)
    return db_training_result


def update_training_result(
    db: Session, result_id: int, training_result: TrainingResultUpdate
) -> TrainingResult:
    """
    Update a training result.
    """
    db_training_result = get_training_result(db, result_id)
    if db_training_result:
        update_data = training_result.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_training_result, field, value)
        db.commit()
        db.refresh(db_training_result)
    return db_training_result


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