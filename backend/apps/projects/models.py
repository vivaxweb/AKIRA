from django.db import models
from django.conf import settings
from apps.accounts.models import Department


class Project(models.Model):
    class Status(models.TextChoices):
        PROPOSED = "PROPOSED", "Proposed"
        UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
        APPROVED = "APPROVED", "Approved"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"

    DOMAINS = [
        ("Machine Learning", "Machine Learning & AI"),
        ("Web Development", "Web & Full-Stack Development"),
        ("Cloud Computing", "Cloud Computing & DevOps"),
        ("Cybersecurity", "Cybersecurity & Cryptography"),
        ("IoT & Embedded", "IoT & Embedded Systems"),
        ("Blockchain", "Blockchain & Distributed Ledger"),
        ("Mobile Apps", "Mobile Application Development"),
        ("Data Science", "Data Science & Big Data"),
        ("Computer Vision", "Computer Vision & Image Processing"),
        ("Natural Language Processing", "Natural Language Processing"),
    ]

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=255)
    abstract = models.TextField()
    domain = models.CharField(max_length=100)
    batch_year = models.PositiveIntegerField(help_text="Graduation Year (e.g. 2026)")
    academic_year = models.CharField(max_length=20, default="2026-27")

    team_leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="led_projects",
    )
    guide = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guided_projects",
    )

    github_url = models.URLField(blank=True, default="")
    live_url = models.URLField(blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROPOSED,
    )
    rejection_reason = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-batch_year", "-created_at"]
        verbose_name = "Project"
        verbose_name_plural = "Projects"

    def __str__(self):
        return f"{self.title} ({self.batch_year})"


class ProjectMember(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members",
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_memberships",
    )
    role_in_team = models.CharField(max_length=100, default="Member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "student")
        verbose_name = "Project Member"
        verbose_name_plural = "Project Members"

    def __str__(self):
        return f"{self.student.get_full_name()} in {self.project.title}"


class ProjectMilestone(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="milestones",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    due_date = models.DateField(null=True, blank=True)
    order = models.PositiveIntegerField(default=1)

    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    guide_signed_off = models.BooleanField(default=False)
    signed_off_at = models.DateTimeField(null=True, blank=True)
    guide_remarks = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["order", "due_date", "id"]
        verbose_name = "Project Milestone"
        verbose_name_plural = "Project Milestones"

    def __str__(self):
        return f"{self.project.title} - M{self.order}: {self.title}"


class SimilarityCheck(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="similarity_checks",
    )
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    input_title = models.CharField(max_length=255)
    input_abstract = models.TextField()
    similarity_score = models.FloatField(help_text="Highest cosine similarity score in percent (0-100)")
    matched_project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="flagged_similar_checks",
    )
    match_details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Similarity Check"
        verbose_name_plural = "Similarity Checks"

    def __str__(self):
        return f"Check '{self.input_title[:30]}' - {self.similarity_score}%"
