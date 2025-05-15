from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.deps import get_db
from app.db.models import ModelVersion, TrainingResult, Testset
from app.db.database import SessionLocal

router = APIRouter()

@router.get("/comparison")
def get_comparison_data(
    db: Session = Depends(get_db),
    version_id: int = None,
    testset_id: Optional[int] = None
) -> Any:
    """
    Get comparison data for a specific model version and testset.
    """
    if not version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="version_id is required"
        )
    
    query = db.query(TrainingResult).filter(TrainingResult.version_id == version_id)
    
    # If testset_id is provided, filter by testset_id
    if testset_id:
        query = query.filter(TrainingResult.testset_id == testset_id)
    
    results = query.all()
    
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training results found for this version"
        )
    
    # If no specific testset_id, we'll return data for all testsets
    if not testset_id:
        # Transform data to average scores across all testsets
        bleu_base = 0
        bleu_finetuned = 0
        comet_base = 0
        comet_finetuned = 0
        count = 0
        
        for result in results:
            if result.base_model_bleu is not None:
                bleu_base += result.base_model_bleu
            if result.finetuned_model_bleu is not None:
                bleu_finetuned += result.finetuned_model_bleu
            if result.base_model_comet is not None:
                comet_base += result.base_model_comet
            if result.finetuned_model_comet is not None:
                comet_finetuned += result.finetuned_model_comet
            count += 1
        
        # Calculate averages
        if count > 0:
            bleu_base /= count
            bleu_finetuned /= count
            comet_base /= count
            comet_finetuned /= count
        
        # Format data for the frontend - Convert BLEU to 0-100 scale
        return [
            {
                "metric": "BLEU",
                "base_model": bleu_base if bleu_base is not None else None,
                "finetuned_model": bleu_finetuned if bleu_finetuned is not None else None
            },
            {
                "metric": "COMET",
                "base_model": comet_base,
                "finetuned_model": comet_finetuned
            }
        ]
    else:
        # Return data for the specific testset - Convert BLEU to 0-100 scale
        result = results[0]  # We're filtering by testset_id so there should be only one result
        return [
            {
                "metric": "BLEU",
                "base_model": result.base_model_bleu if result.base_model_bleu is not None else None,
                "finetuned_model": result.finetuned_model_bleu if result.finetuned_model_bleu is not None else None
            },
            {
                "metric": "COMET",
                "base_model": result.base_model_comet,
                "finetuned_model": result.finetuned_model_comet
            }
        ]

@router.get("/progress")
def get_progress_data(
    db: Session = Depends(get_db),
    lang_pair_id: int = None,
    metric: str = "bleu",
    testset_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Any:
    """
    Get progress data for a specific language pair and metric.
    """
    if not lang_pair_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lang_pair_id is required"
        )
    
    if metric not in ["bleu", "comet"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metric must be either 'bleu' or 'comet'"
        )
    
    query = (
        db.query(
            ModelVersion.version_name,
            ModelVersion.release_date,
            func.avg(
                TrainingResult.finetuned_model_bleu if metric == "bleu"
                else TrainingResult.finetuned_model_comet
            ).label("score")
        )
        .join(TrainingResult)
        .filter(ModelVersion.lang_pair_id == lang_pair_id)
    )
    
    if testset_id:
        query = query.filter(TrainingResult.testset_id == testset_id)
    
    if start_date:
        query = query.filter(ModelVersion.release_date >= start_date)
    if end_date:
        query = query.filter(ModelVersion.release_date <= end_date)
    
    results = (
        query
        .group_by(ModelVersion.version_id)
        .order_by(ModelVersion.release_date)
        .all()
    )
    
    # Format data for the frontend - Convert BLEU to 0-100 scale if needed
    return [
        {
            "version_name": r.version_name,
            "release_date": r.release_date.isoformat() if r.release_date else None,
            "score": float(r.score) if r.score is not None else None
        }
        for r in results
    ]

@router.get("/testset-comparison")
def get_testset_comparison(
    db: Session = Depends(get_db),
    version_id: int = None,
    metric: str = "bleu"
) -> Any:
    """
    Get comparison data between different testsets for a specific model version.
    """
    if not version_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="version_id is required"
        )
    
    if metric not in ["bleu", "comet"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="metric must be either 'bleu' or 'comet'"
        )
    
    results = (
        db.query(
            Testset.testset_name,
            func.avg(
                TrainingResult.finetuned_model_bleu if metric == "bleu"
                else TrainingResult.finetuned_model_comet
            ).label("finetuned_score"),
            func.avg(
                TrainingResult.base_model_bleu if metric == "bleu"
                else TrainingResult.base_model_comet
            ).label("base_score")
        )
        .join(TrainingResult)
        .filter(TrainingResult.version_id == version_id)
        .group_by(Testset.testset_id)
        .all()
    )
    
    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No training results found for this version"
        )
    
    # Convert BLEU scores to 0-100 scale if needed
    scale_factor = 1
    
    return {
        "version_name": db.query(ModelVersion.version_name)
            .filter(ModelVersion.version_id == version_id)
            .scalar(),
        "metric": metric,
        "testsets": [
            {
                "testset_name": r.testset_name,
                "finetuned_score": float(r.finetuned_score) * scale_factor if r.finetuned_score is not None else None,
                "base_score": float(r.base_score) * scale_factor if r.base_score is not None else None
            }
            for r in results
        ]
    } 