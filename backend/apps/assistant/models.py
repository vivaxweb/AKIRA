"""
AI Knowledge Assistant Models for Department Digital Hub.
Covers: KnowledgeDocument, ChatMessage
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.accounts.models import Department
from apps.communication.models import DepartmentDocument


class KnowledgeDocument(TimeStampedModel):
    class Category(models.TextChoices):
        ACADEMIC_REGULATION = "ACADEMIC_REGULATION", "Academic Regulations & Evaluation"
        SYLLABUS = "SYLLABUS", "Course Syllabus & Outcomes"
        PROJECT_GUIDELINES = "PROJECT_GUIDELINES", "Capstone Project Guidelines"
        PLACEMENT = "PLACEMENT", "Placement & Career Guidance"
        GENERAL = "GENERAL", "General Department Knowledge"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="knowledge_documents",
    )
    title = models.CharField(max_length=255)
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    content = models.TextField(help_text="Plain text or markdown content for retrieval")
    source_document = models.ForeignKey(
        DepartmentDocument,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_items",
    )
    tags = models.CharField(max_length=255, blank=True, default="", help_text="Comma-separated keywords")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["category", "title"]
        verbose_name = "Knowledge Document"
        verbose_name_plural = "Knowledge Documents"

    def __str__(self):
        return f"[{self.category}] {self.title}"


class ChatMessage(TimeStampedModel):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assistant_messages",
    )
    query = models.TextField()
    response = models.TextField()
    sources = models.JSONField(
        default=list,
        help_text="List of cited sources with title, category, and score",
    )
    mode = models.CharField(max_length=50, default="offline_extractive")
    tokens_used = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"

    def __str__(self):
        return f"{self.user.email} on {self.created_at.strftime('%Y-%m-%d %H:%M')}: {self.query[:30]}"
