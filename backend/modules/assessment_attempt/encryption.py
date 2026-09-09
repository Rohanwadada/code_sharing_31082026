import os
import uuid_utils as uuid
import base64
from Crypto.Cipher import AES

# ---------------------------------------------------------------------------
# AES helpers
# ---------------------------------------------------------------------------

_raw_key = os.getenv("AES_SECRET_KEY", "a579vH0b0t8IVL3XCejpSg==")
AES_SECRET_KEY: bytes = base64.b64decode(_raw_key)


def _pad(s: str) -> str:
    pad_length = 16 - (len(s) % 16)
    return s + (chr(pad_length) * pad_length)


def _unpad(s: str) -> str:
    return s[: -ord(s[-1])]


def generate_exam_allocation_id(user_id: str, exam_id: str) -> str:
    unique_id = uuid.uuid4().hex[:6]
    return f"{user_id}_{exam_id}_{unique_id}"


def encrypt_allocation_id(allocation_id: str) -> str:
    cipher = AES.new(AES_SECRET_KEY, AES.MODE_ECB)
    padded = _pad(allocation_id).encode()
    encrypted_bytes = cipher.encrypt(padded)
    return base64.urlsafe_b64encode(encrypted_bytes).decode()


def decrypt_allocation_id(encrypted_id: str) -> str:
    cipher = AES.new(AES_SECRET_KEY, AES.MODE_ECB)
    decoded = base64.urlsafe_b64decode(encrypted_id)
    decrypted = cipher.decrypt(decoded).decode()
    return _unpad(decrypted)