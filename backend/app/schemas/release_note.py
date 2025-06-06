from pydantic import BaseModel
from typing import Optional

class ReleaseNoteBase(BaseModel):
    version_id: int
    title: Optional[str] = None
    content: Optional[str] = None
    author_id: Optional[int] = None

class ReleaseNoteCreate(ReleaseNoteBase):
    pass

class ReleaseNoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class ReleaseNoteInDBBase(ReleaseNoteBase):
    note_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class ReleaseNote(ReleaseNoteInDBBase):
    pass 