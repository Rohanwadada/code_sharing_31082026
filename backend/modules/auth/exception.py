from core.exception import AppException


class InvalidOTP(AppException):
    status_code = 400
    error_code = "INVALID_OTP"


class ExpiredOTP(AppException):
    status_code = 400
    error_code = "EXPIRED_OTP"


class SessionRevoked(AppException):
    status_code = 401
    error_code = "SESSION_REVOKED"


class SessionExpired(AppException):
    status_code = 401
    error_code = "SESSION_EXPIRED"
