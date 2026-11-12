"""
Accreditation and Reports models for Department Digital Hub.
Covers: AccreditationCriteria, EvidenceLink
"""
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.accounts.models import Department
from apps.communication.models import DepartmentDocument
from apps.projects.models import Project


class AccreditationCriteria(TimeStampedModel):
    class Body(models.TextChoices):
        NBA = "NBA", "NBA (National Board of Accreditation)"
        NAAC = "NAAC", "NAAC (National Assessment and Accreditation Council)"

    class Status(models.TextChoices):
        COMPLIANT = "COMPLIANT", "Compliant"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        NEEDS_ATTENTION = "NEEDS_ATTENTION", "Needs Attention"
        NOT_STARTED = "NOT_STARTED", "Not Started"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="accreditation_criteria",
    )
    code = models.CharField(max_length=20, help_text="e.g. C1, C2, C3...")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    accreditation_body = models.CharField(
        max_length=10,
        choices=Body.choices,
        default=Body.NBA,
    )
    max_marks = models.PositiveIntegerField(default=100)
    obtained_marks = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.IN_PROGRESS,
    )

    class Meta:
        ordering = ["code"]
        unique_together = [("department", "accreditation_body", "code")]
        verbose_name = "Accreditation Criterion"
        verbose_name_plural = "Accreditation Criteria"

    def __str__(self):
        return f"{self.accreditation_body} {self.code}: {self.title}"


class EvidenceLink(TimeStampedModel):
    criteria = models.ForeignKey(
        AccreditationCriteria,
        on_delete=models.CASCADE,
        related_name="evidences",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    document = models.ForeignKey(
        DepartmentDocument,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="accreditation_evidences",
    )
    project = models.ForeignKey(
        Project,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="accreditation_evidences",
    )
    external_url = models.URLField(blank=True, default="")
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="added_evidences",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Evidence Link"
        verbose_name_plural = "Evidence Links"

    def __str__(self):
        return f"Evidence: {self.title} ({self.criteria.code})"
