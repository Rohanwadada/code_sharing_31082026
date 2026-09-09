import uuid_utils as uuid
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from core.config import settings
from core.exception import ForbiddenException
from core.security.dependencies import validate_refresh_token
from core.security.jwt import (
    create_access_token,
    create_csrf_token,
    create_refresh_token,
    decode_token,
)
from modules.auth.schema import (
    SendOTPRequest,
    SendOTPResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from modules.auth.service import AuthService, get_auth_service
from modules.organization.service import OrganizationService, get_organization_service
from modules.user.service import UserService, get_user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login-request", response_model=SendOTPResponse)
async def login_request(
    request: SendOTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
    user_service: UserService = Depends(get_user_service),
):
    # existing_user = await user_service.find_user_by_email(user_email=request.email)
    # if not existing_user:
    #     raise ForbiddenException("Access denied!! Please contact administrator")


    challenge_id = await auth_service.send_login_otp(email=request.email)
    return SendOTPResponse(challenge_id=challenge_id)


@router.post("/verify-login", response_model=VerifyOTPResponse)
async def verify_login(
    request: VerifyOTPRequest,
    user_service: UserService = Depends(get_user_service),
    auth_service: AuthService = Depends(get_auth_service),
    organization_service: OrganizationService = Depends(get_organization_service)
):
    await auth_service.verify_login_otp(
        email=request.email,
        otp=request.otp,
        challenge_id=request.challenge_id,
    )
    
    await organization_service.onboard_user_to_organization_by_email_domain(email=request.email)

    user = await user_service.get_or_create_user(email=request.email)
    session = await auth_service.create_session(user_id=user.user_id)

    csrf_token = create_csrf_token()

    access_token = create_access_token(
        subject=user.user_id,
        extra_claims={"jti": str(uuid.uuid4()), "sid": str(session.session_id)},
    )
    refresh_token = create_refresh_token(
        subject=user.user_id,
        extra_claims={
            "jti": str(session.current_refresh_jti),
            "sid": str(session.session_id),
            "csrf": csrf_token,
        },
    )

    content = VerifyOTPResponse(
        status="success",
    )

    response = JSONResponse(content=content.model_dump(), status_code=200)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_access_token_expiry,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expiry,
        path="/",
    )
    response.set_cookie(
        key="csrf",
        value=csrf_token,
        httponly=False,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expiry,
        path="/",
    )

    return response


@router.post("/refresh", response_model=VerifyOTPResponse)
async def refresh(
    request: Request,
    payload: dict = Depends(validate_refresh_token),
    auth_service: AuthService = Depends(get_auth_service),
):

    access_token, refresh_token, session = await auth_service.refresh_tokens(payload)

    content = VerifyOTPResponse(
        status="success",
    )

    response = JSONResponse(content=content.model_dump(), status_code=200)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_access_token_expiry,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.jwt_refresh_token_expiry,
        path="/",
    )

    return response


@router.post("/logout")
async def logout(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
):
    access_token = request.cookies.get("access_token")
    session_id = None

    if access_token:
        try:
            payload = decode_token(access_token, expected_type="access")
            session_id = payload.get("sid")
        except Exception:
            pass

    if not session_id:
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            try:
                payload = decode_token(refresh_token, expected_type="refresh")
                session_id = payload.get("sid")
            except Exception:
                pass

    if session_id:
        await auth_service.logout(session_id=session_id)

    content = {"status": "success"}

    response = JSONResponse(content=content, status_code=200)
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="csrf", path="/")

    return response
