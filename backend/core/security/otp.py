import secrets

import uuid_utils as uuid

from core.config import settings
from shared.redis import redis

otp_store = {}


def generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


async def store_otp(email: str, otp: str) -> str:
    challange_id = str(uuid.uuid4())
    key_name = f"otp::{email}::{challange_id}"
    await redis.setex(name=key_name, value=otp, time=settings.otp_expiration_time)
    return challange_id
