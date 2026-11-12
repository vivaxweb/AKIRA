from django.db import models
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.models import User
from .models import Notice, DepartmentEvent, DepartmentDocument
from .serializers import (
    NoticeSerializer,
    DepartmentEventSerializer,
    DepartmentDocumentSerializer,
)
from .permissions import CanPublishNotice, CanManageEvents, CanUploadDocument


class NoticeViewSet(viewsets.ModelViewSet):
    serializer_class = NoticeSerializer
    permission_classes = [CanPublishNotice]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "priority", "is_pinned"]
    search_fields = ["title", "content"]
    ordering_fields = ["created_at", "priority", "is_pinned"]
    ordering = ["-is_pinned", "-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Notice.objects.select_related("published_by", "department")
        if user.is_authenticated and user.department_id:
            qs = qs.filter(department=user.department)

        # Exclude expired notices if requested
        include_expired = self.request.query_params.get("include_expired", "false")
        if include_expired.lower() not in ["true", "1"]:
            qs = qs.filter(
                models.Q(expires_at__isnull=True) | models.Q(expires_at__gte=timezone.now().date())
            )

        # Filter by role visibility for non-admins
        if user.is_authenticated and user.role not in [User.Role.HOD, User.Role.PRINCIPAL]:
            # Either target_roles is empty [] or contains user.role
            qs = [
                n for n in qs
                if not n.target_roles or user.role in n.target_roles
            ]
            # Convert back to queryset or list
            n_ids = [n.id for n in qs]
            return Notice.objects.filter(id__in=n_ids).select_related("published_by", "department")

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(published_by=user, department=user.department)


class DepartmentEventViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentEventSerializer
    permission_classes = [CanManageEvents]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["event_type"]
    search_fields = ["title", "description", "location"]
    ordering_fields = ["start_datetime"]
    ordering = ["start_datetime"]

    def get_queryset(self):
        user = self.request.user
        qs = DepartmentEvent.objects.select_related("organizer", "department")
        if user.is_authenticated and user.department_id:
            qs = qs.filter(department=user.department)

        # Optional date range filtering
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")
        if start_date:
            qs = qs.filter(start_datetime__gte=start_date)
        if end_date:
            qs = qs.filter(start_datetime__lte=end_date)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(organizer=user, department=user.department)


class DepartmentDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentDocumentSerializer
    permission_classes = [CanUploadDocument]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category"]
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "title", "download_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = DepartmentDocument.objects.select_related("uploaded_by", "department")
        if user.is_authenticated and user.department_id:
            qs = qs.filter(department=user.department)

        # Filter by role permissions for students/faculty
        if user.is_authenticated and user.role not in [User.Role.HOD, User.Role.PRINCIPAL]:
            docs = [
                d for d in qs
                if not d.allowed_roles or user.role in d.allowed_roles
            ]
            d_ids = [d.id for d in docs]
            return DepartmentDocument.objects.filter(id__in=d_ids).select_related("uploaded_by", "department")

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(uploaded_by=user, department=user.department)

    @action(detail=True, methods=["post"], url_path="download")
    def record_download(self, request, pk=None):
        doc = self.get_object()
        doc.download_count = models.F("download_count") + 1
        doc.save(update_fields=["download_count"])
        doc.refresh_from_db()
        return Response({
            "download_count": doc.download_count,
            "file_url": doc.file.url if doc.file else "",
        })
