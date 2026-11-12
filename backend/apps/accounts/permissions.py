"""
Permission classes and queryset scoping helpers for accounts and roles.
"""
from rest_framework import permissions
from .models import User


class IsPrincipal(permissions.BasePermission):
    """Allows access only to Principals."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.PRINCIPAL
        )


class IsHOD(permissions.BasePermission):
    """Allows access only to HODs."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.HOD
        )


class IsFacultyLike(permissions.BasePermission):
    """Allows access to Faculty or Class Coordinators."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in (User.Role.FACULTY, User.Role.COORDINATOR)
                or request.user.role in (User.Role.HOD, User.Role.PRINCIPAL)
            )
        )


class IsCoordinator(permissions.BasePermission):
    """Allows access to Class Coordinators (and HOD/Principal)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role == User.Role.COORDINATOR
                or request.user.role in (User.Role.HOD, User.Role.PRINCIPAL)
            )
        )


class IsStudent(permissions.BasePermission):
    """Allows access to Students."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
        )


class IsHODOrPrincipal(permissions.BasePermission):
    """Allows access to HOD (read/write for own dept) or Principal (read-only institution-wide)."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == User.Role.PRINCIPAL:
            return request.method in permissions.SAFE_METHODS
        return request.user.role == User.Role.HOD


class CanManageUsers(permissions.BasePermission):
    """
    User management permission:
    - HOD can read and write users within own department.
    - Principal can read (SAFE_METHODS) users across the institution.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.role == User.Role.PRINCIPAL:
            return request.method in permissions.SAFE_METHODS
        return request.user.role == User.Role.HOD

    def has_object_permission(self, request, view, obj):
        if request.user.role == User.Role.PRINCIPAL:
            return request.method in permissions.SAFE_METHODS
        if request.user.role == User.Role.HOD:
            # HOD can only manage users in their own department
            if request.user.department_id is None:
                return True
            return obj.department_id == request.user.department_id
        return False


def get_scoped_users(user, queryset=None):
    """
    Filter User queryset based on role:
    - PRINCIPAL: all users in institution
    - HOD: all users in their department
    - Others: only their own user record
    """
    if queryset is None:
        queryset = User.objects.all().select_related("department", "student_profile", "faculty_profile")

    if not user or not user.is_authenticated:
        return queryset.none()

    if user.role == User.Role.PRINCIPAL:
        return queryset

    if user.role == User.Role.HOD:
        if user.department_id:
            return queryset.filter(department_id=user.department_id)
        return queryset

    return queryset.filter(id=user.id)
