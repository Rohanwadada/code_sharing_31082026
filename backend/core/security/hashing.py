import hashlib
import hmac
import random

from core.config import settings


def hash_entity(data: str):
    return hmac.new(
        settings.hash_secret.encode(), data.lower().encode(), hashlib.sha256
    ).hexdigest()


def generate_hash(str, length: int = 64) -> str:
    hashed_str = hashlib.sha256(str).hexdigest()[:length]
    mixed_case_hash = "".join(
        char.upper() if random.choice([True, False]) else char.lower()
        for char in hashed_str
    )
    return mixed_case_hash
