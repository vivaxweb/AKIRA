from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsHOD, IsPrincipal
from apps.insights.models import Intervention
from apps.insights.serializers import (
    InterventionSerializer,
    ResolveInterventionSerializer,
)
from apps.insights.services import (
    get_students_risk_list,
    get_student_analytics_summary,
    get_faculty_workload_analytics,
)


class CanAccessInsights(IsAuthenticated):
    """Allows staff (Principal, HOD, Faculty, Coordinator) to access academic insights."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role in ["PRINCIPAL", "HOD", "FACULTY", "COORDINATOR"]


class StudentRiskListView(APIView):
    """
    Returns classified academic risk profiles for students in the department.
    Query parameters:
    - class_group_id: ID of ClassGroup
    - risk_level: HIGH, MEDIUM, LOW
    - search: student name or roll number
    """
    permission_classes = [CanAccessInsights]

    def get(self, request):
        class_group_id = request.query_params.get("class_group_id")
        risk_level = request.query_params.get("risk_level")
        search = request.query_params.get("search")

        if class_group_id:
            try:
                class_group_id = int(class_group_id)
            except ValueError:
                class_group_id = None

        data = get_students_risk_list(
            class_group_id=class_group_id,
            risk_level=risk_level,
            search=search,
        )
        return Response(data, status=status.HTTP_200_OK)


class StudentAnalyticsView(APIView):
    """
    Returns aggregate performance metrics, correlation data, and assessment trends.
    Students can access their own individual analytics.
    Staff can view class aggregates and any student's deep-dive.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        class_group_id = request.query_params.get("class_group_id")
        student_id = request.query_params.get("student_id")

        if user.role == "STUDENT":
            # Force student to view only their own analytics
            student_id = user.id

        if class_group_id:
            try:
                class_group_id = int(class_group_id)
            except ValueError:
                class_group_id = None

        if student_id:
            try:
                student_id = int(student_id)
            except ValueError:
                student_id = None

        data = get_student_analytics_summary(
            class_group_id=class_group_id,
            student_id=student_id,
        )

        if data is None:
            return Response(
                {"detail": "Student or analytics not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(data, status=status.HTTP_200_OK)


class FacultyWorkloadView(APIView):
    """
    Returns faculty workload distribution, syllabus coverage pace, and logbook compliance.
    """
    permission_classes = [CanAccessInsights]

    def get(self, request):
        dept = getattr(request.user, "department", None)
        data = get_faculty_workload_analytics(department=dept)
        return Response(data, status=status.HTTP_200_OK)


class InterventionViewSet(viewsets.ModelViewSet):
    """
    CRUD API for Student Interventions (Counseling, Remedial, Parent-Teacher Meeting).
    """
    serializer_class = InterventionSerializer
    permission_classes = [CanAccessInsights]

    def get_queryset(self):
        qs = Intervention.objects.all().select_related("student", "created_by")
        student_id = self.request.query_params.get("student")
        if student_id:
            qs = qs.filter(student_id=student_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
        return qs

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Marks an intervention as resolved or updated with action taken."""
        intervention = self.get_object()
        serializer = ResolveInterventionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        intervention.action_taken = serializer.validated_data["action_taken"]
        intervention.status = serializer.validated_data.get("status", "RESOLVED")
        if intervention.status == "RESOLVED":
            intervention.resolved_at = timezone.now()
        intervention.save()

        return Response(
            InterventionSerializer(intervention, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
