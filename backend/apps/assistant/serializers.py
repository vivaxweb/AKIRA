from rest_framework import serializers
from .models import KnowledgeDocument, ChatMessage


class KnowledgeDocumentSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = KnowledgeDocument
        fields = [
            "id",
            "department",
            "title",
            "category",
            "category_display",
            "content",
            "tags",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "department", "created_at", "updated_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "user",
            "user_email",
            "query",
            "response",
            "sources",
            "mode",
            "created_at",
        ]
        read_only_fields = ["id", "user", "response", "sources", "mode", "created_at"]


class ChatQuerySerializer(serializers.Serializer):
    query = serializers.CharField(max_length=2000, required=True)
