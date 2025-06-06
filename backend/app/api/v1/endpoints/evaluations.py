from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import logging
from datetime import datetime
import json
import math
import shutil

from app.core.deps import get_db, get_current_release_manager_user, get_current_active_user, get_current_admin_user
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
    DirectTranslationResponse,
    PaginatedEvaluationJobs,
    BulkDeleteRequest,
    DateRangeDeleteRequest,
    DeleteResponse
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
        custom_params=job["custom_params"],
        evaluation_model_type=job["evaluation_model_type"]
    )
    
    # Add result data if completed
    if job["status"] == EvaluationStatus.COMPLETED:
        logger.info(f"Job {job_id} is completed with scores: BLEU={job['bleu_score']}, COMET={job['comet_score']}")
        response_data = {
            "bleu_score": job["bleu_score"],
            "comet_score": job["comet_score"],
            "output_file_generated_path": os.path.basename(job["output_file_path"]) if job["output_file_path"] else None,
            "added_to_details": bool(job["details_added_successfully"])
        }
        
        # Check if we have base_model_result field in the database record
        if job.get("base_model_result"):
            try:
                # Parse JSON string to dict
                base_model_result = json.loads(job["base_model_result"])
                response_data["base_model_result"] = base_model_result
                logger.info(f"Job {job_id}: Including base model result in response")
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Job {job_id}: Failed to parse base_model_result JSON: {str(e)}")
            
        response.result = EvaluationResultData(**response_data)
    elif job["status"] == EvaluationStatus.FAILED:
        logger.warning(f"Job {job_id} failed with error: {job['log_message']}")
    
    return response

@router.get("/", response_model=PaginatedEvaluationJobs)
def list_evaluation_jobs(
    db: Session = Depends(get_db),
    version_id: Optional[int] = None,
    testset_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(10, ge=1, le=100, description="Page size"),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    List evaluation jobs with pagination
    """
    logger.info(f"Listing evaluation jobs: version_id={version_id}, testset_id={testset_id}, status={status}, page={page}, size={size}, user_id={current_user.user_id}")
    
    # Convert page to skip offset
    skip = (page - 1) * size
    
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
        # Get total count
        total = crud_evaluation.count(
            db=db,
            version_id=version_id,
            testset_id=testset_id,
            status=status_enum
        )
        
        # Get paginated jobs
        jobs = crud_evaluation.get_multi(
            db=db,
            skip=skip,
            limit=size,
            version_id=version_id,
            testset_id=testset_id,
            status=status_enum
        )
        logger.info(f"Found {len(jobs)} evaluation jobs (page {page}/{math.ceil(total / size)})")
        
        # Convert SQLAlchemy objects to dicts and parse base_model_result
        jobs_data = []
        for job in jobs:
            # Debug logging
            logger.info(f"Processing job {job.job_id}: has base_model_result attr? {hasattr(job, 'base_model_result')}")
            if hasattr(job, 'base_model_result'):
                logger.info(f"Job {job.job_id} base_model_result value: {job.base_model_result}")
            
            job_dict = {
                "job_id": job.job_id,
                "version_id": job.version_id,
                "testset_id": job.testset_id,
                "requested_by_user_id": job.requested_by_user_id,
                "status": job.status,
                "bleu_score": job.bleu_score,
                "comet_score": job.comet_score,
                "output_file_path": job.output_file_path,
                "log_message": job.log_message,
                "auto_add_to_details_requested": bool(job.auto_add_to_details_requested),
                "details_added_successfully": bool(job.details_added_successfully) if job.details_added_successfully is not None else None,
                "requested_at": job.requested_at,
                "processing_started_at": job.processing_started_at,
                "completed_at": job.completed_at,
                "mode_type": job.mode_type,
                "sub_mode_type": job.sub_mode_type,
                "custom_params": job.custom_params,
                "evaluation_model_type": job.evaluation_model_type
            }
            
            # Parse base_model_result if it exists
            if hasattr(job, 'base_model_result') and job.base_model_result:
                try:
                    base_model_result = json.loads(job.base_model_result)
                    job_dict["base_model_bleu_score"] = base_model_result.get("bleu_score")
                    job_dict["base_model_comet_score"] = base_model_result.get("comet_score")
                    job_dict["base_model_output_file_path"] = base_model_result.get("output_file_path")
                    logger.info(f"Job {job.job_id}: Parsed base model scores: BLEU={base_model_result.get('bleu_score')}, COMET={base_model_result.get('comet_score')}")
                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Job {job.job_id}: Failed to parse base_model_result JSON: {str(e)}")
            
            jobs_data.append(job_dict)
        
        # Debug log the final data structure
        logger.info(f"Final jobs_data structure: {json.dumps(jobs_data, default=str, indent=2)[:500]}...")
        
        # Calculate total pages
        pages = math.ceil(total / size)
        
        return PaginatedEvaluationJobs(
            items=jobs_data,
            total=total,
            page=page,
            size=size,
            pages=pages
        )
    except Exception as e:
        logger.error(f"Error listing evaluation jobs: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving evaluation jobs"
        )

@router.get("/{job_id}/download-output-file")
def download_output_file(
    job_id: int,
    model_type: str = "finetuned",  # "finetuned" or "base"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Download the output file of an evaluation job
    """
    logger.info(f"Download request for job_id={job_id}, model_type={model_type}, user_id={current_user.user_id}")
    
    job = crud_evaluation.get_with_details(db, job_id=job_id)
    if not job:
        logger.warning(f"Download request failed: Job {job_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation job not found"
        )
    
    # Determine which file to download
    file_path = None
    filename = None
    
    if model_type == "base":
        # Check if we have base model result
        if job.get("base_model_result"):
            try:
                base_model_result = json.loads(job["base_model_result"])
                file_path = base_model_result.get("output_file_path")
                filename = f"base_model_output_{job_id}.txt"
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Job {job_id}: Failed to parse base_model_result JSON: {str(e)}")
        
        if not file_path:
            logger.warning(f"Download request failed: Base model output file not found for job {job_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Base model output file not found"
            )
    else:  # finetuned
        file_path = job["output_file_path"]
        filename = f"finetuned_model_output_{job_id}.txt"
        
        if not file_path:
            logger.warning(f"Download request failed: Finetuned model output file not found for job {job_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Finetuned model output file not found"
            )
    
    if not os.path.exists(file_path):
        logger.warning(f"Download request failed: {model_type} model output file does not exist on disk for job {job_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file does not exist on disk"
        )
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )

@router.get("/{job_id}/output-content")
def get_output_content(
    job_id: int,
    model_type: str = "finetuned",  # "finetuned" or "base"
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Get the content of the output file of an evaluation job
    """
    logger.info(f"Output content request for job_id={job_id}, model_type={model_type}, user_id={current_user.user_id}")
    
    job = crud_evaluation.get_with_details(db, job_id=job_id)
    if not job:
        logger.warning(f"Content request failed: Job {job_id} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation job not found"
        )
    
    # Determine which file to read
    file_path = None
    
    if model_type == "base":
        # Check if we have base model result
        if job.get("base_model_result"):
            try:
                base_model_result = json.loads(job["base_model_result"])
                file_path = base_model_result.get("output_file_path")
            except (json.JSONDecodeError, TypeError) as e:
                logger.warning(f"Job {job_id}: Failed to parse base_model_result JSON: {str(e)}")
        
        if not file_path:
            logger.warning(f"Content request failed: Base model output file not found for job {job_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Base model output file not found"
            )
    else:  # finetuned
        file_path = job["output_file_path"]
        
        if not file_path:
            logger.warning(f"Content request failed: Finetuned model output file not found for job {job_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Finetuned model output file not found"
            )
    
    if not os.path.exists(file_path):
        logger.warning(f"Content request failed: {model_type} model output file does not exist on disk for job {job_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Output file does not exist on disk"
        )
    
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read()
        return {"content": content, "model_type": model_type}
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            with open(file_path, "r", encoding="latin-1") as file:
                content = file.read()
            return {"content": content, "model_type": model_type}
        except Exception as e:
            logger.error(f"Error reading file content with fallback encoding: {str(e)}")
            logger.exception("Exception details:")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error reading file content"
            )
    except Exception as e:
        logger.error(f"Error reading file content: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error reading file content"
        )

@router.get("/debug-job/{job_id}")
def debug_job_data(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Debug endpoint to check if base_model_result is accessible
    """
    job = crud_evaluation.get(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    debug_info = {
        "job_id": job.job_id,
        "has_base_model_result_attr": hasattr(job, 'base_model_result'),
        "base_model_result_value": getattr(job, 'base_model_result', None),
        "evaluation_model_type": job.evaluation_model_type
    }
    
    return debug_info

@router.post("/bulk-delete", response_model=DeleteResponse)
def bulk_delete_jobs(
    request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Delete multiple evaluation jobs by job IDs (admin only)
    """
    logger.info(f"Bulk delete request received: job_ids={request.job_ids}, user_id={current_user.user_id}")
    
    deleted_count = 0
    failed_deletions = []
    
    try:
        for job_id in request.job_ids:
            try:
                # Get job details first
                job = crud_evaluation.get_with_details(db, job_id=job_id)
                if not job:
                    failed_deletions.append({
                        "job_id": job_id,
                        "error": "Job not found"
                    })
                    continue
                
                # Delete associated files
                try:
                    if job.get("output_file_path") and os.path.exists(job["output_file_path"]):
                        os.remove(job["output_file_path"])
                        logger.info(f"Deleted output file: {job['output_file_path']}")
                    # Delete base model output file if exists
                    if job.get("base_model_result"):
                        try:
                            base_model_result = json.loads(job["base_model_result"])
                            base_output_path = base_model_result.get("output_file_path")
                            if base_output_path and os.path.exists(base_output_path):
                                os.remove(base_output_path)
                                logger.info(f"Deleted base model output file: {base_output_path}")
                        except (json.JSONDecodeError, TypeError):
                            pass
                    # Delete temp evaluation folders if exist
                    temp_eval_folder1 = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "evaluation_temp", f"evaluation_{job_id}")
                    temp_eval_folder2 = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "eval_temp", f"eval_{job_id}")
                    for temp_folder in [temp_eval_folder1, temp_eval_folder2]:
                        if os.path.exists(temp_folder):
                            try:
                                shutil.rmtree(temp_folder)
                                logger.info(f"Deleted temp evaluation folder: {temp_folder}")
                            except Exception as e:
                                logger.warning(f"Failed to delete temp folder {temp_folder} for job {job_id}: {str(e)}")
                except Exception as e:
                    logger.warning(f"Failed to delete files for job {job_id}: {str(e)}")
                
                # Delete job from database
                crud_evaluation.remove(db, job_id=job_id)
                deleted_count += 1
                logger.info(f"Successfully deleted job {job_id}")
                
            except Exception as e:
                logger.error(f"Failed to delete job {job_id}: {str(e)}")
                failed_deletions.append({
                    "job_id": job_id,
                    "error": str(e)
                })
        
        return DeleteResponse(
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} jobs",
            failed_deletions=failed_deletions if failed_deletions else None
        )
    except Exception as e:
        logger.error(f"Error bulk deleting jobs: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error bulk deleting jobs"
        )

@router.post("/date-range-delete", response_model=DeleteResponse)
def date_range_delete_jobs(
    request: DateRangeDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """
    Delete evaluation jobs within a specified date range (admin only)
    """
    logger.info(f"Date range delete request received: start_date={request.start_date}, end_date={request.end_date}, version_id={request.version_id}, status={request.status}, user_id={current_user.user_id}")
    
    # Convert status string to enum if provided
    status_enum = None
    if request.status:
        try:
            status_enum = EvaluationStatus(request.status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status value. Must be one of: {', '.join([s.value for s in EvaluationStatus])}"
            )
    
    deleted_count = 0
    failed_deletions = []
    
    try:
        # Get jobs matching criteria
        jobs = crud_evaluation.get_by_date_range(
            db=db,
            start_date=request.start_date,
            end_date=request.end_date,
            version_id=request.version_id,
            status=status_enum
        )
        logger.info(f"Found {len(jobs)} jobs to delete in date range")
        
        for job in jobs:
            try:
                job_id = job.job_id
                
                # Delete associated files
                try:
                    if job.output_file_path and os.path.exists(job.output_file_path):
                        os.remove(job.output_file_path)
                        logger.info(f"Deleted output file: {job.output_file_path}")
                    # Delete base model output file if exists
                    if hasattr(job, 'base_model_result') and job.base_model_result:
                        try:
                            base_model_result = json.loads(job.base_model_result)
                            base_output_path = base_model_result.get("output_file_path")
                            if base_output_path and os.path.exists(base_output_path):
                                os.remove(base_output_path)
                                logger.info(f"Deleted base model output file: {base_output_path}")
                        except (json.JSONDecodeError, TypeError):
                            pass
                    # Delete temp evaluation folders if exist
                    temp_eval_folder1 = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "evaluation_temp", f"evaluation_{job_id}")
                    temp_eval_folder2 = os.path.join(settings.DOCKER_VOLUME_TMP_PATH_HOST, "eval_temp", f"eval_{job_id}")
                    for temp_folder in [temp_eval_folder1, temp_eval_folder2]:
                        if os.path.exists(temp_folder):
                            try:
                                shutil.rmtree(temp_folder)
                                logger.info(f"Deleted temp evaluation folder: {temp_folder}")
                            except Exception as e:
                                logger.warning(f"Failed to delete temp folder {temp_folder} for job {job_id}: {str(e)}")
                except Exception as e:
                    logger.warning(f"Failed to delete files for job {job_id}: {str(e)}")
                
                # Delete job from database
                crud_evaluation.remove(db, job_id=job_id)
                deleted_count += 1
                logger.info(f"Successfully deleted job {job_id}")
                
            except Exception as e:
                logger.error(f"Failed to delete job {job.job_id}: {str(e)}")
                failed_deletions.append({
                    "job_id": job.job_id,
                    "error": str(e)
                })
        
        return DeleteResponse(
            deleted_count=deleted_count,
            message=f"Successfully deleted {deleted_count} jobs from date range",
            failed_deletions=failed_deletions if failed_deletions else None
        )
    except Exception as e:
        logger.error(f"Error date range deleting jobs: {str(e)}")
        logger.exception("Exception details:")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error date range deleting jobs"
        ) 