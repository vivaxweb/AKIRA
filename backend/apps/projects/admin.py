from django.contrib import admin
from .models import Project, ProjectMember, ProjectMilestone, SimilarityCheck


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 1
    autocomplete_fields = ["student"]


class ProjectMilestoneInline(admin.TabularInline):
    model = ProjectMilestone
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["title", "domain", "batch_year", "status", "guide", "team_leader", "created_at"]
    list_filter = ["status", "domain", "batch_year", "department"]
    search_fields = ["title", "abstract", "team_leader__first_name", "team_leader__last_name"]
    inlines = [ProjectMemberInline, ProjectMilestoneInline]


@admin.register(ProjectMilestone)
class ProjectMilestoneAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "order", "due_date", "is_completed", "guide_signed_off"]
    list_filter = ["is_completed", "guide_signed_off", "project__batch_year"]
    search_fields = ["title", "project__title"]


@admin.register(SimilarityCheck)
class SimilarityCheckAdmin(admin.ModelAdmin):
    list_display = ["input_title", "similarity_score", "matched_project", "checked_by", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["input_title", "input_abstract"]
    readonly_fields = ["created_at"]
