from rest_framework import permissions
from apps.accounts.models import User


class CanPublishNotice(permissions.BasePermission):
    """
    Staff members (HOD, Principal, Faculty, Coordinator) can publish and edit notices.
    Students have read-only access.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in [
            User.Role.HOD,
            User.Role.PRINCIPAL,
            User.Role.FACULTY,
            User.Role.COORDINATOR,
        ]

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.role in [User.Role.HOD, User.Role.PRINCIPAL]:
            return True
        return obj.published_by_id == request.user.id


class CanManageEvents(permissions.BasePermission):
    """
    Staff members can schedule and edit department events.
    Students have read-only access.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in [
            User.Role.HOD,
            User.Role.PRINCIPAL,
            User.Role.FACULTY,
            User.Role.COORDINATOR,
        ]

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.role in [User.Role.HOD, User.Role.PRINCIPAL]:
            return True
        return obj.organizer_id == request.user.id


class CanUploadDocument(permissions.BasePermission):
    """
    Staff members can upload and edit documents.
    All users with role access to the document can view or download it.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS or getattr(view, "action", None) == "record_download":
            return True
        return request.user.role in [
            User.Role.HOD,
            User.Role.PRINCIPAL,
            User.Role.FACULTY,
            User.Role.COORDINATOR,
        ]

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS or getattr(view, "action", None) == "record_download":
            # Check role access on document
            if not obj.allowed_roles:
                return True
            return request.user.role in obj.allowed_roles

        if request.user.role in [User.Role.HOD, User.Role.PRINCIPAL]:
            return True
        return obj.uploaded_by_id == request.user.id
