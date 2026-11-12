"""
Django admin configuration for accounts models.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Department, User, StudentProfile, FacultyProfile


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "created_at"]
    search_fields = ["code", "name"]
    ordering = ["code"]


class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    verbose_name_plural = "Student Profile"


class FacultyProfileInline(admin.StackedInline):
    model = FacultyProfile
    can_delete = False
    verbose_name_plural = "Faculty Profile"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "first_name", "last_name", "role", "department", "is_active", "is_staff"]
    list_filter = ["role", "is_active", "department", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["email"]
    inlines = [StudentProfileInline, FacultyProfileInline]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone", "department", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    readonly_fields = ["created_at", "updated_at"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "role", "department", "password1", "password2"),
            },
        ),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ["roll_no", "user", "class_group", "admission_year"]
    search_fields = ["roll_no", "user__email", "user__first_name", "user__last_name"]
    list_filter = ["class_group", "admission_year"]


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ["employee_id", "user", "designation"]
    search_fields = ["employee_id", "user__email", "user__first_name", "user__last_name"]
    list_filter = ["designation"]
