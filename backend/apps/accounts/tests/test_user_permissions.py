"""
Permission tests for user endpoints across all 5 roles.
"""
import pytest
from apps.accounts.models import User, Department


@pytest.fixture
def departments(db):
    cse = Department.objects.create(name="Computer Science & Engineering", code="CSE")
    mech = Department.objects.create(name="Mechanical Engineering", code="MECH")
    return {"cse": cse, "mech": mech}


@pytest.fixture
def users(db, departments):
    pwd = "Demo@12345"
    principal = User.objects.create_user(
        email="principal@demo.local", password=pwd, first_name="Demo", last_name="Principal",
        role=User.Role.PRINCIPAL
    )
    hod_cse = User.objects.create_user(
        email="hod@demo.local", password=pwd, first_name="Demo", last_name="HOD",
        role=User.Role.HOD, department=departments["cse"]
    )
    hod_mech = User.objects.create_user(
        email="hod_mech@demo.local", password=pwd, first_name="Demo", last_name="HOD Mech",
        role=User.Role.HOD, department=departments["mech"]
    )
    faculty = User.objects.create_user(
        email="faculty1@demo.local", password=pwd, first_name="Demo", last_name="Faculty",
        role=User.Role.FACULTY, department=departments["cse"]
    )
    coordinator = User.objects.create_user(
        email="coordinator@demo.local", password=pwd, first_name="Demo", last_name="Coordinator",
        role=User.Role.COORDINATOR, department=departments["cse"]
    )
    student = User.objects.create_user(
        email="student01@demo.local", password=pwd, first_name="Demo", last_name="Student",
        role=User.Role.STUDENT, department=departments["cse"]
    )
    return {
        "principal": principal,
        "hod_cse": hod_cse,
        "hod_mech": hod_mech,
        "faculty": faculty,
        "coordinator": coordinator,
        "student": student,
    }


from rest_framework_simplejwt.tokens import RefreshToken


def get_token(client, email):
    user = User.objects.get(email=email)
    return str(RefreshToken.for_user(user).access_token)



@pytest.mark.django_db
class TestUserPermissions:
    def test_hod_can_list_users(self, client, users):
        token = get_token(client, users["hod_cse"].email)
        res = client.get("/api/v1/users/", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert res.status_code == 200
        # Should only see users in CSE department
        data = res.json()["results"]
        for u in data:
            if u["department"]:
                assert u["department_code"] == "CSE"

    def test_hod_can_create_user(self, client, users, departments):
        token = get_token(client, users["hod_cse"].email)
        payload = {
            "email": "newstudent@demo.local",
            "first_name": "New",
            "last_name": "Student",
            "role": "STUDENT",
            "department": departments["cse"].id,
            "roll_no": "23CSE999",
        }
        res = client.post(
            "/api/v1/users/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 201
        assert User.objects.filter(email="newstudent@demo.local").exists()

    def test_hod_cannot_edit_other_dept_user(self, client, users):
        token = get_token(client, users["hod_cse"].email)
        # Try to modify hod_mech (different department)
        res = client.patch(
            f"/api/v1/users/{users['hod_mech'].id}/",
            {"first_name": "Hacked"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        # Should be 404 because get_queryset filters out other departments
        assert res.status_code == 404

    def test_principal_can_list_users(self, client, users):
        token = get_token(client, users["principal"].email)
        res = client.get("/api/v1/users/", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert res.status_code == 200

    def test_principal_cannot_create_user(self, client, users, departments):
        token = get_token(client, users["principal"].email)
        payload = {
            "email": "principal_created@demo.local",
            "first_name": "Illegal",
            "last_name": "User",
            "role": "STUDENT",
            "department": departments["cse"].id,
        }
        res = client.post(
            "/api/v1/users/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 403

    @pytest.mark.parametrize("role_key", ["faculty", "coordinator", "student"])
    def test_non_admin_cannot_access_users_endpoint(self, client, users, role_key):
        token = get_token(client, users[role_key].email)
        res = client.get("/api/v1/users/", HTTP_AUTHORIZATION=f"Bearer {token}")
        assert res.status_code == 403

    def test_hod_can_toggle_active_status(self, client, users):
        token = get_token(client, users["hod_cse"].email)
        student = users["student"]
        assert student.is_active is True

        res = client.post(
            f"/api/v1/users/{student.id}/toggle-active/",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 200
        student.refresh_from_db()
        assert student.is_active is False
