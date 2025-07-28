from typing import Optional

from pydantic import BaseModel, validator


class GetAllApiKeysRequest(BaseModel):
    target_user_id: Optional[str] = None
    target_service_id: Optional[str] = None

    @validator("target_user_id", pre=True)
    def validate_target_user_id(cls, v):
        """Convert null-like values to None for proper handling"""
        if v is None or (isinstance(v, str) and v.lower() in ["null", "undefined", ""]):
            return None
        return v

    @validator("target_service_id", pre=True)
    def validate_target_service_id(cls, v):
        """Convert null-like values to None for proper handling"""
        if v is None or (isinstance(v, str) and v.lower() in ["null", "undefined", ""]):
            return None
        return v
