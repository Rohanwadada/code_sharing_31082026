from core.exception import AppException


class TeamNotFound(AppException):
    status_code = 404
    error_code = "TEAM_NOT_FOUND"


class TeamAccessDenied(AppException):
    status_code = 403
    error_code = "TEAM_ACCESS_DENIED"


class TeamSlugAlreadyExists(AppException):
    status_code = 409
    error_code = "TEAM_SLUG_ALREADY_EXISTS"


class NotTeamMember(AppException):
    status_code = 403
    error_code = "NOT_TEAM_MEMBER"


class TeamMemberAlreadyExists(AppException):
    status_code = 409
    error_code = "TEAM_MEMBER_ALREADY_EXISTS"
