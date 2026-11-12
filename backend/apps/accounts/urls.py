"""
Accounts resource URLs.
"""
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, DepartmentViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("departments", DepartmentViewSet, basename="department")

urlpatterns = router.urls
