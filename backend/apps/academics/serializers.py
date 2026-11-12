"""
Serializers for academics app.
"""
from decimal import Decimal
from rest_framework import serializers
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
from apps.accounts.models import User, StudentProfile


class ClassGroupSerializer(serializers.ModelSerializer):
    coordinator_name = serializers.CharField(source="coordinator.full_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    students_count = serializers.IntegerField(source="students.count", read_only=True)

    class Meta:
        model = ClassGroup
        fields = [
            "id",
            "department",
            "department_name",
            "name",
            "division",
            "year",
            "semester",
            "academic_year",
            "coordinator",
            "coordinator_name",
            "students_count",
            "created_at",
        ]


class SubjectSerializer(serializers.ModelSerializer):
    class_group_name = serializers.CharField(source="class_group.__str__", read_only=True)
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = Subject
        fields = [
            "id",
            "code",
            "name",
            "class_group",
            "class_group_name",
            "faculty",
            "faculty_name",
            "credits",
            "is_active",
            "created_at",
        ]


class TopicCoverageSerializer(serializers.ModelSerializer):
    covered_by_name = serializers.CharField(source="covered_by.full_name", read_only=True)

    class Meta:
        model = TopicCoverage
        fields = ["id", "topic", "covered_on", "covered_by", "covered_by_name", "remarks"]


class SyllabusTopicSerializer(serializers.ModelSerializer):
    is_covered = serializers.SerializerMethodField()
    covered_on = serializers.SerializerMethodField()

    class Meta:
        model = SyllabusTopic
        fields = [
            "id",
            "subject",
            "unit_no",
            "title",
            "planned_hours",
            "order",
            "is_covered",
            "covered_on",
        ]

    def get_is_covered(self, obj):
        return hasattr(obj, "coverage") and obj.coverage is not None

    def get_covered_on(self, obj):
        return obj.coverage.covered_on if hasattr(obj, "coverage") and obj.coverage else None


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_roll = serializers.CharField(source="student.roll_no", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = ["id", "student", "student_roll", "student_name", "status"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    marked_by_name = serializers.CharField(source="marked_by.full_name", read_only=True)
    topic_title = serializers.CharField(source="topic.title", read_only=True)
    records = AttendanceRecordSerializer(many=True, read_only=True)
    total_marked = serializers.SerializerMethodField()
    present_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id",
            "subject",
            "subject_code",
            "subject_name",
            "date",
            "kind",
            "slot",
            "topic",
            "topic_title",
            "marked_by",
            "marked_by_name",
            "total_marked",
            "present_count",
            "records",
            "created_at",
        ]

    def get_total_marked(self, obj):
        return obj.records.count()

    def get_present_count(self, obj):
        return obj.records.filter(status=AttendanceRecord.Status.PRESENT).count()


class AttendanceBulkSaveItem(serializers.Serializer):
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=AttendanceRecord.Status.choices)


class AttendanceBulkSaveSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    records = AttendanceBulkSaveItem(many=True)


class AssessmentSerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    linked_cos = serializers.SerializerMethodField()

    class Meta:
        model = Assessment
        fields = [
            "id",
            "subject",
            "subject_code",
            "subject_name",
            "name",
            "kind",
            "max_marks",
            "weightage",
            "date",
            "is_published",
            "linked_cos",
            "created_at",
        ]

    def get_linked_cos(self, obj):
        return [aco.course_outcome.code for aco in obj.co_links.all()]


class MarkSerializer(serializers.ModelSerializer):
    student_roll = serializers.CharField(source="student.roll_no", read_only=True)
    student_name = serializers.CharField(source="student.user.full_name", read_only=True)

    class Meta:
        model = Mark
        fields = ["id", "assessment", "student", "student_roll", "student_name", "marks_obtained", "is_absent"]

    def validate(self, attrs):
        assessment = attrs.get("assessment") or (self.instance.assessment if self.instance else None)
        marks_obtained = attrs.get("marks_obtained")
        is_absent = attrs.get("is_absent", False)

        if not is_absent and marks_obtained is not None:
            if marks_obtained < Decimal("0.00"):
                raise serializers.ValidationError({"marks_obtained": "Marks cannot be negative."})
            if assessment and marks_obtained > assessment.max_marks:
                raise serializers.ValidationError(
                    {"marks_obtained": f"Marks cannot exceed maximum marks ({assessment.max_marks})."}
                )
        return attrs


class MarkBulkItem(serializers.Serializer):
    student_id = serializers.IntegerField()
    marks_obtained = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    is_absent = serializers.BooleanField(default=False)


class MarksBulkSaveSerializer(serializers.Serializer):
    assessment_id = serializers.IntegerField()
    marks = MarkBulkItem(many=True)


class ProgramOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramOutcome
        fields = ["id", "department", "code", "title", "description"]


class CourseOutcomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseOutcome
        fields = ["id", "subject", "code", "description"]


class COPOMappingSerializer(serializers.ModelSerializer):
    co_code = serializers.CharField(source="course_outcome.code", read_only=True)
    po_code = serializers.CharField(source="program_outcome.code", read_only=True)

    class Meta:
        model = COPOMapping
        fields = ["id", "course_outcome", "program_outcome", "co_code", "po_code", "level"]


class AttainmentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttainmentConfig
        fields = [
            "id",
            "department",
            "target_pct",
            "level3_pct",
            "level2_pct",
            "level1_pct",
            "pass_mark_pct",
            "min_attendance_pct",
        ]


class LogbookEntrySerializer(serializers.ModelSerializer):
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = LogbookEntry
        fields = [
            "id",
            "subject",
            "subject_code",
            "subject_name",
            "faculty",
            "faculty_name",
            "date",
            "hours",
            "topics_taught",
            "remarks",
            "hod_remark",
            "hod_reviewed_at",
            "created_at",
        ]
        read_only_fields = ["hod_remark", "hod_reviewed_at"]


class LogbookReviewSerializer(serializers.Serializer):
    hod_remark = serializers.CharField(required=True)
