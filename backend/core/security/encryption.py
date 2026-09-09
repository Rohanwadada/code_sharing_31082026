import os
from abc import ABC, abstractmethod

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from core.config import settings


class BaseCipher(ABC):
    """Abstract cipher interface"""

    @abstractmethod
    def encrypt(self, data: bytes) -> bytes: ...

    @abstractmethod
    def decrypt(self, data: bytes) -> bytes: ...


class FernetCipher(BaseCipher):
    def __init__(self, key: bytes):
        self.cipher = Fernet(key)

    def encrypt(self, data: bytes) -> bytes:
        return self.cipher.encrypt(data)

    def decrypt(self, data: bytes) -> bytes:
        return self.cipher.decrypt(data)


class AESGCMCipher(BaseCipher):
    def __init__(self, key: bytes):
        self.key = key
        self.cipher = AESGCM(key)

    def encrypt(self, data: bytes) -> bytes:
        nonce = os.urandom(12)
        ciphertext = self.cipher.encrypt(nonce, data, None)
        return nonce + ciphertext

    def decrypt(self, data: bytes) -> bytes:
        nonce = data[:12]
        ciphertext = data[12:]
        return self.cipher.decrypt(nonce, ciphertext, None)


def get_cipher() -> BaseCipher:
    cipher = FernetCipher(settings.encryption_key.encode())
    return cipher
