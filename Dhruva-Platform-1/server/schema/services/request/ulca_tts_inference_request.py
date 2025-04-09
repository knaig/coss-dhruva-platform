from typing import List, Optional

from pydantic import BaseModel

from ..common import (
    AudioFormat,
    Gender,
    _ULCABaseInferenceRequest,
    _ULCABaseInferenceRequestConfig,
    _ULCAText,
)
from ..common.ulca_language import _ULCALanguage


class _ULCATtsInferenceRequestConfig(_ULCABaseInferenceRequestConfig):
    gender: Gender
    samplingRate: Optional[int] = None
    audioFormat: AudioFormat = AudioFormat.WAV
    language: _ULCALanguage


class _ULCATtsInputText(BaseModel):
    source: str
    audioDuration: Optional[float] = None


class ULCATtsInferenceRequest(_ULCABaseInferenceRequest):
    input: List[_ULCATtsInputText]
    config: _ULCATtsInferenceRequestConfig
