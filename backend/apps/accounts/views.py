"""
Views for accounts app.
"""
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User, Department
from .permissions import CanManageUsers, get_scoped_users
from .serializers import (
    UserListDetailSerializer,
    UserCreateUpdateSerializer,
    MeSerializer,
    ChangePasswordSerializer,
    DepartmentSerializer,
)
from .services import import_students_from_csv


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if username and "@" not in str(username):
            from .models import StudentProfile, FacultyProfile
            clean_username = str(username).strip()
            student = StudentProfile.objects.filter(roll_no__iexact=clean_username).select_related("user").first()
            if student:
                attrs[self.username_field] = student.user.email
            else:
                faculty = FacultyProfile.objects.filter(employee_id__iexact=clean_username).select_related("user").first()
                if faculty:
                    attrs[self.username_field] = faculty.user.email

        data = super().validate(attrs)
        # Add basic user details into login response so client can route immediately
        data["user"] = {
            "id": self.user.id,
            "email": self.user.email,
            "first_name": self.user.first_name,
            "last_name": self.user.last_name,
            "full_name": self.user.full_name,
            "role": self.user.role,
            "department": self.user.department_id,
        }
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Accepts email and password, returns access and refresh JWT tokens + user summary.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET /api/v1/auth/me/
    Returns currently authenticated user profile.
    PATCH /api/v1/auth/me/
    Allows updating own first_name, last_name, phone.
    """
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/v1/auth/change-password/
    Validates old password and sets new password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Password changed successfully."}, status=status.HTTP_200_OK)


class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/v1/departments/
    List and retrieve academic departments.
    """
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    """
    User management endpoints (HOD department-scoped / Principal read-only).
    GET /api/v1/users/
    POST /api/v1/users/
    GET /api/v1/users/{id}/
    PATCH /api/v1/users/{id}/
    DELETE /api/v1/users/{id}/
    """
    permission_classes = [CanManageUsers]
    filterset_fields = ["role", "is_active", "department"]
    search_fields = ["first_name", "last_name", "email", "student_profile__roll_no", "faculty_profile__employee_id"]
    ordering_fields = ["first_name", "last_name", "email", "created_at"]
    ordering = ["first_name", "last_name"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return get_scoped_users(self.request.user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return UserCreateUpdateSerializer
        return UserListDetailSerializer

    def perform_create(self, serializer):
        # Default user's department to HOD's department if HOD is creating
        if self.request.user.role == User.Role.HOD and not serializer.validated_data.get("department"):
            serializer.save(department=self.request.user.department)
        else:
            serializer.save()

    @action(detail=True, methods=["post"], url_path="toggle-active")
    def toggle_active(self, request, pk=None):
        """Toggle active status for a user."""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        return Response(
            {"detail": f"User {'activated' if user.is_active else 'deactivated'} successfully.", "is_active": user.is_active},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="import-csv", parser_classes=[MultiPartParser, FormParser])
    def import_csv(self, request):
        """
        POST /api/v1/users/import-csv/
        Imports student records from CSV.
        """
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"detail": "No file uploaded. Please upload a CSV file with 'file' field.", "code": "missing_file"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not csv_file.name.endswith(".csv"):
            return Response(
                {"detail": "Uploaded file must be a .csv file.", "code": "invalid_file_type"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = import_students_from_csv(
            csv_file,
            default_department=request.user.department,
            acting_user=request.user,
        )

        if not result["success"] and result["structural_error"]:
            return Response(
                {
                    "detail": result["structural_error"],
                    "code": "csv_structural_error",
                    "result": result,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        status_code = status.HTTP_201_CREATED if result["imported_count"] > 0 else status.HTTP_400_BAD_REQUEST
        return Response(result, status=status_code)
