from core.exception import AppException


class ThreadNotFound(AppException):
    status_code = 404
    error_code = "THREAD_NOT_FOUND"


class ThreadAccessDenied(AppException):
    status_code = 403
    error_code = "THREAD_ACCESS_DENIED"


class MessageNotFound(AppException):
    status_code = 404
    error_code = "MESSAGE_NOT_FOUND"
