from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
import os
import logging
from datetime import datetime

from app.core.deps import get_db, get_current_release_manager_user, get_current_active_user
from app.db.models import User
from app.core.evaluation import run_evaluation, translate_text
from app.crud import crud_evaluation, crud_model_version, crud_testset
from app.schemas.evaluation import (
    EvaluationJobCreate, 
    EvaluationJobStatus, 
    EvaluationJob,
    EvaluationStatus,
    EvaluationResultData,
    DirectTranslationRequest,
    DirectTranslationResponse
)

# Khởi tạo logger cho module này
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/run", response_model=EvaluationJobStatus)
def run_evaluation_job(
    evaluation_in: EvaluationJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_release_manager_user)
) -> Any:
    """
    Start an evaluation job for a model version using a specific testset
    """
    logger.info(f"Request to start evaluation job received: version_id={evaluation_in.version_id}, testset_id={evaluation_in.testset_id}, user_id={current_user.user_id}")
    
    # Validate that model version exists
    model_version = crud_model_version.get(db, version_id=evaluation_in.version_id)
    if not model_version:
        logger.warning(f"Evaluation request failed: Model version {evaluation_in.version_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    
    # Validate that model files exist
    if not model_version.model_file_path_on_server or not model_version.hparams_file_path_on_server:
        logger.warning(f"Evaluation request failed: Model files not uploaded for version {evaluation_in.version_id}")
        logger.debug(f"Model file path: {model_version.model_file_path_on_server}, HParams file path: {model_version.hparams_file_path_on_server}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model files not uploaded for this version"
        )
    
    # Validate that testset exists
    testset = crud_testset.get_testset(db, testset_id=evaluation_in.testset_id)
    if not testset:
        logger.warning(f"Evaluation request failed: Testset {evaluation_in.testset_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Testset not found"
        )
    
    # Validate that testset has source and target files
    if not testset.source_file_path or not testset.target_file_path:
        logger.warning(f"Evaluation request failed: Testset {evaluation_in.testset_id} missing source or target files")
        logger.debug(f"Source file path: {testset.source_file_path}, Target file path: {testset.target_file_path}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Testset must have both source and target file paths defined"
        )
    
    # Create evaluation job
    try:
        job = crud_evaluation.create(
            db=db,
            obj_in=evaluation_in,
            user_id=current_user.user_id
        )
        logger.info(f"Evaluation job created successfully: job_id={job.job_id}")
    except Exception as e:
        logger.error(f"Failed to create evaluation job: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create evaluation job"
        )
    
    # Start background task
    logger.info(f"Starting background task for job_id={job.job_id}")
    background_tasks.add_task(run_evaluation, job.job_id)
    
    # Return job status
    return EvaluationJobStatus(
        job_id=job.job_id,
        status=job.status,
        progress_percentage=0,
        requested_at=job.requested_at
    )

@router.post("/translate", response_model=DirectTranslationResponse)
def translate_text_direct(
    request: DirectTranslationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Translate text directly using a selected model version
    """
    logger.info(f"Direct translation request: version_id={request.version_id}, model_type={request.model_type}, user_id={current_user.user_id}")
    logger.debug(f"Text length: {len(request.source_text)} chars, Mode: {request.mode_type}, Sub-mode: {request.sub_mode_type}")
    
    # Validate that model version exists
    model_version = crud_model_version.get(db, version_id=request.version_id)
    if not model_version:
        logger.warning(f"Direct translation failed: Model version {request.version_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model version not found"
        )
    
    # Check which model type was requested
    if request.model_type == "finetuned":
        # Validate that finetuned model files exist
        if not model_version.model_file_path_on_server or not model_version.hparams_file_path_on_server:
            logger.warning(f"Direct translation failed: Finetuned model files not found for version {request.version_id}")
            logger.debug(f"Model file path: {model_version.model_file_path_on_server}, HParams file path: {model_version.hparams_file_path_on_server}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Finetuned model files not uploaded for this version"
            )
        model_file_path = model_version.model_file_path_on_server
        hparams_file_path = model_version.hparams_file_path_on_server
        logger.info(f"Using finetuned model for translation: {os.path.basename(model_file_path)}")
    else:  # base model
        # Validate that base model files exist
        if not model_version.base_model_file_path_on_server or not model_version.base_hparams_file_path_on_server:
            logger.warning(f"Direct translation failed: Base model files not found for version {request.version_id}")
            logger.debug(f"Base model file path: {model_version.base_model_file_path_on_server}, Base HParams file path: {model_version.base_hparams_file_path_on_server}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Base model files not uploaded for this version"
            )
        model_file_path = model_version.base_model_file_path_on_server
        hparams_file_path = model_version.base_hparams_file_path_on_server
        logger.info(f"Using base model for translation: {os.path.basename(model_file_path)}")
    
    try:
        # Perform direct translation
        logger.info("Calling translation function")
        start_time = datetime.now()
        translated_text = translate_text(
            source_text=request.source_text,
            model_file_path=model_file_path,
            hparams_file_path=hparams_file_path,
            mode_type=request.mode_type,
            sub_mode_type=request.sub_mode_type,
            custom_params=request.custom_params
        )
        end_time = datetime.now()
        execution_time = (end_time - start_time).total_seconds()
        logger.info(f"Translation completed in {execution_time:.2f} seconds")
        logger.debug(f"Input length: {len(request.source_text)} chars, Output length: {len(translated_text)} chars")
        
        return DirectTranslationResponse(
            translated_text=translated_text,
            status="success"
        )
    except Exception as e:
        logger.error(f"Direct translation failed: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation failed: {str(e)}"
        )

@router.get("/status/{job_id}", response_model=EvaluationJobStatus)
def get_evaluation_status(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get the status of an evaluation job
    """
    logger.info(f"Status request for job_id={job_id}, user_id={current_user.user_id}")
    
    job = crud_evaluation.get_with_details(db, job_id=job_id)
    if not job:
        logger.warning(f"Status request failed: Job {job_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation job not found"
        )
    
    logger.info(f"Job status: {job['status']}")
    
    # Calculate progress percentage based on status
    progress_percentage = 0
    if job["status"] == EvaluationStatus.PENDING:
        progress_percentage = 0
    elif job["status"] == EvaluationStatus.PREPARING_SETUP:
        progress_percentage = 10
    elif job["status"] == EvaluationStatus.PREPARING_ENGINE:
        progress_percentage = 30
    elif job["status"] == EvaluationStatus.RUNNING_ENGINE:
        progress_percentage = 50
    elif job["status"] == EvaluationStatus.CALCULATING_METRICS:
        progress_percentage = 80
    elif job["status"] == EvaluationStatus.COMPLETED:
        progress_percentage = 100
    elif job["status"] == EvaluationStatus.FAILED:
        progress_percentage = 100
    
    # Create response
    response = EvaluationJobStatus(
        job_id=job["job_id"],
        status=job["status"],
        progress_percentage=progress_percentage,
        requested_at=job["requested_at"],
        completed_at=job["completed_at"],
        error_message=job["log_message"] if job["status"] == EvaluationStatus.FAILED else None,
        mode_type=job["mode_type"],
        sub_mode_type=job["sub_mode_type"],
        custom_params=job["custom_params"]
    )
    
    # Add result data if completed
    if job["status"] == EvaluationStatus.COMPLETED:
        logger.info(f"Job {job_id} is completed with scores: BLEU={job['bleu_score']}, COMET={job['comet_score']}")
        response.result = EvaluationResultData(
            bleu_score=job["bleu_score"],
            comet_score=job["comet_score"],
            output_file_generated_path=os.path.basename(job["output_file_path"]) if job["output_file_path"] else None,
            added_to_details=bool(job["details_added_successfully"])
        )
    elif job["status"] == EvaluationStatus.FAILED:
        logger.warning(f"Job {job_id} failed with error: {job['log_message']}")
    
    return response

@router.get("/", response_model=List[EvaluationJob])
def list_evaluation_jobs(
    db: Session = Depends(get_db),
    version_id: Optional[int] = None,
    testset_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    List evaluation jobs with optional filtering
    """
    logger.info(f"Listing evaluation jobs: version_id={version_id}, testset_id={testset_id}, status={status}, user_id={current_user.user_id}")
    
    # Convert status string to enum if provided
    status_enum = None
    if status:
        try:
            status_enum = EvaluationStatus(status)
        except ValueError:
            logger.warning(f"Invalid status value in request: {status}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value. Must be one of: {', '.join([s.value for s in EvaluationStatus])}"
            )
    
    try:
        jobs = crud_evaluation.get_multi(
            db=db,
            skip=skip,
            limit=limit,
            version_id=version_id,
            testset_id=testset_id,
            status=status_enum
        )
        logger.info(f"Found {len(jobs)} evaluation jobs")
        return jobs
    except Exception as e:
        logger.error(f"Error listing evaluation jobs: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving evaluation jobs"
        ) 