import re
import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession
from uuid_utils import uuid7

from core.security.exception import InvalidToken
from core.security.jwt import create_access_token, create_refresh_token
from core.security.otp import generate_otp, store_otp
from core.time import get_current_timestamp
from modules.auth.exception import (
    ExpiredOTP,
    InvalidOTP,
    SessionExpired,
    SessionRevoked,
)
from modules.auth.model import UserSessions
from modules.auth.respository import AuthRepository
from shared.db.dependencies import get_db
from shared.email.dependencies import get_background_email_service
from shared.email.schema import EmailTemplate
from shared.email.service import BackgroundEmailService
from shared.redis import redis


class AuthService:
    def __init__(
        self,
        email_service: BackgroundEmailService,
        auth_repo: AuthRepository,
    ) -> None:
        self.email_service = email_service
        self.auth_repo = auth_repo

    async def send_login_otp(self, email: str) -> str:
        is_valid_email = self.validate_email(email=email)
        if not is_valid_email:
            raise

        otp = generate_otp()
        print(f"OTP: {otp}")

        challenge_id = await store_otp(email=email, otp=otp)

        self.email_service.send_email(
            template=EmailTemplate.LOGIN_OTP, to_emails=[email], otp=otp
        )

        return challenge_id

    async def verify_login_otp(self, email: str, otp: str, challenge_id: str):
        otp_key = f"otp::{email}::{challenge_id}"
        otp_from_db = await redis.get(name=otp_key)

        if not otp_from_db:
            raise ExpiredOTP(message="OTP exipred")
        elif otp_from_db != otp:
            raise InvalidOTP(message="Invalid OTP")

        await redis.delete(otp_key)

        return True

    async def create_session(self, user_id: str) -> UserSessions:
        refresh_jti = str(uuid7())
        return await self.auth_repo.create_session(
            user_id=user_id,
            current_refresh_jti=refresh_jti,
        )

    async def validate_token_session(self, session_id: str, user_id: str) -> None:
        session = await self.auth_repo.get_session_by_id(session_id)
        if not session:
            raise InvalidToken("Session not found")
        if session.status != "active":
            raise SessionRevoked("Session has been revoked")
        if session.user_id != user_id:
            raise InvalidToken("Session user mismatch")
        if session.expires_at and session.expires_at < get_current_timestamp():
            raise SessionExpired("Session has expired")

    async def refresh_tokens(self, payload: dict) -> tuple[str, str, UserSessions]:

        user_id = payload["sub"]
        jti = payload.get("jti")
        session_id = payload.get("sid")
        csrf = payload.get("csrf")

        if not jti or not session_id:
            raise InvalidToken("Invalid token claims")

        session = await self.auth_repo.get_session_by_id(session_id)
        if not session:
            raise InvalidToken("Session not found")
        if session.status != "active":
            raise SessionRevoked("Session has been revoked")
        if session.user_id != user_id:
            raise InvalidToken("Session user mismatch")
        if str(session.current_refresh_jti) != str(jti):
            raise InvalidToken("Token has been rotated")
        if session.expires_at and session.expires_at <= get_current_timestamp():
            raise SessionExpired("Session has expired")

        new_refresh_jti = str(uuid7())
        access_token = create_access_token(
            subject=user_id,
            extra_claims={"jti": str(uuid.uuid4()), "sid": str(session_id)},
        )

        remaining = session.expires_at - get_current_timestamp()

        refresh_token = create_refresh_token(
            subject=user_id,
            extra_claims={
                "jti": str(new_refresh_jti),
                "sid": str(session_id),
                "csrf": csrf,
            },
            expires_delta=remaining,
        )

        await self.auth_repo.update_refresh_jti(session_id, new_refresh_jti)

        return access_token, refresh_token, session

    def validate_email(self, email: str) -> bool:
        regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if re.fullmatch(regex, email):
            return True
        return False

    async def logout(self, session_id: str) -> bool:
        return await self.auth_repo.revoke_session(session_id=session_id)


async def get_auth_service(
    db: AsyncSession = Depends(get_db),
    email_service: BackgroundEmailService = Depends(get_background_email_service),
) -> AuthService:
    return AuthService(
        email_service=email_service,
        auth_repo=AuthRepository(db=db),
    )
