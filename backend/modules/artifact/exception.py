from core.exception import AppException


class ArtifactNotFound(AppException):
    status_code = 404
    error_code = "ARTIFACT_NOT_FOUND"
