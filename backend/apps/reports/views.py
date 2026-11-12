from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import User, StudentProfile, Department
from apps.academics.models import Subject, ClassGroup
from .models import AccreditationCriteria, EvidenceLink
from .serializers import (
    AccreditationCriteriaListSerializer,
    AccreditationCriteriaDetailSerializer,
    EvidenceLinkSerializer,
)
from .permissions import (
    CanManageAccreditation,
    CanExportAcademicReports,
    CanViewExecutiveDashboard,
)
from .services import (
    generate_attendance_excel,
    generate_marks_excel,
    generate_copo_attainment_excel,
    generate_student_progress_pdf,
    get_executive_dashboard_kpis,
)


class AccreditationCriteriaViewSet(viewsets.ModelViewSet):
    """
    CRUD for NBA/NAAC Accreditation Criteria.
    All authenticated users can view. HOD, Coordinator, Principal can create/edit.
    """
    queryset = AccreditationCriteria.objects.all().prefetch_related("evidences")
    permission_classes = [CanManageAccreditation]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["accreditation_body", "status", "department"]
    search_fields = ["code", "title", "description"]
    ordering_fields = ["code", "max_marks", "obtained_marks", "status", "created_at"]
    ordering = ["code"]

    def get_serializer_class(self):
        if self.action in ["retrieve", "update", "partial_update"]:
            return AccreditationCriteriaDetailSerializer
        return AccreditationCriteriaListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if hasattr(user, "department") and user.department:
            return qs.filter(department=user.department)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        dept = getattr(user, "department", None)
        if not dept:
            dept = Department.objects.first()
        serializer.save(department=dept)


class EvidenceLinkViewSet(viewsets.ModelViewSet):
    """
    CRUD for Criteria Evidence Links (linking documents, projects, or external URLs).
    """
    queryset = EvidenceLink.objects.all().select_related("criteria", "document", "project", "added_by")
    serializer_class = EvidenceLinkSerializer
    permission_classes = [CanManageAccreditation]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["criteria"]
    search_fields = ["title", "description"]


class AttendanceExportView(APIView):
    """
    Generates and downloads an Excel file for class/subject attendance matrix.
    Query params: ?subject_id=... OR ?class_group_id=...
    """
    permission_classes = [CanExportAcademicReports]

    def get(self, request, *args, **kwargs):
        subject_id = request.query_params.get("subject_id")
        class_group_id = request.query_params.get("class_group_id")

        if not subject_id and not class_group_id:
            return Response(
                {"detail": "Either subject_id or class_group_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if subject_id:
            subject = get_object_or_404(Subject, id=subject_id)
            filename = f"attendance_{subject.code}_{subject.class_group.name}.xlsx".replace(" ", "_")
            xlsx_data = generate_attendance_excel(subject_id=subject.id)
        else:
            class_group = get_object_or_404(ClassGroup, id=class_group_id)
            filename = f"attendance_class_{class_group.name}.xlsx".replace(" ", "_")
            xlsx_data = generate_attendance_excel(class_group_id=class_group.id)

        response = HttpResponse(
            xlsx_data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class MarksExportView(APIView):
    """
    Generates and downloads an Excel spreadsheet for internal marks evaluation.
    Query params: ?subject_id=...
    """
    permission_classes = [CanExportAcademicReports]

    def get(self, request, *args, **kwargs):
        subject_id = request.query_params.get("subject_id")
        if not subject_id:
            return Response(
                {"detail": "subject_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = get_object_or_404(Subject, id=subject_id)
        filename = f"cie_marks_{subject.code}_{subject.class_group.name}.xlsx".replace(" ", "_")
        xlsx_data = generate_marks_excel(subject_id=subject.id)

        response = HttpResponse(
            xlsx_data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class COPOExportView(APIView):
    """
    Generates and downloads an Excel workbook with Course Outcome Attainment
    and CO-PO Correlation Matrix.
    Query params: ?subject_id=...
    """
    permission_classes = [CanExportAcademicReports]

    def get(self, request, *args, **kwargs):
        subject_id = request.query_params.get("subject_id")
        if not subject_id:
            return Response(
                {"detail": "subject_id query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = get_object_or_404(Subject, id=subject_id)
        filename = f"copo_attainment_{subject.code}_{subject.class_group.name}.xlsx".replace(" ", "_")
        xlsx_data = generate_copo_attainment_excel(subject_id=subject.id)

        response = HttpResponse(
            xlsx_data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class StudentProgressPDFView(APIView):
    """
    Generates and returns an academic progress card PDF for a student.
    Students can access their own report. Staff can access any student's report.
    Query params: ?student_id=...
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        student_id = request.query_params.get("student_id")

        if user.role == User.Role.STUDENT:
            # Student can only access their own profile
            if not hasattr(user, "student_profile"):
                return Response(
                    {"detail": "Student profile not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            student_profile = user.student_profile
        else:
            if not student_id:
                return Response(
                    {"detail": "student_id query parameter is required for staff members."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            student_profile = get_object_or_404(StudentProfile, id=student_id)

        pdf_bytes = generate_student_progress_pdf(student_profile.id)
        filename = f"progress_report_{student_profile.roll_no}.pdf"

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class ExecutiveDashboardView(APIView):
    """
    Returns real-time executive dashboard KPIs for Principal, HOD, and Coordinators.
    """
    permission_classes = [CanViewExecutiveDashboard]

    def get(self, request, *args, **kwargs):
        dept_id = request.query_params.get("department_id")
        if not dept_id and hasattr(request.user, "department") and request.user.department:
            dept_id = request.user.department.id

        kpis = get_executive_dashboard_kpis(department_id=dept_id)
        return Response(kpis, status=status.HTTP_200_OK)
