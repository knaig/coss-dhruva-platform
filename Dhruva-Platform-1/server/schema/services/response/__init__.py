from typing import Union

from .create_grafana_snapshot_response import CreateGrafanaSnapshotResponse
from .model_view_response import ModelViewResponse
from .service_list_response import ServiceListResponse
from .service_response import ServiceResponse
from .service_view_response import ServiceViewResponse
from .ulca_asr_inference_response import ULCAAsrInferenceResponse
from .ulca_generic_inference_response import ULCAGenericInferenceResponse
from .ulca_ner_inference_response import ULCANerInferenceResponse
from .ulca_pipeline_inference_response import ULCAPipelineInferenceResponse
from .ulca_s2s_inference_response import ULCAS2SInferenceResponse
from .ulca_translation_inference_response import ULCATranslationInferenceResponse
from .ulca_transliteration_inference_response import (
    ULCATransliterationInferenceResponse,
)
from .ulca_tts_inference_response import ULCATtsInferenceResponse
from .ulca_vad_inference_response import ULCAVadInferenceResponse

ULCAInferenceResponse = Union[
    ULCAGenericInferenceResponse,
    ULCAAsrInferenceResponse,
    ULCATranslationInferenceResponse,
    ULCATransliterationInferenceResponse,
    ULCATtsInferenceResponse,
    ULCANerInferenceResponse,
    ULCAVadInferenceResponse,
]
