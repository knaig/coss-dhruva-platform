from exception.client_error import ClientErrorResponse
from fastapi import APIRouter, Depends
from schema.auth.request import RefreshRequest, SignInRequest, SignUpRequest
from schema.auth.response import RefreshResponse, SignInResponse, SignUpResponse

from ..service.auth_service import AuthService

router = APIRouter(
    responses={"401": {"model": ClientErrorResponse}},
)


@router.post("/signin", response_model=SignInResponse)
async def _sign_in(
    request: SignInRequest, auth_service: AuthService = Depends(AuthService)
):
    res = auth_service.validate_user(request)
    return res


@router.post("/signup", response_model=SignUpResponse, status_code=201)
async def _sign_up(
    request: SignUpRequest, auth_service: AuthService = Depends(AuthService)
):
    """
    Public endpoint for user registration.
    Creates a new user with CONSUMER role and generates a default INFERENCE API key.
    """
    res = auth_service.register_user(request)
    return res


@router.post("/refresh", response_model=RefreshResponse)
async def _get_access_token(
    request: RefreshRequest, auth_service: AuthService = Depends(AuthService)
):
    token = auth_service.get_refresh_token(request)
    return RefreshResponse(token=token)
