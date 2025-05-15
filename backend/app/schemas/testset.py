from pydantic import BaseModel
from typing import Optional

class TestsetBase(BaseModel):
    lang_pair_id: int
    testset_name: str
    description: Optional[str] = None
    source_file_path: Optional[str] = None
    target_file_path: Optional[str] = None

class TestsetCreate(TestsetBase):
    pass

class TestsetUpdate(BaseModel):
    testset_name: Optional[str] = None
    description: Optional[str] = None
    source_file_path: Optional[str] = None
    target_file_path: Optional[str] = None

class TestsetInDBBase(TestsetBase):
    testset_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class Testset(TestsetInDBBase):
    pass 