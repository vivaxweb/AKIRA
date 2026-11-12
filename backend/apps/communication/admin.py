from django.contrib import admin
from .models import Notice, DepartmentEvent, DepartmentDocument


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "priority", "is_pinned", "published_by", "created_at"]
    list_filter = ["category", "priority", "is_pinned", "department"]
    search_fields = ["title", "content"]


@admin.register(DepartmentEvent)
class DepartmentEventAdmin(admin.ModelAdmin):
    list_display = ["title", "event_type", "start_datetime", "location", "organizer"]
    list_filter = ["event_type", "department"]
    search_fields = ["title", "description", "location"]


@admin.register(DepartmentDocument)
class DepartmentDocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "version", "file_type", "download_count", "uploaded_by", "created_at"]
    list_filter = ["category", "file_type", "department"]
    search_fields = ["title", "description"]
