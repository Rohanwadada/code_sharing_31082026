import time
from datetime import UTC, datetime


def get_current_timestamp():
    return datetime.now(UTC)


def get_current_epoch():
    return int(time.time())
