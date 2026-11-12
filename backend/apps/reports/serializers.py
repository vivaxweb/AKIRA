from rest_framework import serializers
from .models import AccreditationCriteria, EvidenceLink
from apps.communication.models import DepartmentDocument
from apps.projects.models import Project


class EvidenceLinkSerializer(serializers.ModelSerializer):
    document_title = serializers.ReadOnlyField(source="document.title")
    document_file_url = serializers.SerializerMethodField()
    project_title = serializers.ReadOnlyField(source="project.title")
    added_by_name = serializers.ReadOnlyField(source="added_by.get_full_name")

    class Meta:
        model = EvidenceLink
        fields = [
            "id",
            "criteria",
            "title",
            "description",
            "document",
            "document_title",
            "document_file_url",
            "project",
            "project_title",
            "external_url",
            "added_by",
            "added_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "added_by", "created_at", "updated_at"]

    def get_document_file_url(self, obj):
        if obj.document and obj.document.file:
            return obj.document.file.url
        return None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["added_by"] = request.user
        return super().create(validated_data)


class AccreditationCriteriaListSerializer(serializers.ModelSerializer):
    evidences_count = serializers.IntegerField(source="evidences.count", read_only=True)

    class Meta:
        model = AccreditationCriteria
        fields = [
            "id",
            "department",
            "code",
            "title",
            "description",
            "accreditation_body",
            "max_marks",
            "obtained_marks",
            "status",
            "evidences_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "department", "created_at", "updated_at"]


class AccreditationCriteriaDetailSerializer(serializers.ModelSerializer):
    evidences = EvidenceLinkSerializer(many=True, read_only=True)
    evidences_count = serializers.IntegerField(source="evidences.count", read_only=True)

    class Meta:
        model = AccreditationCriteria
        fields = [
            "id",
            "department",
            "code",
            "title",
            "description",
            "accreditation_body",
            "max_marks",
            "obtained_marks",
            "status",
            "evidences",
            "evidences_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "department", "created_at", "updated_at"]
