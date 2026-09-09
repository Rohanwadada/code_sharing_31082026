import secrets
import string
import time


def securerandomstring(length, include_timestamp: bool = False):
    securechars = string.ascii_letters + string.digits
    random_part = "".join(secrets.choice(securechars) for _ in range(length))
    if include_timestamp:
        unique_part = str(int(time.time() * 1000))
        return random_part + unique_part
    return random_part
