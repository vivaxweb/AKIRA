from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ProjectMilestoneViewSet, SimilarityCheckView

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")
router.register(r"project-milestones", ProjectMilestoneViewSet, basename="project-milestone")

urlpatterns = [
    path("projects/similarity-check/", SimilarityCheckView.as_view(), name="project-similarity-check"),
    path("", include(router.urls)),
]
