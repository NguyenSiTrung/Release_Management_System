from pydantic import BaseModel
from typing import Optional
from datetime import date

class ModelVersionBase(BaseModel):
    lang_pair_id: int
    version_name: str
    release_date: Optional[date] = None
    description: Optional[str] = None

class ModelVersionCreate(ModelVersionBase):
    pass

class ModelVersionUpdate(BaseModel):
    version_name: Optional[str] = None
    release_date: Optional[date] = None
    description: Optional[str] = None

class ModelVersionInDBBase(ModelVersionBase):
    version_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ModelVersion(ModelVersionInDBBase):
    pass 