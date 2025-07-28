from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from ..common.role_type import RoleType


class EmailVerificationResponse(BaseModel):
    """Response schema for successful email verification."""
    message: str
    user_id: str
    email: EmailStr
    role: RoleType
    api_key: str
    redirect_url: Optional[str] = None


class ResendVerificationResponse(BaseModel):
    """Response schema for resend verification email."""
    message: str = "Verification email resent successfully"
    email: EmailStr
    expires_in: int = 86400  # 24 hours in seconds


class RegistrationStatusResponse(BaseModel):
    """Response schema for registration status check."""
    status: str  # "not_found", "pending", "verified"
    message: str
    email: EmailStr
    expires_at: Optional[datetime] = None
    verification_attempts: Optional[int] = None
