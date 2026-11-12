from django.contrib import admin
from .models import AccreditationCriteria, EvidenceLink


class EvidenceLinkInline(admin.TabularInline):
    model = EvidenceLink
    extra = 1


@admin.register(AccreditationCriteria)
class AccreditationCriteriaAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "accreditation_body", "max_marks", "obtained_marks", "status", "department"]
    list_filter = ["accreditation_body", "status", "department"]
    search_fields = ["code", "title", "description"]
    inlines = [EvidenceLinkInline]


@admin.register(EvidenceLink)
class EvidenceLinkAdmin(admin.ModelAdmin):
    list_display = ["title", "criteria", "document", "project", "external_url", "added_by", "created_at"]
    list_filter = ["criteria__accreditation_body", "criteria__status"]
    search_fields = ["title", "description", "criteria__code", "criteria__title"]
