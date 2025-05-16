from typing import List, Optional
from pydantic import BaseModel
from schema.services.common import _ULCAAudio, _ULCALanguage
from schema.services.common.ulca_text import ULCATextFormat

class ULCAAudioConfig(BaseModel):
    language: _ULCALanguage
    postProcessors: Optional[List[str]] = None
    transcriptionFormat: Optional[ULCATextFormat] = ULCATextFormat.TRANSCRIPT

class ULCAAudioRequest(BaseModel):
    audioContent: str
    audioFormat: str = "wav"

class ULCAAudioTranslationRequest(BaseModel):
    config: ULCAAudioConfig
    audio: List[ULCAAudioRequest] 