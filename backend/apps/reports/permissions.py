from rest_framework import permissions
from apps.accounts.models import User


class CanManageAccreditation(permissions.BasePermission):
    """
    Allow view access to all authenticated users.
    Only HOD, Coordinator, or Principal can create/update/delete accreditation criteria and evidence.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in [User.Role.HOD, User.Role.COORDINATOR, User.Role.PRINCIPAL]


class CanExportAcademicReports(permissions.BasePermission):
    """
    Faculty, Coordinator, HOD, and Principal can export aggregate XLSX reports.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in [
                User.Role.FACULTY,
                User.Role.COORDINATOR,
                User.Role.HOD,
                User.Role.PRINCIPAL,
            ]
        )


class CanViewExecutiveDashboard(permissions.BasePermission):
    """
    Principal, HOD, Coordinator, and Faculty can view executive dashboard KPIs.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in [
                User.Role.PRINCIPAL,
                User.Role.HOD,
                User.Role.COORDINATOR,
                User.Role.FACULTY,
            ]
        )
