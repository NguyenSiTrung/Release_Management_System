from typing import Optional, List, Union
from pydantic import BaseModel, Field, validator
from datetime import date, datetime
from .release_note import ReleaseNote
from .training_result import TrainingResult

# Shared properties
class ModelVersionBase(BaseModel):
    version_name: str
    description: Optional[str] = None
    release_date: Optional[Union[date, str]] = None
    
    # Add validator for release_date to handle string dates
    @validator('release_date', pre=True)
    def parse_release_date(cls, value):
        if value is None:
            return None
        if isinstance(value, date):
            return value
        if isinstance(value, str) and value:
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError:
                raise ValueError(f'Invalid date format for release_date: {value}. Use YYYY-MM-DD')
        return None

# Properties to receive on ModelVersion creation
class ModelVersionCreate(ModelVersionBase):
    lang_pair_id: int

# Properties to receive on ModelVersion update
class ModelVersionUpdate(ModelVersionBase):
    lang_pair_id: Optional[int] = None

# Properties shared by models stored in DB
class ModelVersionInDBBase(ModelVersionBase):
    version_id: int
    lang_pair_id: int
    created_at: datetime
    updated_at: datetime
    # Finetuned model files
    model_file_name: Optional[str] = None
    hparams_file_name: Optional[str] = None
    # Base model files
    base_model_file_name: Optional[str] = None
    base_hparams_file_name: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True  # Keep for backward compatibility

# Properties to return to client
class ModelVersion(ModelVersionInDBBase):
    pass 

# Properties properties stored in DB
class ModelVersionInDB(ModelVersionInDBBase):
    # Finetuned model paths
    model_file_path_on_server: Optional[str] = None
    hparams_file_path_on_server: Optional[str] = None
    # Base model paths
    base_model_file_path_on_server: Optional[str] = None
    base_hparams_file_path_on_server: Optional[str] = None

# For detailed view with related data
class ModelVersionDetail(ModelVersion):
    release_note: Optional[ReleaseNote] = None
    training_results: List[TrainingResult] = [] 

# Pagination response
class PaginatedModelVersions(BaseModel):
    items: List[ModelVersion]
    total: int
    page: int
    size: int
    pages: int 