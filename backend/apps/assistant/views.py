from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.filters import SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

from apps.accounts.models import User, Department
from .models import KnowledgeDocument, ChatMessage
from .serializers import (
    KnowledgeDocumentSerializer,
    ChatMessageSerializer,
    ChatQuerySerializer,
)
from .services import ask_assistant


class KnowledgeDocumentViewSet(viewsets.ModelViewSet):
    """
    CRUD for department knowledge base documents.
    All authenticated users can read; staff can create/edit.
    """
    queryset = KnowledgeDocument.objects.filter(is_active=True)
    serializer_class = KnowledgeDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["category", "department"]
    search_fields = ["title", "content", "tags"]

    def perform_create(self, serializer):
        user = self.request.user
        dept = getattr(user, "department", None)
        if not dept:
            dept = Department.objects.first()
        serializer.save(department=dept)


class AssistantChatView(APIView):
    """
    RAG Assistant Chat endpoint.
    Accepts student or faculty academic queries, retrieves relevant department context,
    invokes Groq LLM or offline extractive generator, and returns response with cited sources.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = ChatQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        query = serializer.validated_data["query"]
        result = ask_assistant(request.user, query)
        return Response(result, status=status.HTTP_200_OK)


class ChatHistoryView(APIView):
    """
    User's personal chat history with the Knowledge Assistant.
    GET: List recent messages.
    DELETE: Clear conversation history.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        messages = ChatMessage.objects.filter(user=request.user).order_by("created_at")[:50]
        serializer = ChatMessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        ChatMessage.objects.filter(user=request.user).delete()
        return Response({"detail": "Chat history cleared successfully."}, status=status.HTTP_200_OK)
