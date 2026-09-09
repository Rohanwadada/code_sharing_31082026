from core.exception import AppException


class ComponentLimitReached(AppException):
    status_code = 400
    error_code = "COMPONENT_LIMIT_REACHED"


class ComponentAlreadyAdded(AppException):
    status_code = 400
    error_code = "COMPONENT_ALREDY_ADDED"
