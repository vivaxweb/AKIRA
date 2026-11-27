from django.urls import path

from .views import (
    AttendanceExportView,
    MarksExportView,
    StudentProgressPDFView,
    ExecutiveDashboardView,
)

urlpatterns = [
    path("reports/attendance-export/", AttendanceExportView.as_view(), name="attendance-export"),
    path("reports/marks-export/", MarksExportView.as_view(), name="marks-export"),
    path("reports/student-progress-pdf/", StudentProgressPDFView.as_view(), name="student-progress-pdf"),
    path("reports/executive-dashboard/", ExecutiveDashboardView.as_view(), name="executive-dashboard"),
]
