"""
Permissions and queryset scoping for academics app.
"""
from rest_framework import permissions
from apps.accounts.models import User


class IsHODOrReadOnly(permissions.BasePermission):
    """Allows write operations only to HODs, read operations to authenticated users."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role == User.Role.HOD


class CanManageSubjectContent(permissions.BasePermission):
    """
    Allows faculty who teaches the subject (or HOD) to edit attendance, marks, syllabus, logbook.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == User.Role.HOD:
            return True
        if user.role == User.Role.PRINCIPAL:
            return request.method in permissions.SAFE_METHODS

        # Check if obj is a Subject or has a subject attribute
        subject = obj if hasattr(obj, "faculty") else getattr(obj, "subject", None)
        if not subject:
            return False

        if request.method in permissions.SAFE_METHODS:
            if user.role == User.Role.COORDINATOR:
                # Coordinator can view their coordinating class subjects
                if subject.class_group.coordinator_id == user.id:
                    return True
            if user.role == User.Role.STUDENT:
                # Students can view subjects of their class group
                student_profile = getattr(user, "student_profile", None)
                return student_profile and student_profile.class_group_id == subject.class_group_id

        return subject.faculty_id == user.id


class CanReviewLogbook(permissions.BasePermission):
    """Allows only HOD to add remarks to logbook entries."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.Role.HOD)
