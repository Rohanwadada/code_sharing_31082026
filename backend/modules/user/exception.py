from core.exception import AppException


class UserNotFound(AppException):
    status_code = 400
    error_code = "USER_NOT_FOUND"
