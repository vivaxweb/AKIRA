"""
Academics URL routing.
"""
from rest_framework.routers import DefaultRouter
from .views import (
    ClassGroupViewSet,
    SubjectViewSet,
    SyllabusTopicViewSet,
    AttendanceSessionViewSet,
    AssessmentViewSet,
    MarkViewSet,
    ProgramOutcomeViewSet,
    CourseOutcomeViewSet,
    COPOMappingViewSet,
    AttainmentConfigViewSet,
    LogbookEntryViewSet,
)

router = DefaultRouter()
router.register("class-groups", ClassGroupViewSet, basename="class-group")
router.register("subjects", SubjectViewSet, basename="subject")
router.register("syllabus-topics", SyllabusTopicViewSet, basename="syllabus-topic")
router.register("attendance-sessions", AttendanceSessionViewSet, basename="attendance-session")
router.register("assessments", AssessmentViewSet, basename="assessment")
router.register("marks", MarkViewSet, basename="mark")
router.register("program-outcomes", ProgramOutcomeViewSet, basename="program-outcome")
router.register("course-outcomes", CourseOutcomeViewSet, basename="course-outcome")
router.register("co-po-mappings", COPOMappingViewSet, basename="co-po-mapping")
router.register("attainment-configs", AttainmentConfigViewSet, basename="attainment-config")
router.register("logbook-entries", LogbookEntryViewSet, basename="logbook-entry")

urlpatterns = router.urls
