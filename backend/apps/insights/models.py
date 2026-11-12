from django.db import models
from django.conf import settings


class Intervention(models.Model):
    """Academic interventions logged for students needing support."""

    class InterventionType(models.TextChoices):
        COUNSELING = "COUNSELING", "Academic Counseling"
        REMEDIAL = "REMEDIAL", "Remedial Classes"
        PARENT_MEETING = "PARENT_MEETING", "Parent-Teacher Meeting"
        ATTENDANCE_WARNING = "ATTENDANCE_WARNING", "Attendance Warning"

    class Status(models.TextChoices):
        PLANNED = "PLANNED", "Planned"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="interventions",
        limit_choices_to={"role": "STUDENT"},
    )
    intervention_type = models.CharField(
        max_length=30,
        choices=InterventionType.choices,
        default=InterventionType.COUNSELING,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNED,
    )
    reason = models.CharField(max_length=255, blank=True, default="")
    remarks = models.TextField(help_text="Detailed notes regarding student challenge and intervention plan")
    action_taken = models.TextField(blank=True, default="", help_text="Follow-up action taken and outcome")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_interventions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Intervention"
        verbose_name_plural = "Interventions"

    def __str__(self):
        return f"{self.student.get_full_name()} - {self.get_intervention_type_display()} ({self.status})"
