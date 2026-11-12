from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccreditationCriteriaViewSet,
    EvidenceLinkViewSet,
    AttendanceExportView,
    MarksExportView,
    COPOExportView,
    StudentProgressPDFView,
    ExecutiveDashboardView,
)

router = DefaultRouter()
router.register(r"reports/criteria", AccreditationCriteriaViewSet, basename="accreditation-criteria")
router.register(r"reports/evidence", EvidenceLinkViewSet, basename="evidence-link")

urlpatterns = [
    path("reports/attendance-export/", AttendanceExportView.as_view(), name="attendance-export"),
    path("reports/marks-export/", MarksExportView.as_view(), name="marks-export"),
    path("reports/copo-export/", COPOExportView.as_view(), name="copo-export"),
    path("reports/student-progress-pdf/", StudentProgressPDFView.as_view(), name="student-progress-pdf"),
    path("reports/executive-dashboard/", ExecutiveDashboardView.as_view(), name="executive-dashboard"),
    path("", include(router.urls)),
]
