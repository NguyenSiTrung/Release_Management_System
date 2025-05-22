from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

class EvaluationStatus(str, Enum):
    PENDING = "PENDING"
    PREPARING_SETUP = "PREPARING_SETUP"
    PREPARING_ENGINE = "PREPARING_ENGINE"
    RUNNING_ENGINE = "RUNNING_ENGINE"
    CALCULATING_METRICS = "CALCULATING_METRICS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class EvaluationJobCreate(BaseModel):
    version_id: int
    testset_id: int
    auto_add_to_details: bool = True
    mode_type: Optional[str] = None
    sub_mode_type: Optional[str] = None
    custom_params: Optional[str] = None
    evaluation_model_type: Optional[str] = "finetuned"  # Options: "base", "finetuned", "both"

class DirectTranslationRequest(BaseModel):
    version_id: int
    source_text: str
    model_type: str = "finetuned"  # Options: "base", "finetuned"
    mode_type: Optional[str] = None
    sub_mode_type: Optional[str] = None
    custom_params: Optional[str] = None

class DirectTranslationResponse(BaseModel):
    translated_text: str
    status: str

class EvaluationResultData(BaseModel):
    bleu_score: float
    comet_score: float
    output_file_generated_path: Optional[str] = None
    added_to_details: bool
    base_model_result: Optional[dict] = None  # To store base model results when both models are evaluated

class EvaluationJobStatus(BaseModel):
    job_id: int
    status: EvaluationStatus
    progress_percentage: Optional[int] = None
    requested_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[EvaluationResultData] = None
    error_message: Optional[str] = None
    mode_type: Optional[str] = None
    sub_mode_type: Optional[str] = None
    custom_params: Optional[str] = None
    evaluation_model_type: Optional[str] = None

class EvaluationJobBase(BaseModel):
    status: EvaluationStatus
    bleu_score: Optional[float] = None
    comet_score: Optional[float] = None
    output_file_path: Optional[str] = None
    log_message: Optional[str] = None
    auto_add_to_details_requested: bool
    details_added_successfully: Optional[bool] = None
    requested_at: datetime
    processing_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    mode_type: Optional[str] = None
    sub_mode_type: Optional[str] = None
    custom_params: Optional[str] = None
    evaluation_model_type: Optional[str] = None

class EvaluationJobInDBBase(EvaluationJobBase):
    job_id: int
    version_id: int
    testset_id: int
    requested_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True
        orm_mode = True

class EvaluationJob(EvaluationJobInDBBase):
    pass

class EvaluationJobWithDetails(EvaluationJob):
    model_version_name: str
    testset_name: str
    requested_by_username: Optional[str] = None 