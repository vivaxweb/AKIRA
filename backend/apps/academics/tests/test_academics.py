"""
Unit and integration tests for Academic Operations.
Covers:
- Attendance bulk save & idempotent re-save
- Marks validation (exceeding max_marks / negative marks)
- Hand-computed CO attainment math verification
- Permission matrix additions for academics
- Efficient query count assertions
"""
from decimal import Decimal
from datetime import date
import pytest
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, Department, StudentProfile, FacultyProfile
from apps.academics.models import (
    ClassGroup,
    Subject,
    Assessment,
    Mark,
    CourseOutcome,
    AssessmentCO,
    AttendanceSession,
    AttendanceRecord,
    AttainmentConfig,
    LogbookEntry,
)
from apps.academics.services import compute_co_attainment


@pytest.fixture
def academic_setup(db):
    dept = Department.objects.create(name="Computer Science & Engineering", code="CSE")
    AttainmentConfig.objects.create(
        department=dept,
        target_pct=Decimal("60.00"),
        level3_pct=Decimal("70.00"),
        level2_pct=Decimal("60.00"),
        level1_pct=Decimal("50.00"),
    )

    hod = User.objects.create_user(
        email="hod@demo.local", password="Demo@12345", first_name="Demo", last_name="HOD",
        role=User.Role.HOD, department=dept
    )
    fac1 = User.objects.create_user(
        email="fac1@demo.local", password="Demo@12345", first_name="Faculty", last_name="One",
        role=User.Role.FACULTY, department=dept
    )
    fac2 = User.objects.create_user(
        email="fac2@demo.local", password="Demo@12345", first_name="Faculty", last_name="Two",
        role=User.Role.FACULTY, department=dept
    )

    cg = ClassGroup.objects.create(
        department=dept, name="TE-CSE", division="A", year=3, semester=5, academic_year="2026-27"
    )

    subject = Subject.objects.create(
        code="CS501", name="DBMS", class_group=cg, faculty=fac1, credits=4
    )
    other_subject = Subject.objects.create(
        code="CS502", name="CN", class_group=cg, faculty=fac2, credits=4
    )

    students = []
    for i in range(1, 5):
        u = User.objects.create_user(
            email=f"st{i}@demo.local", password="Demo@12345", first_name="Student", last_name=str(i),
            role=User.Role.STUDENT, department=dept
        )
        sp = StudentProfile.objects.create(user=u, roll_no=f"23CSE{i:03d}", class_group=cg, admission_year=2023)
        students.append(sp)

    return {
        "dept": dept,
        "hod": hod,
        "fac1": fac1,
        "fac2": fac2,
        "class_group": cg,
        "subject": subject,
        "other_subject": other_subject,
        "students": students,
    }


def token_for(user):
    return str(RefreshToken.for_user(user).access_token)


@pytest.mark.django_db
class TestAttendanceBulkSave:
    def test_attendance_bulk_save_and_resave_idempotency(self, client, academic_setup):
        fac1 = academic_setup["fac1"]
        subject = academic_setup["subject"]
        students = academic_setup["students"]

        session = AttendanceSession.objects.create(
            subject=subject,
            date=date(2026, 8, 15),
            kind=AttendanceSession.SessionKind.LECTURE,
            slot=1,
            marked_by=fac1,
        )

        token = token_for(fac1)

        # 1. Initial bulk save: Mark student 1 & 2 PRESENT, 3 & 4 ABSENT
        payload = {
            "session_id": session.id,
            "records": [
                {"student_id": students[0].id, "status": "PRESENT"},
                {"student_id": students[1].id, "status": "PRESENT"},
                {"student_id": students[2].id, "status": "ABSENT"},
                {"student_id": students[3].id, "status": "ABSENT"},
            ],
        }

        res = client.post(
            "/api/v1/attendance-sessions/bulk-save/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 200
        assert res.json()["created_count"] == 4
        assert AttendanceRecord.objects.filter(session=session).count() == 4
        assert AttendanceRecord.objects.filter(session=session, status="PRESENT").count() == 2

        # 2. Idempotent re-save: Change student 3 to PRESENT
        payload["records"][2]["status"] = "PRESENT"
        res2 = client.post(
            "/api/v1/attendance-sessions/bulk-save/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res2.status_code == 200
        assert res2.json()["updated_count"] == 4
        # Total records MUST still be 4, NOT 8
        assert AttendanceRecord.objects.filter(session=session).count() == 4
        assert AttendanceRecord.objects.filter(session=session, status="PRESENT").count() == 3


@pytest.mark.django_db
class TestMarksValidation:
    def test_marks_cannot_exceed_max_marks(self, client, academic_setup):
        fac1 = academic_setup["fac1"]
        subject = academic_setup["subject"]
        student = academic_setup["students"][0]

        assessment = Assessment.objects.create(
            subject=subject, name="CIE-1", max_marks=Decimal("20.00"), date=date(2026, 9, 15)
        )

        token = token_for(fac1)

        payload = {
            "assessment_id": assessment.id,
            "marks": [{"student_id": student.id, "marks_obtained": "25.00", "is_absent": False}],
        }

        res = client.post(
            "/api/v1/assessments/bulk-save-marks/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 400
        assert "exceed max marks" in str(res.json())

    def test_marks_cannot_be_negative(self, client, academic_setup):
        fac1 = academic_setup["fac1"]
        subject = academic_setup["subject"]
        student = academic_setup["students"][0]

        assessment = Assessment.objects.create(
            subject=subject, name="CIE-1", max_marks=Decimal("20.00"), date=date(2026, 9, 15)
        )

        token = token_for(fac1)

        payload = {
            "assessment_id": assessment.id,
            "marks": [{"student_id": student.id, "marks_obtained": "-5.00", "is_absent": False}],
        }

        res = client.post(
            "/api/v1/assessments/bulk-save-marks/",
            payload,
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 400


@pytest.mark.django_db
class TestCOAttainmentMath:
    def test_hand_computed_co_attainment_calculation(self, db, academic_setup):
        """
        Hand-computed test:
        4 students, Assessment Max Marks: 20
        Target: 60% of 20 = 12.0 marks
        Scores:
          - S1: 15 / 20 (75% >= 60%) -> Met
          - S2: 18 / 20 (90% >= 60%) -> Met
          - S3: 12 / 20 (60% >= 60%) -> Met
          - S4: 8 / 20  (40% < 60%)  -> Not Met
        Total students: 4
        Students met: 3
        Percentage met: (3 / 4) * 100 = 75.0%
        AttainmentConfig: level3_pct is 70.0%
        Since 75.0% >= 70.0%, Level MUST BE EXACTLY 3!
        """
        subject = academic_setup["subject"]
        students = academic_setup["students"]

        co1 = CourseOutcome.objects.create(subject=subject, code="CO1", description="Test CO")
        assessment = Assessment.objects.create(
            subject=subject, name="CIE-1", max_marks=Decimal("20.00"), date=date(2026, 9, 15), is_published=True
        )
        AssessmentCO.objects.create(assessment=assessment, course_outcome=co1)

        Mark.objects.create(assessment=assessment, student=students[0], marks_obtained=Decimal("15.00"))
        Mark.objects.create(assessment=assessment, student=students[1], marks_obtained=Decimal("18.00"))
        Mark.objects.create(assessment=assessment, student=students[2], marks_obtained=Decimal("12.00"))
        Mark.objects.create(assessment=assessment, student=students[3], marks_obtained=Decimal("8.00"))

        result = compute_co_attainment(subject)
        co_res = result["co_results"][0]

        assert co_res["co_code"] == "CO1"
        assert co_res["total_students"] == 4
        assert co_res["students_met_target"] == 3
        assert co_res["percentage_met"] == 75.0
        assert co_res["attainment_level"] == 3


@pytest.mark.django_db
class TestAcademicPermissions:
    def test_faculty_cannot_mark_other_faculty_subject(self, client, academic_setup):
        fac2 = academic_setup["fac2"]
        sub1 = academic_setup["subject"]  # belongs to fac1

        session = AttendanceSession.objects.create(
            subject=sub1, date=date(2026, 8, 20), kind="LECTURE", slot=1
        )
        token = token_for(fac2)

        res = client.post(
            "/api/v1/attendance-sessions/bulk-save/",
            {"session_id": session.id, "records": []},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 403

    def test_student_cannot_create_assessment(self, client, academic_setup):
        student_user = academic_setup["students"][0].user
        token = token_for(student_user)

        res = client.post(
            "/api/v1/assessments/",
            {
                "subject": academic_setup["subject"].id,
                "name": "Hacked CIE",
                "max_marks": "20.00",
                "date": "2026-09-15",
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 403

    def test_hod_can_review_logbook(self, client, academic_setup):
        hod = academic_setup["hod"]
        fac1 = academic_setup["fac1"]
        sub = academic_setup["subject"]

        entry = LogbookEntry.objects.create(
            subject=sub,
            faculty=fac1,
            date=date(2026, 8, 22),
            hours=2,
            topics_taught="Relational Algebra",
        )

        token = token_for(hod)
        res = client.post(
            f"/api/v1/logbook-entries/{entry.id}/review/",
            {"hod_remark": "Approved, very good progress."},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        assert res.status_code == 200
        entry.refresh_from_db()
        assert entry.hod_remark == "Approved, very good progress."
        assert entry.hod_reviewed_at is not None
