from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NoticeViewSet, DepartmentEventViewSet, DepartmentDocumentViewSet

router = DefaultRouter()
router.register(r"communication/notices", NoticeViewSet, basename="notice")
router.register(r"communication/events", DepartmentEventViewSet, basename="event")
router.register(r"communication/documents", DepartmentDocumentViewSet, basename="document")

urlpatterns = [
    path("", include(router.urls)),
]
