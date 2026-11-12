"""
Django admin configuration for academics app.
"""
from django.contrib import admin
from .models import (
    ClassGroup,
    Subject,
    SyllabusTopic,
    TopicCoverage,
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Mark,
    ProgramOutcome,
    CourseOutcome,
    COPOMapping,
    AssessmentCO,
    AttainmentConfig,
    LogbookEntry,
)


@admin.register(ClassGroup)
class ClassGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "division", "year", "semester", "academic_year", "coordinator"]
    list_filter = ["academic_year", "year", "semester"]
    search_fields = ["name", "division"]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "class_group", "faculty", "credits", "is_active"]
    list_filter = ["is_active", "class_group__academic_year"]
    search_fields = ["code", "name"]


@admin.register(SyllabusTopic)
class SyllabusTopicAdmin(admin.ModelAdmin):
    list_display = ["subject", "unit_no", "order", "title", "planned_hours"]
    list_filter = ["subject", "unit_no"]
    search_fields = ["title"]


@admin.register(TopicCoverage)
class TopicCoverageAdmin(admin.ModelAdmin):
    list_display = ["topic", "covered_on", "covered_by"]
    list_filter = ["covered_on"]


class AttendanceRecordInline(admin.TabularInline):
    model = AttendanceRecord
    extra = 0
    raw_id_fields = ["student"]


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ["subject", "date", "kind", "slot", "marked_by"]
    list_filter = ["kind", "date", "subject"]
    inlines = [AttendanceRecordInline]


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ["subject", "name", "kind", "max_marks", "date", "is_published"]
    list_filter = ["kind", "is_published", "subject"]


@admin.register(Mark)
class MarkAdmin(admin.ModelAdmin):
    list_display = ["assessment", "student", "marks_obtained", "is_absent"]
    list_filter = ["is_absent", "assessment__subject"]
    search_fields = ["student__roll_no", "student__user__first_name"]


@admin.register(ProgramOutcome)
class ProgramOutcomeAdmin(admin.ModelAdmin):
    list_display = ["code", "title", "department"]
    search_fields = ["code", "title"]


@admin.register(CourseOutcome)
class CourseOutcomeAdmin(admin.ModelAdmin):
    list_display = ["code", "subject", "description"]
    list_filter = ["subject"]


@admin.register(COPOMapping)
class COPOMappingAdmin(admin.ModelAdmin):
    list_display = ["course_outcome", "program_outcome", "level"]
    list_filter = ["level"]


@admin.register(AttainmentConfig)
class AttainmentConfigAdmin(admin.ModelAdmin):
    list_display = ["department", "target_pct", "level3_pct", "level2_pct", "level1_pct", "pass_mark_pct", "min_attendance_pct"]


@admin.register(LogbookEntry)
class LogbookEntryAdmin(admin.ModelAdmin):
    list_display = ["subject", "faculty", "date", "hours", "hod_reviewed_at"]
    list_filter = ["date", "subject", "faculty"]
