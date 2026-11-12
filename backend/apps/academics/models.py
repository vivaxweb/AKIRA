"""
Academics models for Department Digital Hub.
Covers: ClassGroup, Subject, SyllabusTopic, TopicCoverage, AttendanceSession,
AttendanceRecord, Assessment, Mark, ProgramOutcome, CourseOutcome, COPOMapping,
AssessmentCO, AttainmentConfig, LogbookEntry.
"""
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from apps.core.models import TimeStampedModel


class ClassGroup(TimeStampedModel):
    department = models.ForeignKey(
        "accounts.Department", on_delete=models.CASCADE, related_name="class_groups"
    )
    name = models.CharField(max_length=50)  # e.g. "TE-CSE"
    division = models.CharField(max_length=10, blank=True)  # e.g. "A"
    year = models.PositiveSmallIntegerField(help_text="1-4 for B.Tech years")
    semester = models.PositiveSmallIntegerField()
    academic_year = models.CharField(max_length=10, default="2026-27")
    coordinator = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="coordinating_groups",
    )

    class Meta:
        unique_together = [("department", "name", "division", "academic_year")]
        ordering = ["year", "name", "division"]

    def __str__(self):
        return f"{self.name} - Div {self.division} ({self.academic_year})"


class Subject(TimeStampedModel):
    code = models.CharField(max_length=30)  # e.g. "CS501"
    name = models.CharField(max_length=150)  # e.g. "Database Management Systems"
    class_group = models.ForeignKey(
        ClassGroup, on_delete=models.CASCADE, related_name="subjects"
    )
    faculty = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="teaching_subjects",
    )
    credits = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("code", "class_group")]
        ordering = ["code"]
        indexes = [
            models.Index(fields=["faculty"]),
            models.Index(fields=["class_group"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name} ({self.class_group.name})"


class SyllabusTopic(TimeStampedModel):
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="topics"
    )
    unit_no = models.PositiveSmallIntegerField(default=1)
    title = models.CharField(max_length=255)
    planned_hours = models.PositiveSmallIntegerField(default=2)
    order = models.PositiveSmallIntegerField(default=1)

    class Meta:
        ordering = ["unit_no", "order"]
        unique_together = [("subject", "unit_no", "order")]

    def __str__(self):
        return f"Unit {self.unit_no}: {self.title}"


class TopicCoverage(TimeStampedModel):
    topic = models.OneToOneField(
        SyllabusTopic, on_delete=models.CASCADE, related_name="coverage"
    )
    covered_on = models.DateField()
    covered_by = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="covered_topics"
    )
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"Covered: {self.topic.title} on {self.covered_on}"


class AttendanceSession(TimeStampedModel):
    class SessionKind(models.TextChoices):
        LECTURE = "LECTURE", "Lecture"
        PRACTICAL = "PRACTICAL", "Practical"
        TUTORIAL = "TUTORIAL", "Tutorial"

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    date = models.DateField()
    kind = models.CharField(
        max_length=20, choices=SessionKind.choices, default=SessionKind.LECTURE
    )
    slot = models.PositiveSmallIntegerField(default=1)
    topic = models.ForeignKey(
        SyllabusTopic,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="attendance_sessions",
    )
    marked_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="marked_sessions",
    )

    class Meta:
        unique_together = [("subject", "date", "kind", "slot")]
        ordering = ["-date", "-slot"]
        indexes = [
            models.Index(fields=["subject", "date"]),
        ]

    def __str__(self):
        return f"{self.subject.code} {self.kind} on {self.date} (Slot {self.slot})"


class AttendanceRecord(TimeStampedModel):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LEAVE = "LEAVE", "Leave"

    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name="records"
    )
    student = models.ForeignKey(
        "accounts.StudentProfile",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PRESENT
    )

    class Meta:
        unique_together = [("session", "student")]
        indexes = [
            models.Index(fields=["session", "student"]),
        ]

    def __str__(self):
        return f"{self.student.roll_no}: {self.status}"


class Assessment(TimeStampedModel):
    class Kind(models.TextChoices):
        CIE = "CIE", "Continuous Internal Evaluation"
        ASSIGNMENT = "ASSIGNMENT", "Assignment"
        PRACTICAL = "PRACTICAL", "Practical Exam"
        OTHER = "OTHER", "Other"

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="assessments"
    )
    name = models.CharField(max_length=100)  # e.g. "CIE-1"
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.CIE)
    max_marks = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal("1.00"))]
    )
    weightage = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    date = models.DateField()
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["date", "name"]
        indexes = [models.Index(fields=["subject", "is_published"])]

    def __str__(self):
        return f"{self.subject.code} - {self.name} (Max: {self.max_marks})"


class Mark(TimeStampedModel):
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="marks"
    )
    student = models.ForeignKey(
        "accounts.StudentProfile", on_delete=models.CASCADE, related_name="marks"
    )
    marks_obtained = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    is_absent = models.BooleanField(default=False)

    class Meta:
        unique_together = [("assessment", "student")]
        indexes = [models.Index(fields=["assessment", "student"])]

    def clean(self):
        if self.marks_obtained is not None:
            if self.marks_obtained < Decimal("0.00"):
                raise ValidationError({"marks_obtained": "Marks obtained cannot be negative."})
            if self.marks_obtained > self.assessment.max_marks:
                raise ValidationError(
                    {
                        "marks_obtained": f"Marks obtained ({self.marks_obtained}) cannot exceed maximum marks ({self.assessment.max_marks})."
                    }
                )
        if self.is_absent:
            self.marks_obtained = Decimal("0.00")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student.roll_no} - {self.assessment.name}: {self.marks_obtained}"


class ProgramOutcome(TimeStampedModel):
    department = models.ForeignKey(
        "accounts.Department", on_delete=models.CASCADE, related_name="program_outcomes"
    )
    code = models.CharField(max_length=20)  # e.g. "PO1" .. "PO12", "PSO1"
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = [("department", "code")]
        ordering = ["code"]

    def __str__(self):
        return f"{self.code}: {self.title}"


class CourseOutcome(TimeStampedModel):
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="course_outcomes"
    )
    code = models.CharField(max_length=20)  # e.g. "CO1", "CO2"
    description = models.TextField()

    class Meta:
        unique_together = [("subject", "code")]
        ordering = ["code"]

    def __str__(self):
        return f"{self.subject.code} - {self.code}"


class COPOMapping(TimeStampedModel):
    course_outcome = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name="po_mappings"
    )
    program_outcome = models.ForeignKey(
        ProgramOutcome, on_delete=models.CASCADE, related_name="co_mappings"
    )
    level = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(3)],
        help_text="1: Low, 2: Medium, 3: High",
    )

    class Meta:
        unique_together = [("course_outcome", "program_outcome")]

    def __str__(self):
        return f"{self.course_outcome.code} -> {self.program_outcome.code} (Level {self.level})"


class AssessmentCO(TimeStampedModel):
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="co_links"
    )
    course_outcome = models.ForeignKey(
        CourseOutcome, on_delete=models.CASCADE, related_name="assessment_links"
    )

    class Meta:
        unique_together = [("assessment", "course_outcome")]

    def __str__(self):
        return f"{self.assessment.name} -> {self.course_outcome.code}"


class AttainmentConfig(TimeStampedModel):
    """
    Department-wide attainment thresholds.
    Defaults are placeholders (Section 1.1.5): 60 / 70 / 60 / 50 / 40 / 75.
    UI shows: 'Default values — edit to match your department rules.'
    """
    department = models.OneToOneField(
        "accounts.Department", on_delete=models.CASCADE, related_name="attainment_config"
    )
    target_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("60.00"),
        help_text="Target score % for a student to achieve CO"
    )
    level3_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("70.00"),
        help_text="% of students reaching target for Level 3"
    )
    level2_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("60.00"),
        help_text="% of students reaching target for Level 2"
    )
    level1_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("50.00"),
        help_text="% of students reaching target for Level 1"
    )
    pass_mark_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("40.00"),
        help_text="Minimum pass mark %"
    )
    min_attendance_pct = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("75.00"),
        help_text="Minimum attendance cutoff %"
    )

    def __str__(self):
        return f"Attainment Config: {self.department.code}"


class LogbookEntry(TimeStampedModel):
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE, related_name="logbook_entries"
    )
    faculty = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="logbook_entries"
    )
    date = models.DateField()
    hours = models.PositiveSmallIntegerField(default=1)
    topics_taught = models.TextField()
    remarks = models.TextField(blank=True)
    hod_remark = models.TextField(blank=True)
    hod_reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [models.Index(fields=["subject", "faculty", "date"])]

    def __str__(self):
        return f"{self.subject.code} - {self.date} by {self.faculty.full_name}"
