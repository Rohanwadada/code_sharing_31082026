from core.exception import AppException


class RoadmapNotFound(AppException):
    status_code = 404
    error_code = "ROADMAP_NOT_FOUND"
