from typing import Any, Dict

from fastapi import Depends, Request

from core.security.exception import InvalidCSRF, MissingToken, TokenExpired
from core.security.jwt import decode_token
from modules.auth.service import AuthService, get_auth_service
from modules.user.model import UserDetails
from modules.user.service import UserService, get_user_service


def _extract_token(request: Request) -> str:
    access_token = request.cookies.get("access_token")
    refresh_token = request.cookies.get("refresh_token")

    if not access_token:
        if refresh_token:
            raise TokenExpired("Access token expired", extra={"type": "access"})
        else:
            raise MissingToken("Access Token not provided", extra={"type": "access"})

    return access_token


def get_current_user_payload(request: Request) -> Dict[str, Any]:
    token = _extract_token(request)
    return decode_token(token, expected_type="access")


def validate_csrf_token(request: Request, token_payload: dict):
    pass


async def get_current_user(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    user_service: UserService = Depends(get_user_service),
) -> UserDetails:
    payload = get_current_user_payload(request)

    await auth_service.validate_token_session(
        payload["sid"],
        payload["sub"],
    )

    return await user_service.get_user_by_id(payload["sub"])


async def validate_refresh_token(request: Request) -> dict:
    csrf_cookie = request.cookies.get("csrf")

    token = request.cookies.get("refresh_token")

    if not token:
        raise MissingToken(
            "Refresh token missing or expired", extra={"type": "refresh"}
        )

    payload = decode_token(token, expected_type="refresh")

    if payload["csrf"] != csrf_cookie:
        raise InvalidCSRF("Invalid csrf")

    return payload
