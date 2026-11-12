"""
Views and ViewSets for Academic Operations.
Includes bulk attendance marking, marks spreadsheets, syllabus coverage,
digital logbook, and CO-PO attainment calculation endpoints.
"""
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    ClassGroup,
    Subject,
    SyllabusTopic,
    TopicCoverage,
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Mark,
    ProgramOutcome,
    CourseOutcome,
    COPOMapping,
    AttainmentConfig,
    LogbookEntry,
)
from .serializers import (
    ClassGroupSerializer,
    SubjectSerializer,
    SyllabusTopicSerializer,
    TopicCoverageSerializer,
    AttendanceSessionSerializer,
    AttendanceBulkSaveSerializer,
    AssessmentSerializer,
    MarkSerializer,
    MarksBulkSaveSerializer,
    ProgramOutcomeSerializer,
    CourseOutcomeSerializer,
    COPOMappingSerializer,
    AttainmentConfigSerializer,
    LogbookEntrySerializer,
    LogbookReviewSerializer,
)
from .services import (
    compute_co_attainment,
    compute_po_attainment,
    compute_student_attendance_summary,
)
from apps.accounts.models import User, StudentProfile


class ClassGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClassGroupSerializer
    filterset_fields = ["department", "year", "academic_year"]
    search_fields = ["name", "division"]

    def get_queryset(self):
        user = self.request.user
        qs = ClassGroup.objects.all().select_related("department", "coordinator")
        if user.role == User.Role.PRINCIPAL:
            return qs
        if user.role == User.Role.HOD and user.department_id:
            return qs.filter(department_id=user.department_id)
        if user.role == User.Role.COORDINATOR:
            return qs.filter(coordinator=user)
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return qs.filter(id=user.student_profile.class_group_id)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.HOD:
            raise PermissionDenied("Only HOD can create class groups.")
        dept = self.request.user.department
        serializer.save(department=dept)


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    filterset_fields = ["class_group", "faculty", "is_active"]
    search_fields = ["code", "name"]

    def get_queryset(self):
        user = self.request.user
        qs = Subject.objects.all().select_related("class_group", "class_group__department", "faculty")
        if user.role == User.Role.PRINCIPAL:
            return qs
        if user.role == User.Role.HOD:
            if user.department_id:
                return qs.filter(class_group__department_id=user.department_id)
            return qs
        if user.role == User.Role.COORDINATOR:
            return qs.filter(
                class_group__coordinator_id=user.id
            ) | qs.filter(faculty_id=user.id)
        if user.role == User.Role.FACULTY:
            return qs.filter(faculty_id=user.id)
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return qs.filter(class_group_id=user.student_profile.class_group_id)
        return qs.none()

    def perform_create(self, serializer):
        if self.request.user.role != User.Role.HOD:
            raise PermissionDenied("Only HOD can create subjects.")
        serializer.save()

    @action(detail=True, methods=["get"], url_path="co-attainment")
    def co_attainment(self, request, pk=None):
        subject = self.get_object()
        data = compute_co_attainment(subject)
        return Response(data)

    @action(detail=True, methods=["get"], url_path="po-attainment")
    def po_attainment(self, request, pk=None):
        subject = self.get_object()
        data = compute_po_attainment(subject)
        return Response(data)


class SyllabusTopicViewSet(viewsets.ModelViewSet):
    serializer_class = SyllabusTopicSerializer
    filterset_fields = ["subject", "unit_no"]
    ordering_fields = ["unit_no", "order"]

    def get_queryset(self):
        return SyllabusTopic.objects.all().select_related("coverage", "coverage__covered_by")

    @action(detail=True, methods=["post"], url_path="mark-covered")
    def mark_covered(self, request, pk=None):
        topic = self.get_object()
        if request.user.role not in (User.Role.FACULTY, User.Role.COORDINATOR, User.Role.HOD):
            raise PermissionDenied("Only faculty can mark syllabus coverage.")
        if request.user.role in (User.Role.FACULTY, User.Role.COORDINATOR) and topic.subject.faculty_id != request.user.id:
            raise PermissionDenied("You can only mark coverage for your own subjects.")

        covered_on_str = request.data.get("covered_on", date.today().isoformat())
        remarks = request.data.get("remarks", "")

        coverage, _ = TopicCoverage.objects.update_or_create(
            topic=topic,
            defaults={
                "covered_on": covered_on_str,
                "covered_by": request.user,
                "remarks": remarks,
            },
        )
        return Response(TopicCoverageSerializer(coverage).data, status=status.HTTP_200_OK)


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSessionSerializer
    filterset_fields = ["subject", "date", "kind"]
    ordering_fields = ["date", "slot"]

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceSession.objects.all().select_related("subject", "topic", "marked_by").prefetch_related("records", "records__student", "records__student__user")
        if user.role == User.Role.PRINCIPAL:
            return qs
        if user.role == User.Role.HOD:
            if user.department_id:
                return qs.filter(subject__class_group__department_id=user.department_id)
            return qs
        if user.role == User.Role.COORDINATOR:
            return qs.filter(subject__class_group__coordinator_id=user.id) | qs.filter(subject__faculty_id=user.id)
        if user.role == User.Role.FACULTY:
            return qs.filter(subject__faculty_id=user.id)
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return qs.filter(subject__class_group_id=user.student_profile.class_group_id)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        subject = serializer.validated_data["subject"]
        if user.role not in (User.Role.HOD, User.Role.PRINCIPAL) and subject.faculty_id != user.id:
            raise PermissionDenied("You can only take attendance for your own subject.")
        serializer.save(marked_by=user)

    @action(detail=False, methods=["post"], url_path="bulk-save")
    def bulk_save_records(self, request):
        """
        Saves student attendance records in a single transactional batch.
        Uses bulk_create / bulk_update inside transaction.atomic().
        """
        serializer = AttendanceBulkSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data["session_id"]
        records_data = serializer.validated_data["records"]

        try:
            session = AttendanceSession.objects.select_related("subject").get(id=session_id)
        except AttendanceSession.DoesNotExist:
            return Response({"detail": "Attendance session not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role not in (User.Role.HOD, User.Role.PRINCIPAL) and session.subject.faculty_id != user.id:
            raise PermissionDenied("You can only mark attendance for your own subjects.")

        student_ids = [r["student_id"] for r in records_data]
        existing_records = {
            rec.student_id: rec
            for rec in AttendanceRecord.objects.filter(session=session, student_id__in=student_ids)
        }

        to_create = []
        to_update = []

        with transaction.atomic():
            for item in records_data:
                sid = item["student_id"]
                new_status = item["status"]

                if sid in existing_records:
                    rec = existing_records[sid]
                    rec.status = new_status
                    to_update.append(rec)
                else:
                    to_create.append(
                        AttendanceRecord(session=session, student_id=sid, status=new_status)
                    )

            if to_create:
                AttendanceRecord.objects.bulk_create(to_create)
            if to_update:
                AttendanceRecord.objects.bulk_update(to_update, ["status"])

        return Response(
            {
                "detail": "Attendance records saved successfully.",
                "created_count": len(to_create),
                "updated_count": len(to_update),
                "total_records": len(to_create) + len(to_update),
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="student-summary")
    def student_summary(self, request):
        """
        Returns student attendance percentage across subjects.
        Students can view their own; faculty/HOD can view any student in their scope.
        """
        user = request.user
        student_id = request.query_params.get("student_id")
        subject_id = request.query_params.get("subject_id")

        if user.role == User.Role.STUDENT:
            if not hasattr(user, "student_profile"):
                return Response({"detail": "Student profile not found."}, status=status.HTTP_404_NOT_FOUND)
            student = user.student_profile
        else:
            if not student_id:
                return Response({"detail": "student_id parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                student = StudentProfile.objects.get(id=student_id)
            except StudentProfile.DoesNotExist:
                return Response({"detail": "Student not found."}, status=status.HTTP_404_NOT_FOUND)

        subject = None
        if subject_id:
            try:
                subject = Subject.objects.get(id=subject_id)
            except Subject.DoesNotExist:
                return Response({"detail": "Subject not found."}, status=status.HTTP_404_NOT_FOUND)

        data = compute_student_attendance_summary(student, subject)
        return Response(data)


class AssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssessmentSerializer
    filterset_fields = ["subject", "kind", "is_published"]

    def get_queryset(self):
        user = self.request.user
        qs = Assessment.objects.all().select_related("subject", "subject__class_group").prefetch_related("co_links", "co_links__course_outcome")
        if user.role == User.Role.PRINCIPAL:
            return qs
        if user.role == User.Role.HOD:
            if user.department_id:
                return qs.filter(subject__class_group__department_id=user.department_id)
            return qs
        if user.role == User.Role.COORDINATOR:
            return qs.filter(subject__class_group__coordinator_id=user.id) | qs.filter(subject__faculty_id=user.id)
        if user.role == User.Role.FACULTY:
            return qs.filter(subject__faculty_id=user.id)
        if user.role == User.Role.STUDENT:
            # Students ONLY see published assessments
            student_profile = getattr(user, "student_profile", None)
            if student_profile:
                return qs.filter(subject__class_group_id=student_profile.class_group_id, is_published=True)
            return qs.none()
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        subject = serializer.validated_data["subject"]
        if user.role not in (User.Role.HOD, User.Role.PRINCIPAL) and subject.faculty_id != user.id:
            raise PermissionDenied("You can only create assessments for your own subjects.")
        serializer.save()

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, pk=None):
        assessment = self.get_object()
        user = request.user
        if user.role not in (User.Role.HOD, User.Role.PRINCIPAL) and assessment.subject.faculty_id != user.id:
            raise PermissionDenied("You can only publish assessments for your own subjects.")
        assessment.is_published = True
        assessment.save()
        return Response({"detail": "Assessment published successfully.", "is_published": True})

    @action(detail=False, methods=["post"], url_path="bulk-save-marks")
    def bulk_save_marks(self, request):
        """
        Saves assessment marks in a single atomic transaction.
        Validates 0 <= marks <= max_marks.
        """
        serializer = MarksBulkSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assessment_id = serializer.validated_data["assessment_id"]
        marks_data = serializer.validated_data["marks"]

        try:
            assessment = Assessment.objects.select_related("subject").get(id=assessment_id)
        except Assessment.DoesNotExist:
            return Response({"detail": "Assessment not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role not in (User.Role.HOD, User.Role.PRINCIPAL) and assessment.subject.faculty_id != user.id:
            raise PermissionDenied("You can only enter marks for your own subjects.")

        student_ids = [m["student_id"] for m in marks_data]
        existing_marks = {
            m.student_id: m
            for m in Mark.objects.filter(assessment=assessment, student_id__in=student_ids)
        }

        to_create = []
        to_update = []
        validation_errors = []

        for item in marks_data:
            sid = item["student_id"]
            obtained = item.get("marks_obtained")
            is_absent = item.get("is_absent", False)

            if not is_absent and obtained is not None:
                if obtained < Decimal("0.00"):
                    validation_errors.append(f"Student {sid}: Marks cannot be negative.")
                elif obtained > assessment.max_marks:
                    validation_errors.append(
                        f"Student {sid}: Marks ({obtained}) exceed max marks ({assessment.max_marks})."
                    )

            final_marks = Decimal("0.00") if is_absent else obtained

            if sid in existing_marks:
                m = existing_marks[sid]
                m.marks_obtained = final_marks
                m.is_absent = is_absent
                to_update.append(m)
            else:
                to_create.append(
                    Mark(
                        assessment=assessment,
                        student_id=sid,
                        marks_obtained=final_marks,
                        is_absent=is_absent,
                    )
                )

        if validation_errors:
            return Response(
                {"detail": "Marks validation failed.", "errors": validation_errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if to_create:
                Mark.objects.bulk_create(to_create)
            if to_update:
                Mark.objects.bulk_update(to_update, ["marks_obtained", "is_absent"])

        return Response(
            {
                "detail": "Marks saved successfully.",
                "created_count": len(to_create),
                "updated_count": len(to_update),
                "total_records": len(to_create) + len(to_update),
            },
            status=status.HTTP_200_OK,
        )


class MarkViewSet(viewsets.ModelViewSet):
    serializer_class = MarkSerializer
    filterset_fields = ["assessment", "student"]

    def get_queryset(self):
        user = self.request.user
        qs = Mark.objects.all().select_related("assessment", "student", "student__user")
        if user.role == User.Role.STUDENT and hasattr(user, "student_profile"):
            return qs.filter(student=user.student_profile, assessment__is_published=True)
        return qs


class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramOutcomeSerializer
    filterset_fields = ["department"]

    def get_queryset(self):
        return ProgramOutcome.objects.all()


class CourseOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = CourseOutcomeSerializer
    filterset_fields = ["subject"]

    def get_queryset(self):
        return CourseOutcome.objects.all().select_related("subject")


class COPOMappingViewSet(viewsets.ModelViewSet):
    serializer_class = COPOMappingSerializer
    filterset_fields = ["course_outcome", "program_outcome"]

    def get_queryset(self):
        return COPOMapping.objects.all().select_related("course_outcome", "program_outcome")


class AttainmentConfigViewSet(viewsets.ModelViewSet):
    serializer_class = AttainmentConfigSerializer
    filterset_fields = ["department"]

    def get_queryset(self):
        return AttainmentConfig.objects.all()


class LogbookEntryViewSet(viewsets.ModelViewSet):
    serializer_class = LogbookEntrySerializer
    filterset_fields = ["subject", "faculty", "date"]
    ordering_fields = ["date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = LogbookEntry.objects.all().select_related("subject", "faculty")
        if user.role == User.Role.PRINCIPAL:
            return qs
        if user.role == User.Role.HOD:
            if user.department_id:
                return qs.filter(subject__class_group__department_id=user.department_id)
            return qs
        if user.role in (User.Role.FACULTY, User.Role.COORDINATOR):
            return qs.filter(faculty=user)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in (User.Role.FACULTY, User.Role.COORDINATOR, User.Role.HOD):
            raise PermissionDenied("Only faculty or HOD can add logbook entries.")
        serializer.save(faculty=user)

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request, pk=None):
        entry = self.get_object()
        if request.user.role != User.Role.HOD:
            raise PermissionDenied("Only HOD can review logbook entries.")
        serializer = LogbookReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entry.hod_remark = serializer.validated_data["hod_remark"]
        entry.hod_reviewed_at = timezone.now()
        entry.save()
        return Response(LogbookEntrySerializer(entry).data)
