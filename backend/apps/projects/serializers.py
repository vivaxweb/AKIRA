from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Project, ProjectMember, ProjectMilestone, SimilarityCheck

User = get_user_model()


class ProjectMemberSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_email = serializers.CharField(source="student.email", read_only=True)
    student_roll = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = [
            "id",
            "student",
            "student_name",
            "student_email",
            "student_roll",
            "role_in_team",
            "joined_at",
        ]

    def get_student_roll(self, obj) -> str:
        profile = getattr(obj.student, "student_profile", None)
        return profile.roll_no if profile else ""


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = [
            "id",
            "project",
            "title",
            "description",
            "due_date",
            "order",
            "is_completed",
            "completed_at",
            "guide_signed_off",
            "signed_off_at",
            "guide_remarks",
        ]
        read_only_fields = ["signed_off_at"]


class ProjectListSerializer(serializers.ModelSerializer):
    team_leader_name = serializers.CharField(source="team_leader.get_full_name", read_only=True)
    guide_name = serializers.SerializerMethodField()
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    completed_milestones = serializers.SerializerMethodField()
    total_milestones = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "abstract",
            "domain",
            "batch_year",
            "academic_year",
            "department",
            "status",
            "team_leader",
            "team_leader_name",
            "guide",
            "guide_name",
            "github_url",
            "live_url",
            "member_count",
            "completed_milestones",
            "total_milestones",
            "created_at",
            "updated_at",
        ]

    def get_guide_name(self, obj) -> str:
        return obj.guide.get_full_name() if obj.guide else "Unassigned"

    def get_completed_milestones(self, obj) -> int:
        return obj.milestones.filter(is_completed=True).count()

    def get_total_milestones(self, obj) -> int:
        return obj.milestones.count()


class ProjectDetailSerializer(serializers.ModelSerializer):
    team_leader_name = serializers.CharField(source="team_leader.get_full_name", read_only=True)
    team_leader_roll = serializers.SerializerMethodField()
    guide_name = serializers.SerializerMethodField()
    members = ProjectMemberSerializer(many=True, read_only=True)
    milestones = ProjectMilestoneSerializer(many=True, read_only=True)

    # Write-only helper fields
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "title",
            "abstract",
            "domain",
            "batch_year",
            "academic_year",
            "department",
            "status",
            "rejection_reason",
            "team_leader",
            "team_leader_name",
            "team_leader_roll",
            "guide",
            "guide_name",
            "github_url",
            "live_url",
            "members",
            "milestones",
            "member_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["department", "team_leader", "created_at", "updated_at"]

    def get_team_leader_roll(self, obj) -> str:
        profile = getattr(obj.team_leader, "student_profile", None)
        return profile.roll_no if profile else ""

    def get_guide_name(self, obj) -> str:
        return obj.guide.get_full_name() if obj.guide else "Unassigned"

    def create(self, validated_data):
        member_ids = validated_data.pop("member_ids", [])
        project = Project.objects.create(**validated_data)

        # Team leader is always automatically a member
        ProjectMember.objects.get_or_create(
            project=project,
            student=project.team_leader,
            defaults={"role_in_team": "Team Leader"},
        )

        # Add additional members
        for s_id in member_ids:
            if s_id != project.team_leader_id:
                try:
                    s_user = User.objects.get(id=s_id)
                    ProjectMember.objects.get_or_create(
                        project=project,
                        student=s_user,
                        defaults={"role_in_team": "Member"},
                    )
                except User.DoesNotExist:
                    pass

        # Seed standard B.Tech milestones
        default_milestones = [
            ("Synopsis & Problem Statement", "Project abstract, objective, and domain feasibility submission", 1),
            ("SRS & Architecture Design", "Requirement specification and high-level architectural diagram", 2),
            ("Mid-Term Evaluation", "Working core modules and midterm faculty review presentation", 3),
            ("Prototype & Code Completion", "Complete software/hardware implementation and GitHub repo", 4),
            ("Final Report & Viva", "Comprehensive project documentation and external examination", 5),
        ]
        for title, desc, order in default_milestones:
            ProjectMilestone.objects.create(
                project=project,
                title=title,
                description=desc,
                order=order,
            )

        return project

    def update(self, instance, validated_data):
        member_ids = validated_data.pop("member_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if member_ids is not None:
            # Keep team leader always
            keep_ids = set(member_ids)
            keep_ids.add(instance.team_leader_id)
            instance.members.exclude(student_id__in=keep_ids).delete()
            for s_id in member_ids:
                try:
                    s_user = User.objects.get(id=s_id)
                    role = "Team Leader" if s_id == instance.team_leader_id else "Member"
                    ProjectMember.objects.get_or_create(
                        project=instance,
                        student=s_user,
                        defaults={"role_in_team": role},
                    )
                except User.DoesNotExist:
                    pass

        return instance


class SimilarityCheckRequestSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    abstract = serializers.CharField()
    exclude_project_id = serializers.IntegerField(required=False, allow_null=True, default=None)


class SimilarityMatchSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    domain = serializers.CharField()
    batch_year = serializers.IntegerField()
    similarity_pct = serializers.FloatField()
    status = serializers.CharField()
    guide_name = serializers.CharField()


class SimilarityCheckResponseSerializer(serializers.Serializer):
    max_score = serializers.FloatField()
    is_flagged = serializers.BooleanField()
    matched_project_id = serializers.IntegerField(allow_null=True)
    top_matches = SimilarityMatchSerializer(many=True)
