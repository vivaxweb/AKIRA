"""
Tests for authentication: login, refresh, me, change-password.
"""
import pytest
from apps.accounts.models import User, Department


@pytest.fixture
def department(db):
    return Department.objects.create(name="Computer Science & Engineering", code="CSE")


@pytest.fixture
def test_user(db, department):
    user = User.objects.create_user(
        email="testuser@demo.local",
        password="TestPassword@123",
        first_name="Test",
        last_name="User",
        role=User.Role.FACULTY,
        department=department,
    )
    return user


@pytest.mark.django_db
class TestAuthentication:
    def test_login_success(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        assert response.status_code == 200
        data = response.json()
        assert "access" in data
        assert "refresh" in data
        assert "user" in data
        assert data["user"]["email"] == "testuser@demo.local"
        assert data["user"]["role"] == "FACULTY"

    def test_login_invalid_password(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "WrongPassword!"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login/",
            {"email": "nobody@demo.local", "password": "SomePassword!"},
            content_type="application/json",
        )
        assert response.status_code == 401

    def test_token_refresh(self, client, test_user):
        login_res = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        refresh_token = login_res.json()["refresh"]

        refresh_res = client.post(
            "/api/v1/auth/refresh/",
            {"refresh": refresh_token},
            content_type="application/json",
        )
        assert refresh_res.status_code == 200
        assert "access" in refresh_res.json()

    def test_me_authenticated(self, client, test_user):
        login_res = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        access = login_res.json()["access"]

        response = client.get(
            "/api/v1/auth/me/",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@demo.local"
        assert data["first_name"] == "Test"
        assert data["last_name"] == "User"
        assert data["role"] == "FACULTY"
        assert data["department_code"] == "CSE"

    def test_me_unauthenticated(self, client):
        response = client.get("/api/v1/auth/me/")
        assert response.status_code == 401

    def test_change_password_success(self, client, test_user):
        login_res = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        access = login_res.json()["access"]

        response = client.post(
            "/api/v1/auth/change-password/",
            {"old_password": "TestPassword@123", "new_password": "NewSecretPassword@999"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert response.status_code == 200

        # Verify old password no longer works
        failed_login = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        assert failed_login.status_code == 401

        # Verify new password works
        success_login = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "NewSecretPassword@999"},
            content_type="application/json",
        )
        assert success_login.status_code == 200

    def test_change_password_wrong_old(self, client, test_user):
        login_res = client.post(
            "/api/v1/auth/login/",
            {"email": "testuser@demo.local", "password": "TestPassword@123"},
            content_type="application/json",
        )
        access = login_res.json()["access"]

        response = client.post(
            "/api/v1/auth/change-password/",
            {"old_password": "WrongOldPassword", "new_password": "NewSecretPassword@999"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {access}",
        )
        assert response.status_code == 400
