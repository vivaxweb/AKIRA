from rest_framework import permissions
from apps.accounts.models import User


class CanManageProject(permissions.BasePermission):
    """
    HOD and Principal have full management rights.
    Guides have review rights on their assigned projects.
    Students can edit only if they lead the project and it's in PROPOSED or UNDER_REVIEW status.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Safe methods (GET, HEAD, OPTIONS) allowed for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Principal & HOD can manage everything
        if request.user.role in [User.Role.HOD, User.Role.PRINCIPAL]:
            return True

        # Guide can update their assigned project
        if obj.guide_id == request.user.id:
            return True

        # Student team leader can update only during proposal/under review
        if obj.team_leader_id == request.user.id and obj.status in [
            obj.Status.PROPOSED,
            obj.Status.UNDER_REVIEW,
        ]:
            return True

        return False


class CanSignOffMilestone(permissions.BasePermission):
    """
    Only assigned Guide, HOD, or Principal can sign off project milestones.
    Students cannot sign off their own milestones.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        # HOD / Principal can always sign off
        if request.user.role in [User.Role.HOD, User.Role.PRINCIPAL]:
            return True

        # The assigned guide can sign off
        if obj.project.guide_id == request.user.id:
            return True

        return False
