from datetime import datetime
import pytz

IST = pytz.timezone("Asia/Kolkata")

def convert_to_ist(dt: datetime):
    """Convert UTC datetime to Asia/Kolkata timezone."""
    if dt is None:
        return None
    return dt.astimezone(IST)

def now_ist():
    """Get current time in Asia/Kolkata timezone."""
    return datetime.now(IST)
