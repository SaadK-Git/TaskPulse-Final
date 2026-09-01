from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserCreate(BaseModel):
    name: str = Field(..., example="john_doe")
    email: EmailStr = Field(..., example="john.doe@example.com")
    password: str = Field(..., example="strongpassword123")
    role: str = Field("member", example="member")
    
class Userlogin(BaseModel):
    name: str
    password: str = Field(min_length=8)
    