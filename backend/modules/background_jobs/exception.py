from core.exception import AppException


class JobNotFound(AppException):
    status_code = 404
    error_code = "JON_NOT_FOUND"
