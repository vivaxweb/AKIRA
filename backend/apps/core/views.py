"""Core views — health check and shared base views."""
import django
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class HealthView(APIView):
    """
    GET /api/v1/health/
    Public endpoint. Returns 200 with version info.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({
            "status": "ok",
            "django_version": django.get_version(),
            "service": "Department Digital Hub API",
            "version": "1.0.0",
        })
