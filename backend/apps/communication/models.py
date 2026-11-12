from django.db import models
from django.conf import settings
from apps.accounts.models import Department


class Notice(models.Model):
    class Category(models.TextChoices):
        ACADEMIC = "ACADEMIC", "Academic"
        EXAM = "EXAM", "Examination"
        PLACEMENT = "PLACEMENT", "Placement & Internships"
        EVENT = "EVENT", "Events & Workshops"
        GENERAL = "GENERAL", "General Notice"

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        NORMAL = "NORMAL", "Normal"
        URGENT = "URGENT", "Urgent"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="notices",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.ACADEMIC,
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL,
    )
    target_roles = models.JSONField(
        default=list,
        help_text="Roles permitted to view notice, e.g. ['STUDENT', 'FACULTY']. Empty list means all roles.",
    )
    is_pinned = models.BooleanField(default=False)
    expires_at = models.DateField(null=True, blank=True)
    attachment = models.FileField(upload_to="notices/attachments/", null=True, blank=True)

    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="published_notices",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]
        verbose_name = "Notice"
        verbose_name_plural = "Notices"

    def __str__(self):
        return f"[{self.category}] {self.title}"


class DepartmentEvent(models.Model):
    class EventType(models.TextChoices):
        EXAM = "EXAM", "Examination"
        DEADLINE = "DEADLINE", "Submission Deadline"
        WORKSHOP = "WORKSHOP", "Workshop & Training"
        SEMINAR = "SEMINAR", "Guest Seminar"
        MEETING = "MEETING", "Department Meeting"
        HOLIDAY = "HOLIDAY", "Holiday"
        OTHER = "OTHER", "Other"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="events",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.WORKSHOP,
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default="")

    organizer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="organized_events",
    )
    target_roles = models.JSONField(
        default=list,
        help_text="Empty list indicates open to all roles.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_datetime"]
        verbose_name = "Department Event"
        verbose_name_plural = "Department Events"

    def __str__(self):
        return f"{self.title} ({self.start_datetime.strftime('%Y-%m-%d')})"


class DepartmentDocument(models.Model):
    class Category(models.TextChoices):
        SYLLABUS = "SYLLABUS", "Syllabus & Curriculum"
        TIMETABLE = "TIMETABLE", "Academic Timetable"
        CIRCULAR = "CIRCULAR", "Official Circular"
        TEMPLATE = "TEMPLATE", "Format & Template"
        QUESTION_PAPER = "QUESTION_PAPER", "Question Paper / Bank"
        LAB_MANUAL = "LAB_MANUAL", "Lab Manual"
        ACCREDITATION = "ACCREDITATION", "Accreditation Document"
        OTHER = "OTHER", "Other Document"

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    category = models.CharField(
        max_length=30,
        choices=Category.choices,
        default=Category.SYLLABUS,
    )
    file = models.FileField(upload_to="documents/%Y/%m/")
    file_size_bytes = models.PositiveIntegerField(default=0)
    file_type = models.CharField(max_length=50, default="PDF")
    version = models.CharField(max_length=20, default="1.0")

    allowed_roles = models.JSONField(
        default=list,
        help_text="Empty list means visible to all roles. Specific roles restrict access.",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Department Document"
        verbose_name_plural = "Department Documents"

    def __str__(self):
        return f"{self.title} (v{self.version})"
