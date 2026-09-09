from core.exception import AppException


class MissingToken(AppException):
    status_code = 401
    error_code = "TOKEN_MISSING"


class InvalidToken(AppException):
    status_code = 401
    error_code = "INVALID_TOKEN"


class TokenExpired(AppException):
    status_code = 401
    error_code = "TOKEN_EXPIRED"


class InvalidTokenType(AppException):
    status_code = 401
    error_code = "INVALID_TOKEN_TYPE"


class MissingCSRF(AppException):
    status_code = 403
    error_code = "CSRF_MISSING"


class InvalidCSRF(AppException):
    status_code = 403
    error_code = "CSRF_INVALID"
