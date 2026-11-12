from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    KnowledgeDocumentViewSet,
    AssistantChatView,
    ChatHistoryView,
)

router = DefaultRouter()
router.register(r"assistant/documents", KnowledgeDocumentViewSet, basename="knowledge-document")

urlpatterns = [
    path("assistant/chat/", AssistantChatView.as_view(), name="assistant-chat"),
    path("assistant/history/", ChatHistoryView.as_view(), name="assistant-history"),
    path("", include(router.urls)),
]
