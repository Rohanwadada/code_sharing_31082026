from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    status_code = 500
    error_code = "INTERNAL_ERROR"

    def __init__(self, message=None, extra: dict | None = None) -> None:
        self.message = message
        self.extra = extra or {}


class BadRequestException(AppException):
    status_code = 400
    error_code = "BAD_REQUEST"
    
class NotFoundException(AppException):
    status_code = 404
    error_code = "NOT_FOUND"


class ForbiddenException(AppException):
    status_code = 403
    error_code = "BAD_REQUEST"


class AgentExecutionError(Exception):
    """Custom exception for exception comes while executing langgraph"""

    def __init__(self, message: str, **context) -> None:
        super().__init__(message)
        self.context = context


async def app_exception_handler(request: Request, exception: Exception) -> JSONResponse:
    assert isinstance(exception, AppException)

    content = {"error": exception.error_code, "message": exception.message}

    if exception.extra:
        content.update(exception.extra)

    resposnse = JSONResponse(
        status_code=exception.status_code,
        content=content,
    )

    # if exception.status_code == 401:
    #     for cookie_name in ("access_token", "refresh_token", "csrf"):
    #         resposnse.delete_cookie(
    #             key=cookie_name,
    #             path="/",          # Match the path used when setting the cookie
    #             httponly=True if cookie_name != "csrf" else False,     # Match original attributes
    #             secure=True,       # Match original attributes
    #             samesite="lax",    # Match original attributes ("lax", "strict", or "none")
    #         )

    return resposnse
