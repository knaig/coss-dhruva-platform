import traceback
from typing import List

from auth.api_key_type_authorization_provider import ApiKeyTypeAuthorizationProvider
from auth.auth_provider import AuthProvider
from auth.request_session_provider import InjectRequestSession, RequestSession
from exception.base_error import BaseError
from exception.client_error import ClientError, ClientErrorResponse
from fastapi import APIRouter, Depends, status
from schema.auth.common import ApiKeyType
from schema.services.request import ModelViewRequest, ServiceViewRequest
from schema.services.response import (
    ModelViewResponse,
    ServiceListResponse,
    ServiceViewResponse,
)

from ..error import Errors
from ..repository import ModelRepository
from ..service import DetailsService

router = APIRouter(
    prefix="/details",
    dependencies=[
        Depends(AuthProvider),
        Depends(ApiKeyTypeAuthorizationProvider(ApiKeyType.INFERENCE)),
    ],
    responses={"401": {"model": ClientErrorResponse}},
)


@router.get("/list_services", response_model=List[ServiceListResponse])
async def _list_services(
    details_service: DetailsService = Depends(DetailsService),
):
    services_list = details_service.list_services()
    return services_list


@router.post("/view_service", response_model=ServiceViewResponse)
async def _view_service_details(
    request: ServiceViewRequest,
    details_service: DetailsService = Depends(DetailsService),
    session: RequestSession = Depends(InjectRequestSession),
):
    response = details_service.get_service_details(request, session.id)
    return response


@router.get("/list_models", response_model=List[ModelViewResponse])
async def _list_models(model_repository: ModelRepository = Depends(ModelRepository)):
    try:
        models_list = model_repository.find_all()
    except Exception:
        raise BaseError(Errors.DHRUVA106.value, traceback.format_exc())

    # Transform each model to match ModelViewResponse schema
    transformed_models = []
    for model in models_list:
        try:
            # Transform languages from complex objects to simple strings
            languages = []
            if hasattr(model, 'languages') and model.languages:
                for lang in model.languages[:10]:  # Limit to first 10 language pairs
                    if isinstance(lang, dict):
                        source = lang.get('sourceLanguage', '')
                        target = lang.get('targetLanguage', '')
                        if source and target:
                            languages.append(f"{source}-{target}")
                        elif source:
                            languages.append(source)

            # Transform domain from list to string
            domain = "general"
            if hasattr(model, 'domain') and model.domain:
                if isinstance(model.domain, list) and len(model.domain) > 0:
                    domain = model.domain[0]
                elif isinstance(model.domain, str):
                    domain = model.domain

            # Transform submitter from object to string
            submitter = "Unknown"
            if hasattr(model, 'submitter') and model.submitter:
                if hasattr(model.submitter, 'name'):
                    submitter = model.submitter.name
                elif isinstance(model.submitter, dict):
                    submitter = model.submitter.get('name', 'Unknown')

            # Transform task from object to string
            task = "unknown"
            if hasattr(model, 'task') and model.task:
                if hasattr(model.task, 'type'):
                    task = model.task.type
                elif isinstance(model.task, dict):
                    task = model.task.get('type', 'unknown')

            # Transform inferenceEndPoint from object to string
            inference_endpoint = ""
            if hasattr(model, 'refUrl') and model.refUrl:
                inference_endpoint = model.refUrl
            elif hasattr(model, 'inferenceEndPoint'):
                inference_endpoint = "Available"

            # Create the transformed model
            transformed_model = ModelViewResponse(
                modelId=model.modelId,
                name=model.name,
                description=model.description,
                languages=languages,
                domain=domain,
                submitter=submitter,
                license=model.license if hasattr(model, 'license') else "Unknown",
                inferenceEndPoint=inference_endpoint,
                source="dhruva",  # Add default source
                task=task
            )
            transformed_models.append(transformed_model)
        except Exception as e:
            # Log the error but continue with other models
            print(f"Error transforming model {getattr(model, 'modelId', 'unknown')}: {str(e)}")
            continue

    return transformed_models


@router.post("/view_model", response_model=ModelViewResponse)
async def _view_model_details(
    request: ModelViewRequest,
    model_repository: ModelRepository = Depends(ModelRepository),
):
    try:
        model = model_repository.find_by_id(request.modelId)
    except Exception:
        raise BaseError(Errors.DHRUVA105.value, traceback.format_exc())

    if not model:
        raise ClientError(status.HTTP_404_NOT_FOUND, message="Invalid Model Id")

    # Transform the model to match ModelViewResponse schema
    try:
        # Transform languages from complex objects to simple strings
        languages = []
        if hasattr(model, 'languages') and model.languages:
            for lang in model.languages[:10]:  # Limit to first 10 language pairs
                if isinstance(lang, dict):
                    source = lang.get('sourceLanguage', '')
                    target = lang.get('targetLanguage', '')
                    if source and target:
                        languages.append(f"{source}-{target}")
                    elif source:
                        languages.append(source)

        # Transform domain from list to string
        domain = "general"
        if hasattr(model, 'domain') and model.domain:
            if isinstance(model.domain, list) and len(model.domain) > 0:
                domain = model.domain[0]
            elif isinstance(model.domain, str):
                domain = model.domain

        # Transform submitter from object to string
        submitter = "Unknown"
        if hasattr(model, 'submitter') and model.submitter:
            if hasattr(model.submitter, 'name'):
                submitter = model.submitter.name
            elif isinstance(model.submitter, dict):
                submitter = model.submitter.get('name', 'Unknown')

        # Transform task from object to string
        task = "unknown"
        if hasattr(model, 'task') and model.task:
            if hasattr(model.task, 'type'):
                task = model.task.type
            elif isinstance(model.task, dict):
                task = model.task.get('type', 'unknown')

        # Transform inferenceEndPoint from object to string
        inference_endpoint = ""
        if hasattr(model, 'refUrl') and model.refUrl:
            inference_endpoint = model.refUrl
        elif hasattr(model, 'inferenceEndPoint'):
            inference_endpoint = "Available"

        # Create the transformed model
        transformed_model = ModelViewResponse(
            modelId=model.modelId,
            name=model.name,
            description=model.description,
            languages=languages,
            domain=domain,
            submitter=submitter,
            license=model.license if hasattr(model, 'license') else "Unknown",
            inferenceEndPoint=inference_endpoint,
            source="dhruva",  # Add default source
            task=task
        )

        return transformed_model
    except Exception as e:
        raise BaseError(Errors.DHRUVA105.value, f"Error transforming model: {str(e)}")
