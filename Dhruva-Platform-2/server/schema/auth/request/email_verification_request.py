from pydantic import BaseModel, EmailStr, validator


class EmailVerificationRequest(BaseModel):
    """Request schema for email verification."""
    token: str
    
    @validator("token")
    def validate_token(cls, v):
        if not v or len(v.strip()) < 32:
            raise ValueError("Invalid verification token format")
        if len(v.strip()) > 128:
            raise ValueError("Verification token is too long")
        return v.strip()


class ResendVerificationRequest(BaseModel):
    """Request schema for resending verification email."""
    email: EmailStr
    
    @validator("email")
    def validate_email(cls, v):
        return v.lower()


class RegistrationStatusRequest(BaseModel):
    """Request schema for checking registration status."""
    email: EmailStr
    
    @validator("email")
    def validate_email(cls, v):
        return v.lower()
