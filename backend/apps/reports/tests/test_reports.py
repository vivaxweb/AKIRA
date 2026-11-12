import pytest
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from apps.accounts.models import User, Department, StudentProfile, FacultyProfile


@pytest.fixture
def api_client():
    return APIClient()
from apps.academics.models import ClassGroup, Subject, AttendanceSession, AttendanceRecord, Assessment, Mark
from apps.reports.models import AccreditationCriteria, EvidenceLink
from apps.projects.models import Project


@pytest.fixture
def test_setup(db):
    dept = Department.objects.create(code="CSE", name="Computer Science & Engineering")
    hod = User.objects.create_user(
        email="hod_test@demo.local",
        password="TestPassword@123",
        role=User.Role.HOD,
        department=dept,
        first_name="HOD",
        last_name="Tester",
    )
    faculty = User.objects.create_user(
        email="faculty_test@demo.local",
        password="TestPassword@123",
        role=User.Role.FACULTY,
        department=dept,
        first_name="Faculty",
        last_name="Tester",
    )
    student_user = User.objects.create_user(
        email="student_test@demo.local",
        password="TestPassword@123",
        role=User.Role.STUDENT,
        department=dept,
        first_name="Student",
        last_name="Tester",
    )
    other_student_user = User.objects.create_user(
        email="other_student@demo.local",
        password="TestPassword@123",
        role=User.Role.STUDENT,
        department=dept,
        first_name="Other",
        last_name="Student",
    )

    cg = ClassGroup.objects.create(
        department=dept,
        name="TE-CSE",
        division="A",
        year=3,
        semester=5,
        academic_year="2026-27",
    )

    st_profile = StudentProfile.objects.create(
        user=student_user,
        roll_no="26CS101",
        class_group=cg,
        admission_year=2024,
    )
    other_profile = StudentProfile.objects.create(
        user=other_student_user,
        roll_no="26CS102",
        class_group=cg,
        admission_year=2024,
    )

    subject = Subject.objects.create(
        code="CS501",
        name="Database Management Systems",
        class_group=cg,
        faculty=faculty,
        credits=4,
    )

    # Attendance
    session = AttendanceSession.objects.create(
        subject=subject,
        date="2026-10-10",
        slot=1,
        marked_by=faculty,
    )
    AttendanceRecord.objects.create(
        session=session,
        student=st_profile,
        status=AttendanceRecord.Status.PRESENT,
    )
    AttendanceRecord.objects.create(
        session=session,
        student=other_profile,
        status=AttendanceRecord.Status.ABSENT,
    )

    # Assessment & marks
    assessment = Assessment.objects.create(
        subject=subject,
        name="CIE-1",
        max_marks=Decimal("20.00"),
        date="2026-10-15",
        is_published=True,
    )
    Mark.objects.create(
        assessment=assessment,
        student=st_profile,
        marks_obtained=Decimal("17.50"),
    )
    Mark.objects.create(
        assessment=assessment,
        student=other_profile,
        marks_obtained=Decimal("8.00"),
    )

    # Criteria
    crit = AccreditationCriteria.objects.create(
        department=dept,
        code="C1",
        title="Vision and Mission",
        max_marks=50,
        obtained_marks=Decimal("45.00"),
        status=AccreditationCriteria.Status.COMPLIANT,
    )
    EvidenceLink.objects.create(
        criteria=crit,
        title="Vision Mission Document",
        added_by=hod,
    )

    return {
        "dept": dept,
        "hod": hod,
        "faculty": faculty,
        "student_user": student_user,
        "student_profile": st_profile,
        "other_student_user": other_student_user,
        "other_profile": other_profile,
        "class_group": cg,
        "subject": subject,
        "criteria": crit,
    }


@pytest.mark.django_db
def test_attendance_excel_export(api_client, test_setup):
    """Verifies that faculty can export the attendance matrix as an XLSX spreadsheet."""
    api_client.force_authenticate(user=test_setup["faculty"])
    url = f"/api/v1/reports/attendance-export/?subject_id={test_setup['subject'].id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert "attachment; filename=" in response["Content-Disposition"]
    # Check XLSX zip header PK
    assert response.content.startswith(b"PK")


@pytest.mark.django_db
def test_marks_excel_export(api_client, test_setup):
    """Verifies internal marks spreadsheet export in XLSX format."""
    api_client.force_authenticate(user=test_setup["faculty"])
    url = f"/api/v1/reports/marks-export/?subject_id={test_setup['subject'].id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert response.content.startswith(b"PK")


@pytest.mark.django_db
def test_copo_attainment_excel_export(api_client, test_setup):
    """Verifies CO-PO attainment calculation export in XLSX format."""
    api_client.force_authenticate(user=test_setup["faculty"])
    url = f"/api/v1/reports/copo-export/?subject_id={test_setup['subject'].id}"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert response.content.startswith(b"PK")


@pytest.mark.django_db
def test_student_progress_pdf_export(api_client, test_setup):
    """Verifies student and staff PDF progress report generation."""
    # 1. Student downloads own report
    api_client.force_authenticate(user=test_setup["student_user"])
    url = "/api/v1/reports/student-progress-pdf/"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response["Content-Type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
    assert f"progress_report_{test_setup['student_profile'].roll_no}.pdf" in response["Content-Disposition"]

    # 2. Faculty downloads specific student's report
    api_client.force_authenticate(user=test_setup["faculty"])
    url_staff = f"/api/v1/reports/student-progress-pdf/?student_id={test_setup['student_profile'].id}"
    response_staff = api_client.get(url_staff)
    assert response_staff.status_code == status.HTTP_200_OK
    assert response_staff["Content-Type"] == "application/pdf"
    assert response_staff.content.startswith(b"%PDF-")


@pytest.mark.django_db
def test_executive_dashboard_kpis(api_client, test_setup):
    """Verifies executive KPI metrics aggregation for Principal and HOD."""
    api_client.force_authenticate(user=test_setup["hod"])
    url = "/api/v1/reports/executive-dashboard/"
    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    data = response.data
    assert "total_students" in data
    assert data["total_students"] >= 2
    assert "avg_attendance" in data
    assert "high_risk_students_count" in data
    assert "nba_compliance_rate" in data
    assert "nba_summary" in data
    assert data["nba_summary"]["total_criteria"] >= 1


@pytest.mark.django_db
def test_accreditation_criteria_permissions(api_client, test_setup):
    """Verifies role permissions for accreditation criteria and evidence linking."""
    # 1. Student can list criteria (read-only)
    api_client.force_authenticate(user=test_setup["student_user"])
    url = "/api/v1/reports/criteria/"
    res_list = api_client.get(url)
    assert res_list.status_code == status.HTTP_200_OK

    # 2. Student cannot create criteria
    res_create = api_client.post(url, {"code": "C10", "title": "Unauthorized", "max_marks": 50})
    assert res_create.status_code == status.HTTP_403_FORBIDDEN

    # 3. HOD can create criteria
    api_client.force_authenticate(user=test_setup["hod"])
    res_hod_create = api_client.post(url, {
        "code": "C2",
        "title": "Teaching-Learning",
        "max_marks": 100,
        "status": "COMPLIANT",
    })
    assert res_hod_create.status_code == status.HTTP_201_CREATED
    crit_id = res_hod_create.data["id"]

    # 4. HOD can link evidence
    ev_url = "/api/v1/reports/evidence/"
    res_ev = api_client.post(ev_url, {
        "criteria": crit_id,
        "title": "Curriculum Syllabus Copy",
        "description": "Board of studies approved scheme.",
    })
    assert res_ev.status_code == status.HTTP_201_CREATED
