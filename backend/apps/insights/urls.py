from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.insights.views import (
    StudentRiskListView,
    StudentAnalyticsView,
    FacultyWorkloadView,
    InterventionViewSet,
)

router = DefaultRouter()
router.register("insights/interventions", InterventionViewSet, basename="intervention")

urlpatterns = [
    path("insights/student-risk/", StudentRiskListView.as_view(), name="student-risk"),
    path("insights/student-analytics/", StudentAnalyticsView.as_view(), name="student-analytics"),
    path("insights/faculty-workload/", FacultyWorkloadView.as_view(), name="faculty-workload"),
    path("", include(router.urls)),
]
