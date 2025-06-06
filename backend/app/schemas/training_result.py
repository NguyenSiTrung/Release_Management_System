from pydantic import BaseModel, confloat
from typing import Optional

class TrainingResultBase(BaseModel):
    version_id: int
    testset_id: int
    base_model_bleu: Optional[confloat(ge=0, le=100)] = None
    base_model_comet: Optional[confloat(ge=-1, le=1)] = None
    finetuned_model_bleu: Optional[confloat(ge=0, le=100)] = None
    finetuned_model_comet: Optional[confloat(ge=-1, le=1)] = None
    training_details_notes: Optional[str] = None

class TrainingResultCreate(TrainingResultBase):
    pass

class TrainingResultUpdate(BaseModel):
    base_model_bleu: Optional[confloat(ge=0, le=100)] = None
    base_model_comet: Optional[confloat(ge=-1, le=1)] = None
    finetuned_model_bleu: Optional[confloat(ge=0, le=100)] = None
    finetuned_model_comet: Optional[confloat(ge=-1, le=1)] = None
    training_details_notes: Optional[str] = None

class TrainingResultInDBBase(TrainingResultBase):
    result_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class TrainingResult(TrainingResultInDBBase):
    pass 