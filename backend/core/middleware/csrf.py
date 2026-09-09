from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from core.exception import AppException, app_exception_handler
from core.security.exception import InvalidCSRF


class CSRFMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        exempt_paths: set[str] | None = None,
    ):
        super().__init__(app)
        self.exempt_paths = exempt_paths or set()

    async def dispatch(self, request: Request, call_next):
        try:
            if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
                return await call_next(request)

            if request.url.path in self.exempt_paths:
                return await call_next(request)

            csrf_cookie = request.cookies.get("csrf")
            csrf_header = request.headers.get("X-CSRF-Token")

            if not csrf_cookie or csrf_cookie != csrf_header:
                raise InvalidCSRF("Invalid csrf")

            return await call_next(request)
        except AppException as exc:
            return await app_exception_handler(request, exc)
