from pydantic import BaseModel
from typing import Optional, List

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
    source_file_name: Optional[str] = None
    target_file_name: Optional[str] = None
    source_file_path_on_server: Optional[str] = None
    target_file_path_on_server: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class Testset(TestsetInDBBase):
    pass 

# Pagination response
class PaginatedTestsets(BaseModel):
    items: List[Testset]
    total: int
    page: int
    size: int
    pages: int 