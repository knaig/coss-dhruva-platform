from typing import Optional
from pydantic import BaseModel, validator


class ViewAdminDashboardRequest(BaseModel):
    page: int = 1
    limit: int = 10
    target_user_id: Optional[str] = None

    @validator("target_user_id", pre=True)
    def validate_target_user_id(cls, v):
        """Convert null-like values to None for proper handling"""
        if v is None or (isinstance(v, str) and v.lower() in ["null", "undefined", ""]):
            return None
        return v

    @validator("page")
    def validate_page(cls, v):
        if v < 1:
            raise ValueError("Page must be greater than 0")
        return v

    @validator("limit")
    def validate_limit(cls, v):
        if v < 1 or v > 100:
            raise ValueError("Limit must be between 1 and 100")
        return v
