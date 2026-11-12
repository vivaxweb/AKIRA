"""
Serializers for accounts app.
"""
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import Department, User, StudentProfile, FacultyProfile
from apps.academics.models import ClassGroup


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "code", "created_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    class_group_name = serializers.CharField(source="class_group.__str__", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "roll_no", "class_group", "class_group_name", "admission_year"]


class FacultyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = FacultyProfile
        fields = ["id", "employee_id", "designation"]


class UserListDetailSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    faculty_profile = FacultyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "phone",
            "department",
            "department_name",
            "department_code",
            "is_active",
            "student_profile",
            "faculty_profile",
            "created_at",
        ]


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    roll_no = serializers.CharField(write_only=True, required=False, allow_blank=True)
    class_group = serializers.PrimaryKeyRelatedField(
        queryset=ClassGroup.objects.all(), write_only=True, required=False, allow_null=True
    )
    admission_year = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    employee_id = serializers.CharField(write_only=True, required=False, allow_blank=True)
    designation = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "role",
            "phone",
            "department",
            "is_active",
            "roll_no",
            "class_group",
            "admission_year",
            "employee_id",
            "designation",
        ]

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password", None) or "Demo@12345"
        roll_no = validated_data.pop("roll_no", None)
        class_group = validated_data.pop("class_group", None)
        admission_year = validated_data.pop("admission_year", None)
        employee_id = validated_data.pop("employee_id", None)
        designation = validated_data.pop("designation", "")

        user = User.objects.create_user(password=password, **validated_data)

        if user.role == User.Role.STUDENT and roll_no:
            StudentProfile.objects.create(
                user=user,
                roll_no=roll_no,
                class_group=class_group,
                admission_year=admission_year or 2023,
            )
        elif user.role in (User.Role.FACULTY, User.Role.COORDINATOR) and employee_id:
            FacultyProfile.objects.create(
                user=user,
                employee_id=employee_id,
                designation=designation or "Assistant Professor",
            )

        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        roll_no = validated_data.pop("roll_no", None)
        class_group = validated_data.pop("class_group", None)
        admission_year = validated_data.pop("admission_year", None)
        employee_id = validated_data.pop("employee_id", None)
        designation = validated_data.pop("designation", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        # Update profiles if needed
        if instance.role == User.Role.STUDENT and roll_no:
            StudentProfile.objects.update_or_create(
                user=instance,
                defaults={
                    "roll_no": roll_no,
                    "class_group": class_group,
                    "admission_year": admission_year or 2023,
                },
            )
        elif instance.role in (User.Role.FACULTY, User.Role.COORDINATOR) and employee_id:
            FacultyProfile.objects.update_or_create(
                user=instance,
                defaults={
                    "employee_id": employee_id,
                    "designation": designation or "Assistant Professor",
                },
            )

        return instance


class MeSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)
    department_code = serializers.CharField(source="department.code", read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    faculty_profile = FacultyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "phone",
            "department",
            "department_name",
            "department_code",
            "student_profile",
            "faculty_profile",
        ]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs["old_password"]):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})
        return attrs
