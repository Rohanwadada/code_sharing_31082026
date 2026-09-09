import copy
import logging

from cryptography.fernet import InvalidToken
from sqlalchemy import Text, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)


class EncryptedText(TypeDecorator):
    """
    Production-grade encrypted column using Fernet (AES-based).

    Features:
    - Transparent encryption/decryption
    - Null-safe
    - Safe error handling
    - Ready for key rotation (extendable)
    """

    impl = Text
    cache_ok = True

    def __init__(self, cipher, *args, **kwargs):
        """
        cipher: Fernet instance (inject from your app config)
        """
        super().__init__(*args, **kwargs)
        self.cipher = cipher

    # encrypt before writing to DB
    def process_bind_param(self, value, dialect):
        if value is None:
            return value

        try:
            if not isinstance(value, str):
                raise TypeError("EncryptedText only accepts string values")

            encrypted = self.cipher.encrypt(value.encode("utf-8"))
            return encrypted.decode("utf-8")

        except Exception as e:
            logger.exception("Encryption failed")
            raise ValueError("Encryption error") from e

    # decrypt after reading from DB
    def process_result_value(self, value, dialect):
        if value is None:
            return value

        try:
            decrypted = self.cipher.decrypt(value.encode("utf-8"))
            return decrypted.decode("utf-8")

        except (InvalidToken, ValueError, TypeError):
            logger.error("Decryption failed: Invalid token (possible key mismatch)")
            return value

        except Exception as e:
            logger.exception("Unexpected decryption error")
            raise e


class EncryptedJSON(TypeDecorator):
    impl = JSONB
    cache_ok = True

    def __init__(self, cipher, keys_to_encrypt=None, **kwargs):
        super().__init__(**kwargs)
        self.cipher = cipher
        self.keys_to_encrypt = keys_to_encrypt or []

    # 🔹 Called when saving to DB
    def process_bind_param(self, value, dialect):
        if value is None:
            return value

        data = copy.deepcopy(value)
        return self._encrypt_json(data)

    # 🔹 Called when reading from DB
    def process_result_value(self, value, dialect):
        if value is None:
            return value

        data = copy.deepcopy(value)
        return self._decrypt_json(data)

    # 🔹 Recursive encryption
    def _encrypt_json(self, data, parent_key=""):
        if isinstance(data, dict):
            for key, val in data.items():
                full_key = f"{parent_key}.{key}" if parent_key else key

                if self._should_encrypt(full_key):
                    if isinstance(val, str):
                        data[key] = self._encrypt(val)
                else:
                    data[key] = self._encrypt_json(val, full_key)

        elif isinstance(data, list):
            return [
                self._encrypt_json(item, f"{parent_key}.{i}" if parent_key else str(i))
                for i, item in enumerate(data)
            ]

        return data

    # 🔹 Recursive decryption
    def _decrypt_json(self, data, parent_key=""):
        if isinstance(data, dict):
            for key, val in data.items():
                full_key = f"{parent_key}.{key}" if parent_key else key

                if self._should_encrypt(full_key):
                    if isinstance(val, str):
                        data[key] = self._decrypt(val)
                else:
                    data[key] = self._decrypt_json(val, full_key)

        elif isinstance(data, list):
            return [
                self._decrypt_json(item, f"{parent_key}.{i}" if parent_key else str(i))
                for i, item in enumerate(data)
            ]

        return data

    # 🔥 NEW: wildcard-aware matching
    def _should_encrypt(self, key_path):
        return any(
            self._match_path(pattern, key_path) for pattern in self.keys_to_encrypt
        )

    # def _match_path(self, pattern, key_path):
    #     pattern_parts = pattern.split(".")
    #     key_parts = key_path.split(".")

    #     if len(pattern_parts) != len(key_parts):
    #         return False

    #     for p, k in zip(pattern_parts, key_parts):
    #         if p == "*":  # wildcard for array index
    #             continue
    #         if p != k:
    #             return False

    #     return True

    def _match_path(self, pattern, key_path):
        pattern_parts = pattern.split(".")
        key_parts = key_path.split(".")

        return self._match_parts(pattern_parts, key_parts)

    def _match_parts(self, pattern_parts, key_parts):
        # If both empty → match
        if not pattern_parts and not key_parts:
            return True

        # If pattern empty but key not → no match
        if not pattern_parts:
            return False

        # Handle **
        if pattern_parts[0] == "**":
            # Case 1: match zero level
            if self._match_parts(pattern_parts[1:], key_parts):
                return True

            # Case 2: consume one level and continue
            if key_parts:
                return self._match_parts(pattern_parts, key_parts[1:])

            return False

        # If key is empty but pattern still remains
        if not key_parts:
            return False

        # Handle *
        if pattern_parts[0] == "*":
            return self._match_parts(pattern_parts[1:], key_parts[1:])

        # Exact match
        if pattern_parts[0] == key_parts[0]:
            return self._match_parts(pattern_parts[1:], key_parts[1:])

        return False

    def _encrypt(self, value: str) -> str:
        return self.cipher.encrypt(value.encode()).decode()

    def _decrypt(self, value: str) -> str:
        try:
            return self.cipher.decrypt(value.encode()).decode()
        except (InvalidToken, ValueError, TypeError):
            # Not encrypted or invalid → return as-is
            return value
