from django.contrib import admin
from apps.insights.models import Intervention


@admin.register(Intervention)
class InterventionAdmin(admin.ModelAdmin):
    list_display = [
        "student",
        "intervention_type",
        "status",
        "created_by",
        "created_at",
        "resolved_at",
    ]
    list_filter = ["intervention_type", "status", "created_at"]
    search_fields = ["student__first_name", "student__last_name", "student__email", "remarks", "action_taken"]
    readonly_fields = ["created_at", "updated_at"]
