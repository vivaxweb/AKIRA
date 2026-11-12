import pytest
from datetime import date
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import Department, User, StudentProfile, FacultyProfile
from apps.academics.models import ClassGroup, Subject, AttendanceSession, AttendanceRecord, Assessment, Mark
from apps.insights.models import Intervention
from apps.insights.services import (
    calculate_student_risk_profile,
    get_students_risk_list,
    get_student_analytics_summary,
    get_faculty_workload_analytics,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_headers():
    def _auth(user):
        refresh = RefreshToken.for_user(user)
        return {"HTTP_AUTHORIZATION": f"Bearer {refresh.access_token}"}
    return _auth


@pytest.fixture
def insights_setup():
    dept = Department.objects.create(code="CSE", name="Computer Science")
    cg = ClassGroup.objects.create(name="TE-CSE", year=3, academic_year="2026-27", semester=5, department=dept)

    hod = User.objects.create_user(
        email="hod_test@demo.local",
        password="Test@12345",
        role="HOD",
        department=dept,
        first_name="HOD",
        last_name="Test",
    )
    FacultyProfile.objects.create(user=hod, employee_id="EMP_HOD")

    faculty = User.objects.create_user(
        email="faculty_test@demo.local",
        password="Test@12345",
        role="FACULTY",
        department=dept,
        first_name="Faculty",
        last_name="Test",
    )
    FacultyProfile.objects.create(user=faculty, employee_id="EMP_FAC1")

    # Subject
    subj = Subject.objects.create(
        code="CS501",
        name="Database Systems",
        class_group=cg,
        faculty=faculty,
        credits=4,
    )

    # Student 1: Normal / On track
    s1 = User.objects.create_user(
        email="s1@demo.local", password="Test@12345", role="STUDENT", department=dept, first_name="Alice", last_name="Student"
    )
    sp1 = StudentProfile.objects.create(user=s1, class_group=cg, roll_no="23CSE001", admission_year=2023)

    # Student 2: Low attendance (<75%)
    s2 = User.objects.create_user(
        email="s2@demo.local", password="Test@12345", role="STUDENT", department=dept, first_name="Bob", last_name="Student"
    )
    sp2 = StudentProfile.objects.create(user=s2, class_group=cg, roll_no="23CSE002", admission_year=2023)

    # Student 3: Grade drop (CIE 1: 80% -> CIE 2: 40% = 40% drop)
    s3 = User.objects.create_user(
        email="s3@demo.local", password="Test@12345", role="STUDENT", department=dept, first_name="Charlie", last_name="Student"
    )
    sp3 = StudentProfile.objects.create(user=s3, class_group=cg, roll_no="23CSE003", admission_year=2023)

    # Attendance: 10 sessions
    for i in range(1, 11):
        sess = AttendanceSession.objects.create(
            subject=subj,
            date=date(2026, 8, i),
            slot=1,
            marked_by=faculty,
        )
        # s1 attends 10/10 = 100%
        AttendanceRecord.objects.create(session=sess, student=sp1, status="PRESENT")
        # s2 attends 5/10 = 50% (<75%)
        AttendanceRecord.objects.create(session=sess, student=sp2, status="PRESENT" if i <= 5 else "ABSENT")
        # s3 attends 9/10 = 90%
        AttendanceRecord.objects.create(session=sess, student=sp3, status="PRESENT" if i <= 9 else "ABSENT")

    # Assessments: CIE 1 (max 30), CIE 2 (max 30)
    cie1 = Assessment.objects.create(
        subject=subj, name="CIE 1", kind="CIE", max_marks=30, is_published=True, date=date(2026, 8, 15)
    )
    cie2 = Assessment.objects.create(
        subject=subj, name="CIE 2", kind="CIE", max_marks=30, is_published=True, date=date(2026, 9, 15)
    )

    # Marks:
    # s1: 24/30 (80%) in CIE 1, 24/30 (80%) in CIE 2
    Mark.objects.create(assessment=cie1, student=sp1, marks_obtained=24)
    Mark.objects.create(assessment=cie2, student=sp1, marks_obtained=24)

    # s2: 18/30 (60%) in CIE 1, 18/30 (60%) in CIE 2
    Mark.objects.create(assessment=cie1, student=sp2, marks_obtained=18)
    Mark.objects.create(assessment=cie2, student=sp2, marks_obtained=18)

    # s3: 24/30 (80%) in CIE 1, 12/30 (40%) in CIE 2 -> 40% drop >= 15% threshold!
    Mark.objects.create(assessment=cie1, student=sp3, marks_obtained=24)
    Mark.objects.create(assessment=cie2, student=sp3, marks_obtained=12)

    return {
        "dept": dept,
        "cg": cg,
        "hod": hod,
        "faculty": faculty,
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "subj": subj,
    }


@pytest.mark.django_db
class TestRiskClassificationEngine:
    def test_low_attendance_flagged(self, insights_setup):
        s2 = insights_setup["s2"]
        profile = calculate_student_risk_profile(s2)
        assert profile["overall_attendance_pct"] == 50.0
        assert profile["risk_flags"]["attendance"] is True
        assert profile["risk_level"] in ["HIGH", "MEDIUM"]
        assert any("attendance" in r.lower() for r in profile["risk_reasons"])

    def test_grade_drop_flagged(self, insights_setup):
        s3 = insights_setup["s3"]
        profile = calculate_student_risk_profile(s3)
        assert profile["risk_flags"]["grade_drop"] is True
        assert len(profile["grade_drops"]) == 1
        assert profile["grade_drops"][0]["drop"] == 40.0
        assert any("grade dropped" in r.lower() for r in profile["risk_reasons"])

    def test_normal_student_on_track(self, insights_setup):
        s1 = insights_setup["s1"]
        profile = calculate_student_risk_profile(s1)
        assert profile["risk_level"] == "LOW"
        assert profile["risk_flags"]["attendance"] is False
        assert profile["risk_flags"]["grade_drop"] is False
        assert profile["risk_flags"]["failing"] is False


@pytest.mark.django_db
class TestInsightsEndpoints:
    def test_student_risk_list_endpoint(self, api_client, auth_headers, insights_setup):
        hod = insights_setup["hod"]
        res = api_client.get("/api/v1/insights/student-risk/", **auth_headers(hod))
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 3
        # Should be sorted with high/medium risk first
        assert data[0]["risk_level"] in ["HIGH", "MEDIUM"]

    def test_student_forbidden_from_risk_list(self, api_client, auth_headers, insights_setup):
        s1 = insights_setup["s1"]
        res = api_client.get("/api/v1/insights/student-risk/", **auth_headers(s1))
        assert res.status_code == 403

    def test_student_analytics_class_summary(self, api_client, auth_headers, insights_setup):
        faculty = insights_setup["faculty"]
        cg = insights_setup["cg"]
        res = api_client.get(f"/api/v1/insights/student-analytics/?class_group_id={cg.id}", **auth_headers(faculty))
        assert res.status_code == 200
        data = res.json()
        assert "total_students" in data
        assert "scatter_points" in data
        assert "risk_breakdown" in data
        assert len(data["scatter_points"]) >= 3

    def test_student_can_view_own_analytics(self, api_client, auth_headers, insights_setup):
        s3 = insights_setup["s3"]
        res = api_client.get("/api/v1/insights/student-analytics/", **auth_headers(s3))
        assert res.status_code == 200
        data = res.json()
        assert "student_profile" in data
        assert data["student_profile"]["student_id"] == s3.id
        assert "timeline" in data

    def test_faculty_workload_endpoint(self, api_client, auth_headers, insights_setup):
        hod = insights_setup["hod"]
        res = api_client.get("/api/v1/insights/faculty-workload/", **auth_headers(hod))
        assert res.status_code == 200
        data = res.json()
        assert "faculty" in data
        assert data["faculty_count"] >= 1
        assert data["faculty"][0]["weekly_teaching_hours"] >= 4

    def test_intervention_crud_and_resolve(self, api_client, auth_headers, insights_setup):
        faculty = insights_setup["faculty"]
        s2 = insights_setup["s2"]

        # Create intervention
        payload = {
            "student": s2.id,
            "intervention_type": "ATTENDANCE_WARNING",
            "reason": "Attendance below 75%",
            "remarks": "Parent contacted, warning notice issued.",
            "status": "PLANNED",
        }
        res = api_client.post("/api/v1/insights/interventions/", payload, format="json", **auth_headers(faculty))
        assert res.status_code == 201
        int_id = res.json()["id"]

        # Resolve intervention
        resolve_payload = {
            "action_taken": "Student agreed to attend weekend makeup classes.",
            "status": "RESOLVED",
        }
        res_resolve = api_client.post(
            f"/api/v1/insights/interventions/{int_id}/resolve/",
            resolve_payload,
            format="json",
            **auth_headers(faculty)
        )
        assert res_resolve.status_code == 200
        assert res_resolve.json()["status"] == "RESOLVED"
        assert res_resolve.json()["action_taken"] == "Student agreed to attend weekend makeup classes."
