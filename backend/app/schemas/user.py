from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str = "member"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None

class UserInDBBase(UserBase):
    user_id: int
    status: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    password_hash: str

class PendingUserApproval(BaseModel):
    user_id: int
    status: str  # 'approved' or 'rejected' 