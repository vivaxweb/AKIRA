from rest_framework import serializers
from apps.insights.models import Intervention
from apps.accounts.models import User


class InterventionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_roll = serializers.SerializerMethodField()
    student_email = serializers.EmailField(source="student.email", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    intervention_type_display = serializers.CharField(
        source="get_intervention_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    def get_student_roll(self, obj):
        prof = getattr(obj.student, "student_profile", None)
        return getattr(prof, "roll_no", getattr(prof, "roll_number", "")) if prof else ""

    class Meta:
        model = Intervention
        fields = [
            "id",
            "student",
            "student_name",
            "student_roll",
            "student_email",
            "intervention_type",
            "intervention_type_display",
            "status",
            "status_display",
            "reason",
            "remarks",
            "action_taken",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "resolved_at",
        ]
        read_only_fields = [
            "id",
            "student_name",
            "student_roll",
            "student_email",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
            "resolved_at",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        validated_data["created_by"] = user
        return super().create(validated_data)


class ResolveInterventionSerializer(serializers.Serializer):
    action_taken = serializers.CharField(required=True, allow_blank=False)
    status = serializers.ChoiceField(
        choices=[("RESOLVED", "Resolved"), ("IN_PROGRESS", "In Progress")],
        default="RESOLVED"
    )
