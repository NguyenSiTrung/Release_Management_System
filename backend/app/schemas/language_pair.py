from pydantic import BaseModel
from typing import Optional

class LanguagePairBase(BaseModel):
    source_language_code: str
    target_language_code: str
    description: Optional[str] = None

class LanguagePairCreate(LanguagePairBase):
    pass

class LanguagePairUpdate(BaseModel):
    description: Optional[str] = None

class LanguagePairInDBBase(LanguagePairBase):
    lang_pair_id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class LanguagePair(LanguagePairInDBBase):
    pass 