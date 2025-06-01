from pydantic import BaseModel, EmailStr

from ..common.role_type import RoleType


class SignUpResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: RoleType
    api_key: str
    message: str = "User registered successfully"
