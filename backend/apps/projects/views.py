from django.db import models
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import User
from .models import Project, ProjectMember, ProjectMilestone, SimilarityCheck
from .serializers import (
    ProjectListSerializer,
    ProjectDetailSerializer,
    ProjectMilestoneSerializer,
    SimilarityCheckRequestSerializer,
    SimilarityCheckResponseSerializer,
)
from .permissions import CanManageProject, CanSignOffMilestone
from .similarity import check_project_similarity


class ProjectViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageProject]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["domain", "batch_year", "status", "guide"]
    search_fields = ["title", "abstract", "team_leader__first_name", "team_leader__last_name"]
    ordering_fields = ["batch_year", "created_at", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Project.objects.select_related(
            "team_leader",
            "guide",
            "department",
        ).prefetch_related("members__student", "milestones")

        # Department scoping
        user = self.request.user
        if user.is_authenticated and user.department_id:
            qs = qs.filter(department=user.department)

        # "My Projects" filter
        my_projects = self.request.query_params.get("my_projects")
        if my_projects and my_projects.lower() in ["true", "1"]:
            qs = qs.filter(
                models.Q(team_leader=user) |
                models.Q(members__student=user) |
                models.Q(guide=user)
            ).distinct()

        return qs

    def get_serializer_class(self):
        if self.action in ["list"]:
            return ProjectListSerializer
        return ProjectDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        dept = user.department
        # If student creates, they are always the team leader
        if user.role == User.Role.STUDENT or "team_leader" not in serializer.validated_data:
            serializer.save(team_leader=user, department=dept)
        else:
            serializer.save(department=dept)

    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        project = self.get_object()
        user = request.user

        # Only Faculty Guide, HOD, or Principal can change project status
        if user.role not in [User.Role.HOD, User.Role.PRINCIPAL] and project.guide_id != user.id:
            return Response(
                {"detail": "Only the assigned guide, HOD, or Principal can change project status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_status = request.data.get("status")
        if new_status not in dict(Project.Status.choices):
            return Response(
                {"detail": f"Invalid status '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.status = new_status
        if new_status == Project.Status.REJECTED:
            project.rejection_reason = request.data.get("rejection_reason", "")
        project.save(update_fields=["status", "rejection_reason", "updated_at"])

        return Response(ProjectDetailSerializer(project).data)

    @action(detail=True, methods=["post"], url_path="assign-guide")
    def assign_guide(self, request, pk=None):
        project = self.get_object()
        user = request.user

        if user.role not in [User.Role.HOD, User.Role.PRINCIPAL]:
            return Response(
                {"detail": "Only HOD or Principal can assign guides."},
                status=status.HTTP_403_FORBIDDEN,
            )

        guide_id = request.data.get("guide_id")
        if guide_id:
            try:
                guide_user = User.objects.get(id=guide_id, role__in=[User.Role.FACULTY, User.Role.HOD])
                project.guide = guide_user
            except User.DoesNotExist:
                return Response({"detail": "Invalid faculty guide."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            project.guide = None

        project.save(update_fields=["guide", "updated_at"])
        return Response(ProjectDetailSerializer(project).data)


class ProjectMilestoneViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectMilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = ProjectMilestone.objects.select_related("project")
        project_id = self.request.query_params.get("project_id")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=["post"], url_path="toggle-complete")
    def toggle_complete(self, request, pk=None):
        milestone = self.get_object()
        project = milestone.project
        user = request.user

        # Members, leader, guide, HOD, principal can toggle completion
        is_member = project.members.filter(student=user).exists() or project.team_leader_id == user.id
        is_staff = user.role in [User.Role.FACULTY, User.Role.HOD, User.Role.PRINCIPAL]

        if not (is_member or is_staff):
            return Response(
                {"detail": "You do not have permission to modify this milestone."},
                status=status.HTTP_403_FORBIDDEN,
            )

        milestone.is_completed = not milestone.is_completed
        milestone.completed_at = timezone.now() if milestone.is_completed else None
        milestone.save(update_fields=["is_completed", "completed_at"])

        return Response(ProjectMilestoneSerializer(milestone).data)

    @action(detail=True, methods=["post"], url_path="sign-off", permission_classes=[CanSignOffMilestone])
    def sign_off(self, request, pk=None):
        milestone = self.get_object()
        signed_off = request.data.get("signed_off", True)
        remarks = request.data.get("remarks", "")

        milestone.guide_signed_off = bool(signed_off)
        milestone.signed_off_at = timezone.now() if milestone.guide_signed_off else None
        if remarks:
            milestone.guide_remarks = remarks
        milestone.save(update_fields=["guide_signed_off", "signed_off_at", "guide_remarks"])

        return Response(ProjectMilestoneSerializer(milestone).data)


class SimilarityCheckView(APIView):
    """
    POST /api/v1/projects/similarity-check/
    Calculates duplicate similarity using TF-IDF and Cosine Similarity
    against existing proposals in the repository.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        req_serializer = SimilarityCheckRequestSerializer(data=request.data)
        req_serializer.is_valid(raise_exception=True)

        title = req_serializer.validated_data["title"]
        abstract = req_serializer.validated_data["abstract"]
        exclude_id = req_serializer.validated_data.get("exclude_project_id")

        result = check_project_similarity(
            title=title,
            abstract=abstract,
            exclude_project_id=exclude_id,
        )

        # Log check
        matched_obj = None
        if result["matched_project_id"]:
            matched_obj = Project.objects.filter(id=result["matched_project_id"]).first()

        SimilarityCheck.objects.create(
            checked_by=request.user,
            input_title=title,
            input_abstract=abstract,
            similarity_score=result["max_score"],
            matched_project=matched_obj,
            match_details={"top_matches": result["top_matches"]},
        )

        resp_serializer = SimilarityCheckResponseSerializer(data=result)
        resp_serializer.is_valid()
        return Response(resp_serializer.data, status=status.HTTP_200_OK)
