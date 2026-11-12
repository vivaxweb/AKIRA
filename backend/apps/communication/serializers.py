from rest_framework import serializers
from .models import Notice, DepartmentEvent, DepartmentDocument


class NoticeSerializer(serializers.ModelSerializer):
    publisher_name = serializers.CharField(source="published_by.get_full_name", read_only=True)
    publisher_role = serializers.CharField(source="published_by.role", read_only=True)

    class Meta:
        model = Notice
        fields = [
            "id",
            "department",
            "title",
            "content",
            "category",
            "priority",
            "target_roles",
            "is_pinned",
            "expires_at",
            "attachment",
            "published_by",
            "publisher_name",
            "publisher_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["department", "published_by", "created_at", "updated_at"]


class DepartmentEventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentEvent
        fields = [
            "id",
            "department",
            "title",
            "description",
            "event_type",
            "start_datetime",
            "end_datetime",
            "location",
            "organizer",
            "organizer_name",
            "target_roles",
            "created_at",
        ]
        read_only_fields = ["department", "organizer", "created_at"]

    def get_organizer_name(self, obj) -> str:
        return obj.organizer.get_full_name() if obj.organizer else "Department Office"


class DepartmentDocumentSerializer(serializers.ModelSerializer):
    uploader_name = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = DepartmentDocument
        fields = [
            "id",
            "department",
            "title",
            "description",
            "category",
            "file",
            "file_url",
            "file_size_bytes",
            "file_type",
            "version",
            "allowed_roles",
            "uploaded_by",
            "uploader_name",
            "download_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "department",
            "uploaded_by",
            "file_size_bytes",
            "download_count",
            "created_at",
            "updated_at",
        ]

    def get_uploader_name(self, obj) -> str:
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else "System"

    def get_file_url(self, obj) -> str:
        if obj.file:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return ""

    def create(self, validated_data):
        file_obj = validated_data.get("file")
        if file_obj:
            validated_data["file_size_bytes"] = file_obj.size
            ext = file_obj.name.split(".")[-1].upper() if "." in file_obj.name else "DOC"
            validated_data["file_type"] = ext[:10]
        return super().create(validated_data)
