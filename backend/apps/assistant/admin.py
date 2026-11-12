from django.contrib import admin
from .models import KnowledgeDocument, ChatMessage


@admin.register(KnowledgeDocument)
class KnowledgeDocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "department", "is_active", "created_at"]
    list_filter = ["category", "is_active", "department"]
    search_fields = ["title", "content", "tags"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["user", "query_snippet", "mode", "created_at"]
    list_filter = ["mode", "created_at"]
    search_fields = ["query", "response", "user__email"]

    def query_snippet(self, obj):
        return obj.query[:50]
