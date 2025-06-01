from pydantic import BaseModel, EmailStr, validator


class SignUpRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @validator("name")
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters long")
        return v.strip()

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v

    @validator("email")
    def validate_email(cls, v):
        return v.lower()
