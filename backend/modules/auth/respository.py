from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid_utils import uuid7

from core.time import get_current_timestamp
from modules.auth.model import UserSessions


class AuthRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_session(self, user_id: str, current_refresh_jti: str):
        current_timestamp = get_current_timestamp()
        expiration_timestamp = (current_timestamp + timedelta(days=30))

        session = UserSessions(
            session_id=str(uuid7()),
            user_id=user_id,
            current_refresh_jti=current_refresh_jti,
            status="active",
            created_at=current_timestamp,
            updated_at=current_timestamp,
            expires_at=expiration_timestamp,
        )

        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)

        return session

    async def get_session_by_id(self, session_id: str) -> UserSessions | None:
        session = await self.db.get(UserSessions, session_id)
        return session

    async def update_refresh_jti(
        self, session_id: str, new_jti: str
    ) -> UserSessions | None:
        session = await self.get_session_by_id(session_id=session_id)
        if session is None:
            return None

        session.current_refresh_jti = new_jti
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def revoke_session(self, session_id: str) -> bool:
        session = await self.db.scalar(
            select(UserSessions).where(
                UserSessions.session_id == session_id,
                UserSessions.status == "active",
            )
        )

        if session is None:
            return False

        session.status = "revoked"

        await self.db.commit()

        return True
