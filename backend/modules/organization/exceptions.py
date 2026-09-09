from core.exception import AppException


class OrganizationNotFound(AppException):
    status_code = 404
    error_code = "ORGANIZATION_NOT_FOUND"


class OrganizationAccessDenied(AppException):
    status_code = 403
    error_code = "ORGANIZATION_ACCESS_DENIED"


class OrganizationSlugAlreadyExists(AppException):
    status_code = 409
    error_code = "ORGANIZATION_SLUG_ALREADY_EXISTS"


class NotOrganizationMember(AppException):
    status_code = 403
    error_code = "NOT_ORGANIZATION_MEMBER"


class MemberAlreadyExists(AppException):
    status_code = 409
    error_code = "MEMBER_ALREADY_EXISTS"
