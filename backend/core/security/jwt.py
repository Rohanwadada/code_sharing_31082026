from datetime import timedelta
import secrets
from typing import Any, Dict, Optional

import jwt
from jwt import PyJWTError

from core.config import settings
from core.exception import AppException
from core.security.exception import InvalidToken, InvalidTokenType, TokenExpired
from core.time import get_current_timestamp


def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    current_timestamp = get_current_timestamp()
    payload = {
        "sub": subject,
        "iat": current_timestamp,
        "exp": current_timestamp + expires_delta,
        "type": token_type,
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )


def create_access_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
) -> str:
    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=timedelta(seconds=settings.jwt_access_token_expiry),
        extra_claims=extra_claims,
    )


def create_refresh_token(
    subject: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=expires_delta
        or timedelta(seconds=settings.jwt_refresh_token_expiry),
        extra_claims=extra_claims,
    )


def decode_token(
    token: str,
    expected_type: Optional[str] = None,
) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )

        if expected_type and payload.get("type") != expected_type:
            raise InvalidTokenType("Invalid token type")

        return payload

    except jwt.ExpiredSignatureError:
        raise TokenExpired("Token has expired")

    except jwt.InvalidSignatureError:
        raise TokenExpired("Signature verification failed. Tampering suspected")

    except jwt.DecodeError:
        raise InvalidToken("Malformed token. Unable to decode structure")

    except jwt.InvalidTokenError:
        raise InvalidToken("Invalid token details (issuer or audience mismatch).")

    except PyJWTError as e:
        raise AppException(f"Unexpected error happened: {str(e)}")


def get_subject(token: str) -> str:
    payload = decode_token(token)
    return payload["sub"]


def is_access_token(token: str) -> bool:
    try:
        payload = decode_token(token)
        return payload.get("type") == "access"
    except ValueError:
        return False


def is_refresh_token(token: str) -> bool:
    try:
        payload = decode_token(token)
        return payload.get("type") == "refresh"
    except ValueError:
        return False


def create_csrf_token():
    return str(secrets.token_urlsafe(32))
