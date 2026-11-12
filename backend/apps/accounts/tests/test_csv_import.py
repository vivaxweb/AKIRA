"""
Tests for CSV student import service and endpoint.
"""
import io
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User, Department, StudentProfile
from apps.academics.models import ClassGroup


@pytest.fixture
def setup_data(db):
    dept = Department.objects.create(name="Computer Science & Engineering", code="CSE")
    class_group = ClassGroup.objects.create(
        department=dept,
        name="TE-CSE",
        division="A",
        year=3,
        semester=5,
        academic_year="2026-27",
    )
    hod = User.objects.create_user(
        email="hod@demo.local",
        password="Demo@12345",
        first_name="Demo",
        last_name="HOD",
        role=User.Role.HOD,
        department=dept,
    )
    student = User.objects.create_user(
        email="student@demo.local",
        password="Demo@12345",
        first_name="Demo",
        last_name="Student",
        role=User.Role.STUDENT,
        department=dept,
    )
    return {"dept": dept, "class_group": class_group, "hod": hod, "student": student}


from rest_framework_simplejwt.tokens import RefreshToken


def get_token(client, email):
    user = User.objects.get(email=email)
    return str(RefreshToken.for_user(user).access_token)



@pytest.mark.django_db
class TestCSVStudentImport:
    def test_valid_csv_import(self, client, setup_data):
        token = get_token(client, setup_data["hod"].email)
        cg_id = setup_data["class_group"].id

        csv_content = f"""email,first_name,last_name,roll_no,class_group_id
imported01@demo.local,Imported,One,23CSE101,{cg_id}
imported02@demo.local,Imported,Two,23CSE102,{cg_id}
"""
        csv_file = SimpleUploadedFile("students.csv", csv_content.encode("utf-8"), content_type="text/csv")

        response = client.post(
            "/api/v1/users/import-csv/",
            {"file": csv_file},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["imported_count"] == 2
        assert data["failed_count"] == 0
        assert data["success"] is True

        # Verify created in DB
        u1 = User.objects.get(email="imported01@demo.local")
        assert u1.student_profile.roll_no == "23CSE101"
        assert u1.student_profile.class_group_id == cg_id

    def test_csv_with_invalid_rows_imports_valid_ones(self, client, setup_data):
        token = get_token(client, setup_data["hod"].email)
        cg_id = setup_data["class_group"].id

        # Row 2 is valid
        # Row 3 has invalid email
        # Row 4 has missing first_name
        # Row 5 has non-existent class group
        csv_content = f"""email,first_name,last_name,roll_no,class_group_id
valid_student@demo.local,Valid,Student,23CSE201,{cg_id}
not-an-email,Invalid,Email,23CSE202,{cg_id}
missing_fn@demo.local,,MissingFirst,23CSE203,{cg_id}
bad_class@demo.local,Bad,Class,23CSE204,999999
"""
        csv_file = SimpleUploadedFile("mixed.csv", csv_content.encode("utf-8"), content_type="text/csv")

        response = client.post(
            "/api/v1/users/import-csv/",
            {"file": csv_file},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert response.status_code == 201
        data = response.json()
        assert data["imported_count"] == 1
        assert data["failed_count"] == 3
        assert len(data["errors"]) == 3
        assert User.objects.filter(email="valid_student@demo.local").exists()

    def test_malformed_csv_structural_error(self, client, setup_data):
        token = get_token(client, setup_data["hod"].email)

        # Missing 'roll_no' column in header
        csv_content = """email,first_name,last_name,class_group_id
test@demo.local,Test,User,1
"""
        csv_file = SimpleUploadedFile("bad_header.csv", csv_content.encode("utf-8"), content_type="text/csv")

        response = client.post(
            "/api/v1/users/import-csv/",
            {"file": csv_file},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "csv_structural_error"
        assert User.objects.filter(email="test@demo.local").count() == 0

    def test_non_hod_cannot_import_csv(self, client, setup_data):
        token = get_token(client, setup_data["student"].email)
        csv_file = SimpleUploadedFile("test.csv", b"dummy content", content_type="text/csv")

        response = client.post(
            "/api/v1/users/import-csv/",
            {"file": csv_file},
            format="multipart",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert response.status_code == 403
