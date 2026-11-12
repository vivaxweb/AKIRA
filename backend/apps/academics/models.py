"""
Academics models — ClassGroup stub for Phase 0.
Full implementation in Phase 3.
"""
from django.db import models
from apps.core.models import TimeStampedModel


class ClassGroup(TimeStampedModel):
    """A class group (e.g. SE-A, TE-B) within a department."""
    department = models.ForeignKey(
        "accounts.Department", on_delete=models.CASCADE, related_name="class_groups"
    )
    name = models.CharField(max_length=50)
    division = models.CharField(max_length=10, blank=True)
    year = models.PositiveSmallIntegerField(help_text="1-4 for B.Tech years")
    semester = models.PositiveSmallIntegerField()
    academic_year = models.CharField(max_length=10, default="2026-27")
    coordinator = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="coordinating_groups"
    )

    class Meta:
        unique_together = [("department", "name", "division", "academic_year")]
        ordering = ["year", "name", "division"]

    def __str__(self):
        return f"{self.name}/{self.division} ({self.academic_year})"
