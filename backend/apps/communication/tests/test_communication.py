import pytest
from datetime import timedelta
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.accounts.models import Department
from apps.communication.models import Notice, DepartmentEvent, DepartmentDocument

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department(db):
    dept, _ = Department.objects.get_or_create(name="Computer Science & Engineering", code="CSE")
    return dept


@pytest.fixture
def users(db, department):
    pwd = "TestPassword@123"
    hod = User.objects.create_user(
        email="hod_comm@demo.local",
        password=pwd,
        role=User.Role.HOD,
        department=department,
        first_name="HOD",
        last_name="CSE",
    )
    faculty = User.objects.create_user(
        email="faculty_comm@demo.local",
        password=pwd,
        role=User.Role.FACULTY,
        department=department,
        first_name="Faculty",
        last_name="Member",
    )
    student = User.objects.create_user(
        email="student_comm@demo.local",
        password=pwd,
        role=User.Role.STUDENT,
        department=department,
        first_name="Student",
        last_name="User",
    )
    return {
        "hod": hod,
        "faculty": faculty,
        "student": student,
    }


@pytest.mark.django_db
class TestNoticeManagement:
    def test_faculty_can_publish_notice(self, api_client, users, department):
        api_client.force_authenticate(user=users["faculty"])
        payload = {
            "title": "CIE-2 Exam Schedule Released",
            "content": "All students must report 15 minutes before the scheduled exam.",
            "category": Notice.Category.EXAM,
            "priority": Notice.Priority.URGENT,
            "is_pinned": True,
            "target_roles": ["STUDENT"],
        }
        resp = api_client.post("/api/v1/communication/notices/", payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == payload["title"]
        assert resp.data["priority"] == Notice.Priority.URGENT
        assert resp.data["is_pinned"] is True

    def test_student_cannot_publish_notice(self, api_client, users):
        api_client.force_authenticate(user=users["student"])
        payload = {
            "title": "Unauthorized Notice",
            "content": "This should be forbidden.",
            "category": Notice.Category.GENERAL,
        }
        resp = api_client.post("/api/v1/communication/notices/", payload, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_role_scoped_notice_visibility(self, api_client, users, department):
        # Notice for faculty only
        Notice.objects.create(
            department=department,
            title="Faculty Meeting Agenda",
            content="Confidential discussion on NBA audit.",
            category=Notice.Category.ACADEMIC,
            target_roles=["FACULTY", "HOD"],
            published_by=users["hod"],
        )
        # Notice for students
        Notice.objects.create(
            department=department,
            title="Internship Drive Info",
            content="Open to all 3rd year students.",
            category=Notice.Category.PLACEMENT,
            target_roles=["STUDENT"],
            published_by=users["faculty"],
        )

        # Student query
        api_client.force_authenticate(user=users["student"])
        resp = api_client.get("/api/v1/communication/notices/")
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        titles = [n["title"] for n in results]
        assert "Internship Drive Info" in titles
        assert "Faculty Meeting Agenda" not in titles


@pytest.mark.django_db
class TestDepartmentEvents:
    def test_faculty_can_create_event(self, api_client, users, department):
        api_client.force_authenticate(user=users["faculty"])
        now = timezone.now()
        payload = {
            "title": "Guest Lecture on Cloud-Native DevOps",
            "description": "Industry speaker from AWS.",
            "event_type": DepartmentEvent.EventType.WORKSHOP,
            "start_datetime": now.isoformat(),
            "end_datetime": (now + timedelta(hours=2)).isoformat(),
            "location": "Seminar Hall B",
        }
        resp = api_client.post("/api/v1/communication/events/", payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["title"] == payload["title"]

    def test_student_cannot_create_event(self, api_client, users):
        api_client.force_authenticate(user=users["student"])
        payload = {
            "title": "Student Organized Event",
            "event_type": DepartmentEvent.EventType.OTHER,
            "start_datetime": timezone.now().isoformat(),
        }
        resp = api_client.post("/api/v1/communication/events/", payload, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestDocumentLibrary:
    def test_document_upload_and_download_tracking(self, api_client, users, department):
        api_client.force_authenticate(user=users["faculty"])
        dummy_file = SimpleUploadedFile("syllabus_2026.pdf", b"%PDF-1.4 Mock PDF Content", content_type="application/pdf")
        payload = {
            "title": "B.Tech CSE Syllabus 2026-27",
            "description": "Official autonomous curriculum.",
            "category": DepartmentDocument.Category.SYLLABUS,
            "file": dummy_file,
            "version": "1.0",
            "allowed_roles": [],
        }
        resp = api_client.post("/api/v1/communication/documents/", payload, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED
        doc_id = resp.data["id"]
        assert resp.data["file_type"] == "PDF"

        # Record download
        api_client.force_authenticate(user=users["student"])
        dl_resp = api_client.post(f"/api/v1/communication/documents/{doc_id}/download/")
        assert dl_resp.status_code == status.HTTP_200_OK
        assert dl_resp.data["download_count"] == 1

    def test_confidential_document_hidden_from_students(self, api_client, users, department):
        dummy_file = SimpleUploadedFile("exam_paper.pdf", b"%PDF-1.4 Question Paper", content_type="application/pdf")
        doc = DepartmentDocument.objects.create(
            department=department,
            title="Confidential End-Sem Question Paper",
            category=DepartmentDocument.Category.QUESTION_PAPER,
            file=dummy_file,
            allowed_roles=["FACULTY", "HOD"],
            uploaded_by=users["faculty"],
        )

        # Student query
        api_client.force_authenticate(user=users["student"])
        list_resp = api_client.get("/api/v1/communication/documents/")
        results = list_resp.data if isinstance(list_resp.data, list) else list_resp.data.get("results", [])
        doc_ids = [d["id"] for d in results]
        assert doc.id not in doc_ids

        # Faculty query sees it
        api_client.force_authenticate(user=users["faculty"])
        fac_resp = api_client.get("/api/v1/communication/documents/")
        fac_results = fac_resp.data if isinstance(fac_resp.data, list) else fac_resp.data.get("results", [])
        fac_doc_ids = [d["id"] for d in fac_results]
        assert doc.id in fac_doc_ids
