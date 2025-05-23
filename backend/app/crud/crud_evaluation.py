from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func
import logging

from app.db.models import EvaluationJob, ModelVersion, Testset, User
from app.schemas.evaluation import EvaluationJobCreate, EvaluationStatus

# Khởi tạo logger cho module này
logger = logging.getLogger(__name__)

def get(db: Session, job_id: int) -> Optional[EvaluationJob]:
    """
    Get an evaluation job by ID
    """
    logger.debug(f"Getting evaluation job with ID: {job_id}")
    try:
        job = db.query(EvaluationJob).filter(EvaluationJob.job_id == job_id).first()
        if job:
            logger.debug(f"Found evaluation job with ID: {job_id}")
        else:
            logger.debug(f"No evaluation job found with ID: {job_id}")
        return job
    except Exception as e:
        logger.error(f"Database error getting evaluation job {job_id}: {str(e)}")
        logger.exception("Exception details:")
        raise

def count(
    db: Session, 
    *, 
    version_id: Optional[int] = None,
    testset_id: Optional[int] = None,
    status: Optional[EvaluationStatus] = None,
    user_id: Optional[int] = None
) -> int:
    """
    Count evaluation jobs with filtering options
    """
    filter_msgs = []
    if version_id:
        filter_msgs.append(f"version_id={version_id}")
    if testset_id:
        filter_msgs.append(f"testset_id={testset_id}")
    if status:
        filter_msgs.append(f"status={status.value}")
    if user_id:
        filter_msgs.append(f"user_id={user_id}")
    
    filter_str = ", ".join(filter_msgs) if filter_msgs else "none"
    logger.debug(f"Counting evaluation jobs with filters: {filter_str}")
    
    try:
        query = db.query(EvaluationJob)
        
        if version_id is not None:
            query = query.filter(EvaluationJob.version_id == version_id)
        if testset_id is not None:
            query = query.filter(EvaluationJob.testset_id == testset_id)
        if status is not None:
            query = query.filter(EvaluationJob.status == status)
        if user_id is not None:
            query = query.filter(EvaluationJob.requested_by_user_id == user_id)
            
        total = query.count()
        logger.debug(f"Found {total} evaluation jobs matching filters")
        
        return total
    except Exception as e:
        logger.error(f"Database error counting evaluation jobs with filters ({filter_str}): {str(e)}")
        logger.exception("Exception details:")
        raise

def get_multi(
    db: Session, 
    *, 
    skip: int = 0, 
    limit: int = 100, 
    version_id: Optional[int] = None,
    testset_id: Optional[int] = None,
    status: Optional[EvaluationStatus] = None,
    user_id: Optional[int] = None
) -> List[EvaluationJob]:
    """
    Get multiple evaluation jobs with filtering options
    """
    filter_msgs = []
    if version_id:
        filter_msgs.append(f"version_id={version_id}")
    if testset_id:
        filter_msgs.append(f"testset_id={testset_id}")
    if status:
        filter_msgs.append(f"status={status.value}")
    if user_id:
        filter_msgs.append(f"user_id={user_id}")
    
    filter_str = ", ".join(filter_msgs) if filter_msgs else "none"
    logger.debug(f"Getting multiple evaluation jobs with filters: {filter_str}, skip={skip}, limit={limit}")
    
    try:
        query = db.query(EvaluationJob)
        
        if version_id is not None:
            query = query.filter(EvaluationJob.version_id == version_id)
        if testset_id is not None:
            query = query.filter(EvaluationJob.testset_id == testset_id)
        if status is not None:
            query = query.filter(EvaluationJob.status == status)
        if user_id is not None:
            query = query.filter(EvaluationJob.requested_by_user_id == user_id)
            
        jobs = query.order_by(EvaluationJob.job_id.desc()).offset(skip).limit(limit).all()
        logger.debug(f"Found {len(jobs)} evaluation jobs")
        
        return jobs
    except Exception as e:
        logger.error(f"Database error getting evaluation jobs with filters ({filter_str}): {str(e)}")
        logger.exception("Exception details:")
        raise

def get_by_date_range(
    db: Session,
    *,
    start_date: datetime,
    end_date: datetime,
    version_id: Optional[int] = None,
    status: Optional[EvaluationStatus] = None
) -> List[EvaluationJob]:
    """
    Get evaluation jobs within a date range
    """
    logger.debug(f"Getting evaluation jobs in date range: {start_date} to {end_date}")
    
    try:
        query = db.query(EvaluationJob).filter(
            and_(
                EvaluationJob.requested_at >= start_date,
                EvaluationJob.requested_at <= end_date
            )
        )
        
        if version_id is not None:
            query = query.filter(EvaluationJob.version_id == version_id)
        if status is not None:
            query = query.filter(EvaluationJob.status == status)
            
        jobs = query.order_by(EvaluationJob.requested_at.desc()).all()
        logger.debug(f"Found {len(jobs)} evaluation jobs in date range")
        
        return jobs
    except Exception as e:
        logger.error(f"Database error getting evaluation jobs by date range: {str(e)}")
        logger.exception("Exception details:")
        raise

def create(
    db: Session, 
    *, 
    obj_in: EvaluationJobCreate,
    user_id: Optional[int] = None
) -> EvaluationJob:
    """
    Create a new evaluation job
    """
    logger.info(f"Creating new evaluation job: version_id={obj_in.version_id}, testset_id={obj_in.testset_id}, user_id={user_id}")
    
    try:
        db_obj = EvaluationJob(
            version_id=obj_in.version_id,
            testset_id=obj_in.testset_id,
            requested_by_user_id=user_id,
            status=EvaluationStatus.PENDING,
            auto_add_to_details_requested=1 if obj_in.auto_add_to_details else 0,
            mode_type=obj_in.mode_type,
            sub_mode_type=obj_in.sub_mode_type,
            custom_params=obj_in.custom_params,
            evaluation_model_type=obj_in.evaluation_model_type or 'finetuned'
        )
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        logger.info(f"Created evaluation job with ID: {db_obj.job_id}")
        return db_obj
    except Exception as e:
        db.rollback()
        logger.error(f"Database error creating evaluation job: {str(e)}")
        logger.exception("Exception details:")
        raise

def update_status(
    db: Session,
    *,
    job_id: int,
    status: EvaluationStatus,
    log_message: Optional[str] = None,
    processing_started_at: Optional[datetime] = None,
    completed_at: Optional[datetime] = None,
    update_data: Optional[Dict[str, Any]] = None
) -> Optional[EvaluationJob]:
    """
    Update the status and related fields of an evaluation job
    """
    logger.debug(f"Updating status for job_id={job_id} to {status.value}")
    
    try:
        db_obj = get(db, job_id)
        if not db_obj:
            logger.warning(f"Cannot update status: Job {job_id} not found")
            return None
        
        # Update status and log message
        db_obj.status = status
        if log_message is not None:
            db_obj.log_message = log_message
        
        # Update timestamps as appropriate
        if processing_started_at is not None:
            db_obj.processing_started_at = processing_started_at
        if completed_at is not None:
            db_obj.completed_at = completed_at
        elif status in [EvaluationStatus.COMPLETED, EvaluationStatus.FAILED]:
            db_obj.completed_at = datetime.now()
        
        # Update additional fields if provided
        if update_data:
            for field, value in update_data.items():
                if hasattr(db_obj, field):
                    setattr(db_obj, field, value)
                else:
                    logger.warning(f"Ignored unknown field '{field}' when updating job {job_id}")
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        logger.debug(f"Updated job {job_id} status to {status.value}")
        return db_obj
    except Exception as e:
        db.rollback()
        logger.error(f"Database error updating job {job_id} status: {str(e)}")
        logger.exception("Exception details:")
        raise

def get_with_details(db: Session, job_id: int) -> Optional[Dict[str, Any]]:
    """
    Get an evaluation job with additional details from related models
    """
    logger.debug(f"Getting detailed evaluation job with ID: {job_id}")
    try:
        result = db.query(
            EvaluationJob,
            ModelVersion.version_name.label("model_version_name"),
            Testset.testset_name.label("testset_name"),
            User.username.label("requested_by_username")
        ).join(
            ModelVersion, EvaluationJob.version_id == ModelVersion.version_id
        ).join(
            Testset, EvaluationJob.testset_id == Testset.testset_id
        ).outerjoin(
            User, EvaluationJob.requested_by_user_id == User.user_id
        ).filter(
            EvaluationJob.job_id == job_id
        ).first()
        
        if not result:
            logger.debug(f"No evaluation job found with ID: {job_id}")
            return None
        
        # Convert SQLAlchemy row to dict
        job_dict = {
            "job_id": result.EvaluationJob.job_id,
            "version_id": result.EvaluationJob.version_id,
            "testset_id": result.EvaluationJob.testset_id,
            "requested_by_user_id": result.EvaluationJob.requested_by_user_id,
            "status": result.EvaluationJob.status,
            "bleu_score": result.EvaluationJob.bleu_score,
            "comet_score": result.EvaluationJob.comet_score,
            "output_file_path": result.EvaluationJob.output_file_path,
            "log_message": result.EvaluationJob.log_message,
            "auto_add_to_details_requested": bool(result.EvaluationJob.auto_add_to_details_requested),
            "details_added_successfully": bool(result.EvaluationJob.details_added_successfully) if result.EvaluationJob.details_added_successfully is not None else None,
            "requested_at": result.EvaluationJob.requested_at,
            "processing_started_at": result.EvaluationJob.processing_started_at,
            "completed_at": result.EvaluationJob.completed_at,
            "model_version_name": result.model_version_name,
            "testset_name": result.testset_name,
            "requested_by_username": result.requested_by_username,
            "mode_type": result.EvaluationJob.mode_type,
            "sub_mode_type": result.EvaluationJob.sub_mode_type,
            "custom_params": result.EvaluationJob.custom_params,
            "evaluation_model_type": result.EvaluationJob.evaluation_model_type,
            "base_model_result": result.EvaluationJob.base_model_result
        }
        
        logger.debug(f"Found detailed evaluation job with ID: {job_id}, status: {result.EvaluationJob.status}")
        return job_dict 
    except Exception as e:
        logger.error(f"Database error getting detailed evaluation job {job_id}: {str(e)}")
        logger.exception("Exception details:")
        raise

def delete(db: Session, *, job_id: int) -> Optional[EvaluationJob]:
    """
    Delete an evaluation job
    """
    logger.info(f"Deleting evaluation job with ID: {job_id}")
    
    try:
        # Get job by ID
        job = db.query(EvaluationJob).filter(EvaluationJob.job_id == job_id).first()
        if not job:
            logger.warning(f"Cannot delete: Job {job_id} not found")
            return None
        
        # Delete job
        db.delete(job)
        db.commit()
        
        logger.info(f"Deleted evaluation job with ID: {job_id}")
        return job
    except Exception as e:
        db.rollback()
        logger.error(f"Database error deleting job {job_id}: {str(e)}")
        logger.exception("Exception details:")
        raise

def remove(db: Session, *, job_id: int) -> Optional[EvaluationJob]:
    """
    Remove an evaluation job (alias for delete)
    """
    return delete(db, job_id=job_id) 