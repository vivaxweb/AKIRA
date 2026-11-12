"""API v1 URL router."""
from django.urls import path, include

urlpatterns = [
    # Health
    path("", include("apps.core.urls")),
    # Auth
    path("auth/", include("apps.accounts.auth_urls")),
    # Resources
    path("", include("apps.accounts.urls")),
    path("", include("apps.academics.urls")),
    path("", include("apps.insights.urls")),
    path("", include("apps.projects.urls")),
    path("", include("apps.communication.urls")),
    path("", include("apps.assistant.urls")),
    path("", include("apps.reports.urls")),
]
