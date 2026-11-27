"""
Comprehensive, idempotent demo data seeder.
Run via: python manage.py seed_demo [--reset]
Populates full academic dataset for B.Tech CSE Department (TKIET 2026-27).
"""
import random
from datetime import date, timedelta
from decimal import Decimal
from django.db import models
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.accounts.models import Department, User, StudentProfile, FacultyProfile
from apps.academics.models import (
    ClassGroup,
    Subject,
    SyllabusTopic,
    TopicCoverage,
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Mark,
    ProgramOutcome,
    CourseOutcome,
    COPOMapping,
    AssessmentCO,
    AttainmentConfig,
    LogbookEntry,
)
from django.core.files.base import ContentFile
from apps.insights.models import Intervention
from apps.projects.models import Project, ProjectMember, ProjectMilestone, SimilarityCheck
from apps.communication.models import Notice, DepartmentEvent, DepartmentDocument
from apps.reports.models import AccreditationCriteria, EvidenceLink
from apps.assistant.models import KnowledgeDocument, ChatMessage


STANDARD_POS = [
    ("PO1", "Engineering knowledge", "Apply the knowledge of mathematics, science, engineering fundamentals to the solution of complex engineering problems."),
    ("PO2", "Problem analysis", "Identify, formulate, review research literature, and analyze complex engineering problems."),
    ("PO3", "Design/development of solutions", "Design solutions for complex engineering problems and design system components or processes."),
    ("PO4", "Conduct investigations of complex problems", "Use research-based knowledge and research methods to provide valid conclusions."),
    ("PO5", "Modern tool usage", "Create, select, and apply appropriate techniques, resources, and modern engineering tools."),
    ("PO6", "The engineer and society", "Apply reasoning informed by the contextual knowledge to assess societal, health, safety issues."),
    ("PO7", "Environment and sustainability", "Understand the impact of the professional engineering solutions in societal and environmental contexts."),
    ("PO8", "Ethics", "Apply ethical principles and commit to professional ethics and responsibilities."),
    ("PO9", "Individual and team work", "Function effectively as an individual, and as a member or leader in diverse teams."),
    ("PO10", "Communication", "Communicate effectively on complex engineering activities with the engineering community."),
    ("PO11", "Project management and finance", "Demonstrate knowledge and understanding of the engineering and management principles."),
    ("PO12", "Life-long learning", "Recognize the need for, and have the preparation and ability to engage in independent life-long learning."),
]


class Command(BaseCommand):
    help = "Seed realistic demo data for Department Digital Hub (idempotent, supports --reset)"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo records before seeding")

    def handle(self, *args, **options):
        reset = options.get("reset", False)
        demo_password = "Demo@12345"

        if reset:
            ChatMessage.objects.all().delete()
            KnowledgeDocument.objects.all().delete()
            EvidenceLink.objects.all().delete()
            AccreditationCriteria.objects.all().delete()
            DepartmentDocument.objects.all().delete()
            DepartmentEvent.objects.all().delete()
            Notice.objects.all().delete()
            ProjectMilestone.objects.all().delete()
            ProjectMember.objects.all().delete()
            Project.objects.all().delete()
            Intervention.objects.all().delete()
            AttendanceRecord.objects.all().delete()
            AttendanceSession.objects.all().delete()
            Mark.objects.all().delete()
            AssessmentCO.objects.all().delete()
            Assessment.objects.all().delete()
            COPOMapping.objects.all().delete()
            CourseOutcome.objects.all().delete()
            TopicCoverage.objects.all().delete()
            SyllabusTopic.objects.all().delete()
            LogbookEntry.objects.all().delete()
            Subject.objects.all().delete()
            StudentProfile.objects.all().delete()
            FacultyProfile.objects.all().delete()
            ClassGroup.objects.all().delete()
            ProgramOutcome.objects.all().delete()
            User.objects.filter(models.Q(email__endswith="@demo.local") | models.Q(email__endswith="@tkietwarana.ac.in")).delete()
            Department.objects.filter(code__in=["CSE", "MECH"]).delete()
            self.stdout.write(self.style.SUCCESS("Purge complete."))

        # 1. Departments
        cse_dept, _ = Department.objects.get_or_create(
            code="CSE", defaults={"name": "Computer Science & Engineering"}
        )
        mech_dept, _ = Department.objects.get_or_create(
            code="MECH", defaults={"name": "Mechanical Engineering"}
        )

        # Department Attainment Configuration (Placeholders clearly marked)
        attainment_config, _ = AttainmentConfig.objects.get_or_create(
            department=cse_dept,
            defaults={
                "target_pct": Decimal("60.00"),
                "level3_pct": Decimal("70.00"),
                "level2_pct": Decimal("60.00"),
                "level1_pct": Decimal("50.00"),
                "pass_mark_pct": Decimal("40.00"),
                "min_attendance_pct": Decimal("75.00"),
            },
        )

        # 2. Program Outcomes (12 standard POs)
        for po_code, po_title, po_desc in STANDARD_POS:
            ProgramOutcome.objects.get_or_create(
                department=cse_dept,
                code=po_code,
                defaults={"title": po_title, "description": po_desc},
            )

        # 3. Staff accounts: Principal, HOD, Coordinator, Faculty members
        principal, _ = User.objects.get_or_create(
            email="principal@demo.local",
            defaults={"first_name": "Dr. D. N.", "last_name": "Mudgal", "role": User.Role.PRINCIPAL, "is_staff": True, "is_superuser": True},
        )
        principal.is_staff = True
        principal.is_superuser = True
        principal.set_password(demo_password)
        principal.save()

        # HOD: Dr. Patil Ramgouda. B.
        hod, _ = User.objects.get_or_create(
            email="hodcse@tkietwarana.ac.in",
            defaults={
                "first_name": "Ramgouda",
                "last_name": "Patil",
                "role": User.Role.HOD,
                "department": cse_dept,
                "phone": "9975419483",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        hod.first_name = "Ramgouda"
        hod.last_name = "Patil"
        hod.phone = "9975419483"
        hod.is_staff = True
        hod.is_superuser = True
        hod.set_password(demo_password)
        hod.save()
        FacultyProfile.objects.update_or_create(
            user=hod,
            defaults={"employee_id": "EMP-CSE-HOD", "designation": "Associate Professor and Head"},
        )

        # Legacy alias for HOD for evaluator and test convenience
        legacy_hod, _ = User.objects.get_or_create(
            email="hod@demo.local",
            defaults={
                "first_name": "Ramgouda",
                "last_name": "Patil",
                "role": User.Role.HOD,
                "department": cse_dept,
                "phone": "9975419483",
                "is_staff": True,
            },
        )
        legacy_hod.first_name = "Ramgouda"
        legacy_hod.last_name = "Patil"
        legacy_hod.phone = "9975419483"
        legacy_hod.set_password(demo_password)
        legacy_hod.save()
        FacultyProfile.objects.update_or_create(
            user=legacy_hod,
            defaults={"employee_id": "EMP-CSE-HOD-DEMO", "designation": "Associate Professor and Head"},
        )

        # Class Coordinator: Prof. Phalle Anil S.
        coordinator, _ = User.objects.get_or_create(
            email="asphalle@tkietwarana.ac.in",
            defaults={
                "first_name": "Anil",
                "last_name": "Phalle",
                "role": User.Role.COORDINATOR,
                "department": cse_dept,
                "phone": "9764638007",
            },
        )
        coordinator.first_name = "Anil"
        coordinator.last_name = "Phalle"
        coordinator.phone = "9764638007"
        coordinator.set_password(demo_password)
        coordinator.save()
        FacultyProfile.objects.update_or_create(
            user=coordinator,
            defaults={"employee_id": "EMP-CSE-COORD", "designation": "Associate Professor & Coordinator"},
        )

        legacy_coord, _ = User.objects.get_or_create(
            email="coordinator@demo.local",
            defaults={
                "first_name": "Anil",
                "last_name": "Phalle",
                "role": User.Role.COORDINATOR,
                "department": cse_dept,
                "phone": "9764638007",
            },
        )
        legacy_coord.first_name = "Anil"
        legacy_coord.last_name = "Phalle"
        legacy_coord.phone = "9764638007"
        legacy_coord.set_password(demo_password)
        legacy_coord.save()
        FacultyProfile.objects.update_or_create(
            user=legacy_coord,
            defaults={"employee_id": "EMP-CSE-COORD-DEMO", "designation": "Associate Professor & Coordinator"},
        )

        # Real CSE Faculty Roster
        # (email, first_name, last_name, employee_id, designation, phone)
        faculty_meta = [
            ("amol_patil@tkietwarana.ac.in", "Amol", "Patil", "EMP-CSE-001", "Assistant Professor", "9822558270"),
            ("srarlimatti@tkietwarana.ac.in", "Shivaleela", "Arlimatti", "EMP-CSE-002", "Professor", ""),
            ("dineshmirajkar@tkietwarana.ac.in", "Dinesh", "Mirajkar", "EMP-CSE-003", "Assistant Professor", "9225819159"),
            ("bsmagadum@tkietwarana.ac.in", "Bhagyashree", "Chougule", "EMP-CSE-004", "Assistant Professor", "8698248242"),
            ("huchchayyakelur@tkietwarana.ac.in", "Huchchayya", "Kelur", "EMP-CSE-005", "Assistant Professor", "8861253637"),
            ("vnpatil@tkietwarana.ac.in", "Vaibhav", "Patil", "EMP-CSE-006", "Assistant Professor", "9970985255"),
            ("knkamble@tkietwarana.ac.in", "Kanishka", "Kamble", "EMP-CSE-007", "Assistant Professor", "9922095130"),
            ("iitamboli@tkietwarana.ac.in", "Imran", "Tamboli", "EMP-CSE-008", "Assistant Professor", "9881748648"),
        ]

        faculty_members = []
        for email, fn, ln, emp_id, desig, phone in faculty_meta:
            f_user, _ = User.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "role": User.Role.FACULTY, "department": cse_dept, "phone": phone},
            )
            f_user.first_name = fn
            f_user.last_name = ln
            f_user.phone = phone
            f_user.set_password(demo_password)
            f_user.save()
            FacultyProfile.objects.update_or_create(user=f_user, defaults={"employee_id": emp_id, "designation": desig})
            faculty_members.append(f_user)

        # Legacy aliases for faculty1, faculty2, faculty3 for compatibility
        legacy_f1, _ = User.objects.get_or_create(
            email="faculty1@demo.local",
            defaults={"first_name": "Amol", "last_name": "Patil", "role": User.Role.FACULTY, "department": cse_dept, "phone": "9822558270"},
        )
        legacy_f1.first_name = "Amol"
        legacy_f1.last_name = "Patil"
        legacy_f1.phone = "9822558270"
        legacy_f1.set_password(demo_password)
        legacy_f1.save()
        FacultyProfile.objects.update_or_create(user=legacy_f1, defaults={"employee_id": "EMP-CSE-001-DEMO", "designation": "Assistant Professor"})

        legacy_f2, _ = User.objects.get_or_create(
            email="faculty2@demo.local",
            defaults={"first_name": "Shivaleela", "last_name": "Arlimatti", "role": User.Role.FACULTY, "department": cse_dept},
        )
        legacy_f2.first_name = "Shivaleela"
        legacy_f2.last_name = "Arlimatti"
        legacy_f2.set_password(demo_password)
        legacy_f2.save()
        FacultyProfile.objects.update_or_create(user=legacy_f2, defaults={"employee_id": "EMP-CSE-002-DEMO", "designation": "Professor"})

        legacy_f3, _ = User.objects.get_or_create(
            email="faculty3@demo.local",
            defaults={"first_name": "Dinesh", "last_name": "Mirajkar", "role": User.Role.FACULTY, "department": cse_dept, "phone": "9225819159"},
        )
        legacy_f3.first_name = "Dinesh"
        legacy_f3.last_name = "Mirajkar"
        legacy_f3.phone = "9225819159"
        legacy_f3.set_password(demo_password)
        legacy_f3.save()
        FacultyProfile.objects.update_or_create(user=legacy_f3, defaults={"employee_id": "EMP-CSE-003-DEMO", "designation": "Assistant Professor"})

        # 4. Class Groups
        te_cse_a, _ = ClassGroup.objects.get_or_create(
            department=cse_dept,
            name="TE-CSE",
            division="A",
            academic_year="2026-27",
            defaults={"year": 3, "semester": 5, "coordinator": coordinator},
        )
        if te_cse_a.coordinator != coordinator:
            te_cse_a.coordinator = coordinator
            te_cse_a.save()

        be_cse_a, _ = ClassGroup.objects.get_or_create(
            department=cse_dept,
            name="BE-CSE",
            division="A",
            academic_year="2026-27",
            defaults={"year": 4, "semester": 7, "coordinator": faculty_members[0]},
        )

        # 5. Real TKIET Students (Top from 2026-27 Roll Call List)
        # Format: (grn, roll, gender, first_name, last_name)
        # Student 01 is Vivek Desai (Roll 121); Roll 140 (Prathamesh Jadhav) & Roll 153 (Prathamesh Lohar) included
        real_students_data = [
            ("26MCA27161", "121", "Male", "Vivek", "Desai"),
            ("26MCA27176", "102", "Female", "Saniya", "Ambi"),
            ("26MCA27242", "103", "Female", "Sakshi", "Bade"),
            ("26MCA27237", "104", "Male", "Samir", "Bamnekar"),
            ("26MCA27238", "105", "Female", "Pradnya", "Barale"),
            ("26MCA27182", "106", "Female", "Mrunali", "Bhagat"),
            ("26MCA27230", "107", "Female", "Amruta", "Bhakte"),
            ("26MCA27229", "108", "Female", "Amruta", "Bhakte"),
            ("26MCA27186", "109", "Female", "Sanika", "Bhoite"),
            ("26MCA27194", "110", "Female", "Riya", "Bhosale"),
            ("26MCA27157", "111", "Female", "Monika", "Bodake"),
            ("26MCA27180", "112", "Female", "Sakshi", "Borgaonkar"),
            ("26MCA27179", "113", "Female", "Shweta", "Chavare"),
            ("26MCA27216", "114", "Male", "Akash", "Chougale"),
            ("26MCA27129", "115", "Female", "Vaishnavi", "Chougale"),
            ("26MCA27187", "116", "Male", "Abhishek", "Chougule"),
            ("26MCA27245", "117", "Female", "Snehal", "Chougule"),
            ("26MCA27149", "118", "Male", "Suprit", "Daingade"),
            ("26MCA27222", "119", "Female", "Shruti", "Dalavi"),
            ("26MCA27210", "120", "Male", "Sourabh", "Demanna"),
            ("26MCA27155", "101", "Female", "Sanika", "Ajamane"),
            ("26MCA27200", "122", "Female", "Vaidavi", "Deshmukh"),
            ("26MCA27152", "123", "Female", "Krutika", "Deshpande"),
            ("26MCA27226", "124", "Female", "Netra", "Devalkar"),
            ("26MCA27227", "125", "Female", "Payal", "Dhavale"),
            ("26MCA27166", "126", "Female", "Vaishnavi", "Etam"),
            ("26MCA27209", "127", "Male", "Sanket", "Gaikwad"),
            ("26MCA27241", "128", "Female", "Chaitra", "Gavali"),
            ("26MCA27228", "129", "Male", "Rohit", "Gawade"),
            ("26MCA27158", "130", "Male", "Aditya", "Ghewari"),
            ("26MCA27255", "131", "Male", "Rakesh", "Ghorpade"),
            ("26MCA27251", "132", "Male", "Adesh", "Girmal"),
            ("26MCA27213", "133", "Male", "Abhishek", "Godbole"),
            ("26MCA27215", "134", "Male", "Satej", "Gurav"),
            ("26MCA27139", "135", "Male", "Dipak", "Hande"),
            ("26MCA27177", "136", "Female", "Shraddha", "Hande"),
            ("26MCA27235", "137", "Female", "Puja", "Harane"),
            ("26MCA27247", "138", "Female", "Suhani", "Hucche"),
            ("26MCA27199", "139", "Female", "Nandini", "Jadhav"),
            ("26MCA27195", "140", "Male", "Prathamesh", "Jadhav"),
            ("26MCA27168", "141", "Female", "Shrutika", "Jadhav"),
            ("26MCA27214", "142", "Female", "Tanmayee", "Jadhav"),
            ("26MCA27212", "143", "Female", "Aarti", "Jangale"),
            ("26MCA27211", "144", "Female", "Pradnya", "Kadam"),
            ("26MCA27218", "145", "Female", "Anuja", "Kajave"),
            ("26MCA27153", "146", "Female", "Rajnandini", "Kamble"),
            ("26MCA27239", "147", "Female", "Shruti", "Kamble"),
            ("26MCA27165", "148", "Male", "Tanmay", "Kamble"),
            ("26MCA27159", "149", "Male", "Darshan", "Karagir"),
            ("26MCA27145", "150", "Female", "Pranoti", "Katkar"),
            ("26MCA27167", "153", "Male", "Prathamesh", "Lohar"),
        ]

        students = []
        for i, (grn, roll, gender, fn, ln) in enumerate(real_students_data, start=1):
            email = f"student{i:02d}@demo.local"
            roll_str = f"26MCA{roll}"
            cg = te_cse_a if i <= 35 else be_cse_a
            s_user, _ = User.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "role": User.Role.STUDENT, "department": cse_dept},
            )
            s_user.first_name = fn
            s_user.last_name = ln
            s_user.set_password(demo_password)
            s_user.save()
            sp, _ = StudentProfile.objects.update_or_create(
                user=s_user,
                defaults={"roll_no": roll_str, "class_group": cg, "admission_year": 2026},
            )
            students.append(sp)

        student_by_roll = {sp.roll_no: sp for sp in students}

        # 6. Subjects (6 subjects)
        subjects_data = [
            ("CS501", "Database Management Systems", te_cse_a, faculty_members[0], 4),
            ("CS502", "Computer Networks", te_cse_a, faculty_members[2], 4),
            ("CS503", "Theory of Computation", te_cse_a, faculty_members[4], 3),
            ("CS504", "Advanced Java Programming", te_cse_a, coordinator, 3),
            ("CS701", "Cloud Computing", be_cse_a, faculty_members[5], 4),
            ("CS702", "Artificial Intelligence", be_cse_a, faculty_members[1], 4),
        ]
        created_subjects = []
        for code, name, cg, fac, cred in subjects_data:
            sub, _ = Subject.objects.get_or_create(
                code=code,
                class_group=cg,
                defaults={"name": name, "faculty": fac, "credits": cred, "is_active": True},
            )
            created_subjects.append(sub)

        dbms_subject = created_subjects[0]

        # 7. Syllabus Topics & Topic Coverage (for CS501 DBMS)
        topics_data = [
            (1, "Introduction to Database Systems & ER Modeling", 4, 1),
            (1, "Relational Data Model & Relational Algebra", 5, 2),
            (2, "SQL: DDL, DML, Complex Queries & Joins", 6, 1),
            (2, "Integrity Constraints & Triggers", 4, 2),
            (3, "Relational Database Design & Normalization (1NF to BCNF)", 6, 1),
            (4, "Transaction Processing, ACID Properties & Concurrency Control", 5, 1),
        ]
        dbms_topics = []
        for unit, title, hours, order in topics_data:
            top, _ = SyllabusTopic.objects.get_or_create(
                subject=dbms_subject,
                unit_no=unit,
                order=order,
                defaults={"title": title, "planned_hours": hours},
            )
            dbms_topics.append(top)

        # Mark first 3 topics as covered
        for i, top in enumerate(dbms_topics[:3]):
            TopicCoverage.objects.get_or_create(
                topic=top,
                defaults={
                    "covered_on": date(2026, 8, 10 + i * 7),
                    "covered_by": faculty_members[0],
                    "remarks": "Completed with lab exercises and classroom quizzes.",
                },
            )

        # 8. Course Outcomes & CO-PO Mappings for CS501
        co_data = [
            ("CO1", "Apply ER modeling and relational schema design to real-world database problems."),
            ("CO2", "Formulate complex database queries using standard Structured Query Language (SQL)."),
            ("CO3", "Design normalized database schemas adhering to normal forms up to BCNF."),
            ("CO4", "Analyze concurrency control protocols and transaction recovery mechanisms."),
        ]
        dbms_cos = []
        for co_code, desc in co_data:
            co_obj, _ = CourseOutcome.objects.get_or_create(
                subject=dbms_subject,
                code=co_code,
                defaults={"description": desc},
            )
            dbms_cos.append(co_obj)

        # Map COs to POs
        po1 = ProgramOutcome.objects.get(department=cse_dept, code="PO1")
        po2 = ProgramOutcome.objects.get(department=cse_dept, code="PO2")
        po3 = ProgramOutcome.objects.get(department=cse_dept, code="PO3")
        po5 = ProgramOutcome.objects.get(department=cse_dept, code="PO5")

        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[0], program_outcome=po1, defaults={"level": 3})
        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[0], program_outcome=po2, defaults={"level": 2})
        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[1], program_outcome=po3, defaults={"level": 3})
        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[1], program_outcome=po5, defaults={"level": 2})
        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[2], program_outcome=po2, defaults={"level": 3})
        COPOMapping.objects.get_or_create(course_outcome=dbms_cos[3], program_outcome=po3, defaults={"level": 2})

        # 9. Assessments & Marks (3 assessments for CS501: CIE-1, CIE-2, Assignment-1)
        assessments_info = [
            ("CIE-1", Assessment.Kind.CIE, Decimal("20.00"), Decimal("10.00"), date(2026, 9, 15), [dbms_cos[0], dbms_cos[1]]),
            ("CIE-2", Assessment.Kind.CIE, Decimal("20.00"), Decimal("10.00"), date(2026, 10, 20), [dbms_cos[2], dbms_cos[3]]),
            ("Assignment-1", Assessment.Kind.ASSIGNMENT, Decimal("10.00"), Decimal("5.00"), date(2026, 9, 30), [dbms_cos[1]]),
        ]
        created_assessments = []
        for a_name, a_kind, max_m, wt, a_date, linked_cos in assessments_info:
            assm, _ = Assessment.objects.get_or_create(
                subject=dbms_subject,
                name=a_name,
                defaults={"kind": a_kind, "max_marks": max_m, "weightage": wt, "date": a_date, "is_published": True},
            )
            for l_co in linked_cos:
                AssessmentCO.objects.get_or_create(assessment=assm, course_outcome=l_co)
            created_assessments.append(assm)

        # Realistic marks distribution for TE-CSE students (first 30 students)
        # Students 1-20: high performers (14-19 / 20)
        # Students 21-25: average performers (10-14 / 20)
        # Students 26-28: declining performers (CIE-1: 16, CIE-2: 8 -> >15 point drop to trigger risk rule!)
        # Students 29-30: failing / low attendance (5-7 / 20)
        te_students = [s for s in students if s.class_group == te_cse_a]
        for s_idx, st in enumerate(te_students):
            # CIE-1
            if s_idx < 20:
                score1 = Decimal(str(15 + (s_idx % 5)))
            elif s_idx < 25:
                score1 = Decimal(str(11 + (s_idx % 4)))
            elif s_idx in (25, 26, 27):
                score1 = Decimal("16.00")  # 80% on CIE-1
            else:
                score1 = Decimal("6.00")   # failing
            Mark.objects.update_or_create(
                assessment=created_assessments[0],
                student=st,
                defaults={"marks_obtained": score1, "is_absent": False},
            )

            # CIE-2
            if s_idx < 20:
                score2 = Decimal(str(16 + (s_idx % 4)))
            elif s_idx < 25:
                score2 = Decimal(str(12 + (s_idx % 3)))
            elif s_idx in (25, 26, 27):
                score2 = Decimal("8.00")   # 40% on CIE-2 -> 40% drop from 80% (>15% drop!)
            else:
                score2 = Decimal("7.00")   # failing
            Mark.objects.update_or_create(
                assessment=created_assessments[1],
                student=st,
                defaults={"marks_obtained": score2, "is_absent": False},
            )

            # Assignment-1 (out of 10)
            score_asn = Decimal(str(max(4, min(10, 7 + (s_idx % 4)))))
            Mark.objects.update_or_create(
                assessment=created_assessments[2],
                student=st,
                defaults={"marks_obtained": score_asn, "is_absent": False},
            )

        # 10. Attendance Sessions (22 sessions for CS501 across August to October 2026)
        start_date = date(2026, 8, 1)
        for s_num in range(1, 23):
            session_date = start_date + timedelta(days=(s_num * 3))
            session, _ = AttendanceSession.objects.get_or_create(
                subject=dbms_subject,
                date=session_date,
                kind=AttendanceSession.SessionKind.LECTURE,
                slot=1,
                defaults={
                    "marked_by": faculty_members[0],
                    "topic": dbms_topics[min(len(dbms_topics) - 1, s_num // 4)],
                },
            )

            records_to_create = []
            for s_idx, st in enumerate(te_students):
                # Students 28, 29, 30 are deliberately below 75% attendance
                if s_idx in (28, 29):
                    # attend only 10 out of 22 (~45%)
                    is_present = (s_num % 2 == 0) and (s_num <= 20)
                elif s_idx == 27:
                    # attend 15 out of 22 (68% < 75%)
                    is_present = s_num % 3 != 0
                else:
                    # attend >= 90%
                    is_present = s_num % 10 != 0

                status_val = AttendanceRecord.Status.PRESENT if is_present else AttendanceRecord.Status.ABSENT
                records_to_create.append(
                    AttendanceRecord(session=session, student=st, status=status_val)
                )

            # Bulk save attendance records
            AttendanceRecord.objects.filter(session=session).delete()
            AttendanceRecord.objects.bulk_create(records_to_create)

        # 11. Digital Logbook Entries
        for l_num in range(1, 11):
            log_date = start_date + timedelta(days=l_num * 6)
            is_reviewed = l_num <= 7
            LogbookEntry.objects.get_or_create(
                subject=dbms_subject,
                faculty=faculty_members[0],
                date=log_date,
                defaults={
                    "hours": 2,
                    "topics_taught": f"Unit {(l_num % 4) + 1} Lecture session {l_num}: Detailed conceptual discussion & live demonstrations.",
                    "remarks": "Active student participation. Practice assignment given.",
                    "hod_remark": "Satisfactory coverage and pace." if is_reviewed else "",
                    "hod_reviewed_at": timezone.now() if is_reviewed else None,
                },
            )

        # 12. Student Risk Interventions
        st26_user = students[25].user  # student26 (grade drop)
        st28_user = students[27].user  # student28 (attendance 68.2%)
        st29_user = students[28].user  # student29 (attendance 54.5%)

        Intervention.objects.get_or_create(
            student=st26_user,
            intervention_type=Intervention.InterventionType.COUNSELING,
            defaults={
                "reason": "Performance drop observed between CIE-1 and CIE-2 in DBMS.",
                "remarks": "One-on-one academic counseling held. Student experienced health issues during CIE-2 week. Guidance provided for remedial revision.",
                "status": Intervention.Status.IN_PROGRESS,
                "created_by": faculty_members[0],
            },
        )

        Intervention.objects.get_or_create(
            student=st28_user,
            intervention_type=Intervention.InterventionType.ATTENDANCE_WARNING,
            defaults={
                "reason": "Attendance dropped to 68.2%, below mandatory 75% cutoff.",
                "remarks": "Official attendance notice issued. Student informed of condonation criteria and required makeup lecture schedule.",
                "status": Intervention.Status.RESOLVED,
                "action_taken": "Student signed attendance undertaking and attended 4 makeup sessions.",
                "created_by": coordinator,
                "resolved_at": timezone.now(),
            },
        )

        Intervention.objects.get_or_create(
            student=st29_user,
            intervention_type=Intervention.InterventionType.REMEDIAL,
            defaults={
                "reason": "Critically low attendance (54.5%) and failed CIE-2 assessment.",
                "remarks": "Assigned to special remedial lab sessions every Saturday. Parent meeting scheduled for next week.",
                "status": Intervention.Status.PLANNED,
                "created_by": faculty_members[0],
            },
        )

        # 13. Projects & Milestones (Phase 5)
        demo_projects = [
            {
                "title": "Smart Automated Crop Disease Detection using Deep Convolutional Neural Networks",
                "abstract": "An automated agricultural inspection platform utilizing deep CNNs (ResNet-50 and MobileNetV3) for real-time leaf lesion classification. Integrated with edge cameras, providing farmers with disease diagnosis and recommended treatment remedies.",
                "domain": "Machine Learning",
                "batch_year": 2026,
                "guide": faculty_members[0],
                "leader": student_by_roll["26MCA121"].user,
                "members": [student_by_roll["26MCA140"].user, student_by_roll["26MCA153"].user],
                "status": Project.Status.APPROVED,
                "github_url": "https://github.com/tkiet-cse/crop-disease-detection",
                "live_url": "https://crop-ai.tkiet.ac.in",
                "completed_count": 3,
                "signed_off_count": 2,
            },
            {
                "title": "Decentralized Peer-to-Peer Renewable Energy Trading on Ethereum",
                "abstract": "Smart contract architecture enabling residential solar prosumers to auction excess photovoltaic energy peer-to-peer. Implements automated settlement using ERC-20 tokens with cryptographic micro-inverter verification.",
                "domain": "Blockchain",
                "batch_year": 2026,
                "guide": faculty_members[2],
                "leader": students[3].user,
                "members": [students[4].user],
                "status": Project.Status.IN_PROGRESS,
                "github_url": "https://github.com/tkiet-cse/energy-trading-eth",
                "live_url": "",
                "completed_count": 2,
                "signed_off_count": 2,
            },
            {
                "title": "Real-Time Traffic Congestion Optimization via YOLOv8 and Reinforcement Learning",
                "abstract": "Dynamic traffic signal timing controller driven by real-time vehicle density estimation using YOLOv8 computer vision. Deep Q-learning agents coordinate adjacent intersection green lights to minimize average queue wait times.",
                "domain": "Computer Vision",
                "batch_year": 2026,
                "guide": faculty_members[3],
                "leader": students[5].user,
                "members": [students[6].user, students[7].user],
                "status": Project.Status.APPROVED,
                "github_url": "https://github.com/tkiet-cse/smart-traffic-yolo",
                "live_url": "",
                "completed_count": 2,
                "signed_off_count": 1,
            },
            {
                "title": "Cloud-Native Microservices Security Auditor with Open-Policy Agent",
                "abstract": "Static and runtime security verification pipeline for Kubernetes and Terraform infrastructure. Uses Rego policies with Open Policy Agent (OPA) to enforce CIS benchmarks and automated vulnerability drift scanning.",
                "domain": "Cloud Computing",
                "batch_year": 2025,
                "guide": faculty_members[1],
                "leader": students[8].user,
                "members": [students[9].user],
                "status": Project.Status.COMPLETED,
                "github_url": "https://github.com/tkiet-cse/cloud-opa-auditor",
                "live_url": "https://opa-audit.demo.local",
                "completed_count": 5,
                "signed_off_count": 5,
            },
            {
                "title": "IoT-Driven Cold Chain Monitoring and Vaccine Integrity Assurance",
                "abstract": "Low-power ESP32 and cellular NB-IoT sensor nodes monitoring temperature, humidity, and vibration in vaccine transport coolers. Includes geofencing alerts, cryptographic tamper detection, and offline buffering.",
                "domain": "IoT & Embedded",
                "batch_year": 2027,
                "guide": faculty_members[6],
                "leader": students[10].user,
                "members": [students[11].user],
                "status": Project.Status.UNDER_REVIEW,
                "github_url": "",
                "live_url": "",
                "completed_count": 1,
                "signed_off_count": 0,
            },
            {
                "title": "Cross-Platform Federated Learning for Mobile Keyboard Word Suggestion",
                "abstract": "Privacy-preserving next-word prediction engine for on-device mobile keyboards. Uses federated averaging (FedAvg) over encrypted gradients to train an LSTM model without centralized user keystroke transmission.",
                "domain": "Machine Learning",
                "batch_year": 2027,
                "guide": None,
                "leader": students[12].user,
                "members": [students[13].user],
                "status": Project.Status.PROPOSED,
                "github_url": "",
                "live_url": "",
                "completed_count": 0,
                "signed_off_count": 0,
            },
        ]

        standard_milestones = [
            ("Synopsis & Problem Statement", "Project abstract, objective, and domain feasibility submission", 1),
            ("SRS & Architecture Design", "Requirement specification and high-level architectural diagram", 2),
            ("Mid-Term Evaluation", "Working core modules and midterm faculty review presentation", 3),
            ("Prototype & Code Completion", "Complete software/hardware implementation and GitHub repo", 4),
            ("Final Report & Viva", "Comprehensive project documentation and external examination", 5),
        ]

        for p_info in demo_projects:
            project_obj, _ = Project.objects.update_or_create(
                department=cse_dept,
                title=p_info["title"],
                defaults={
                    "abstract": p_info["abstract"],
                    "domain": p_info["domain"],
                    "batch_year": p_info["batch_year"],
                    "academic_year": "2026-27",
                    "guide": p_info["guide"],
                    "team_leader": p_info["leader"],
                    "status": p_info["status"],
                    "github_url": p_info["github_url"],
                    "live_url": p_info["live_url"],
                },
            )

            # Team Leader membership
            ProjectMember.objects.get_or_create(
                project=project_obj,
                student=p_info["leader"],
                defaults={"role_in_team": "Team Leader"},
            )

            # Teammates
            for mem_user in p_info["members"]:
                ProjectMember.objects.get_or_create(
                    project=project_obj,
                    student=mem_user,
                    defaults={"role_in_team": "Member"},
                )

            # Milestones
            for m_title, m_desc, m_order in standard_milestones:
                is_comp = m_order <= p_info["completed_count"]
                is_signed = m_order <= p_info["signed_off_count"]
                remarks = "Approved by faculty guide with review notes." if is_signed else ""

                ProjectMilestone.objects.update_or_create(
                    project=project_obj,
                    order=m_order,
                    defaults={
                        "title": m_title,
                        "description": m_desc,
                        "is_completed": is_comp,
                        "completed_at": timezone.now() if is_comp else None,
                        "guide_signed_off": is_signed,
                        "signed_off_at": timezone.now() if is_signed else None,
                        "guide_remarks": remarks,
                    },
                )

        # 14. Communication & Document Library (Phase 6)
        # Notices
        demo_notices = [
            {
                "title": "Mandatory Submission of CIE-2 Marks & Continuous Assessment Verification",
                "content": "All course faculty are requested to complete evaluation and entry of CIE-2 marks on the Digital Hub by Friday 5:00 PM. Students can verify their internal marks and report discrepancies to their respective course coordinators before final tabulation.",
                "category": Notice.Category.ACADEMIC,
                "priority": Notice.Priority.URGENT,
                "is_pinned": True,
                "target_roles": [],
                "publisher": hod,
            },
            {
                "title": "Campus Placement Drive 2026-27: TCS Digital & Infosys SP Registration Open",
                "content": "Eligible final-year (BE-CSE) students with CGPA >= 6.75 and no active backlogs are directed to register on the T&P portal before 18th November. Online aptitude and coding assessments will be conducted in Computer Center Labs 1 & 2.",
                "category": Notice.Category.PLACEMENT,
                "priority": Notice.Priority.NORMAL,
                "is_pinned": True,
                "target_roles": [User.Role.STUDENT],
                "publisher": coordinator,
            },
            {
                "title": "Call for Papers: National Conference on Cloud Systems & AI (NCCSAI-2027)",
                "content": "Department of Computer Science & Engineering is organizing NCCSAI-2027 in March 2027. Faculty members and postgraduate/undergraduate project teams are encouraged to submit original research papers. Selected papers will be submitted for Scopus indexing.",
                "category": Notice.Category.EVENT,
                "priority": Notice.Priority.NORMAL,
                "is_pinned": False,
                "target_roles": [],
                "publisher": faculty_members[0],
            },
            {
                "title": "Internal Department Faculty Meeting: NBA Criteria-3 Attainment Audit",
                "content": "All teaching staff members are requested to attend the Criteria-3 review meeting in the Department Conference Room this Thursday at 4:00 PM. Please bring updated course files and CO-PO attainment direct evaluation sheets.",
                "category": Notice.Category.ACADEMIC,
                "priority": Notice.Priority.NORMAL,
                "is_pinned": False,
                "target_roles": [User.Role.FACULTY, User.Role.HOD, User.Role.COORDINATOR],
                "publisher": hod,
            },
        ]

        for n_info in demo_notices:
            Notice.objects.update_or_create(
                department=cse_dept,
                title=n_info["title"],
                defaults={
                    "content": n_info["content"],
                    "category": n_info["category"],
                    "priority": n_info["priority"],
                    "is_pinned": n_info["is_pinned"],
                    "target_roles": n_info["target_roles"],
                    "published_by": n_info["publisher"],
                },
            )

        # Department Events
        base_now = timezone.now()
        demo_events = [
            {
                "title": "Continuous Internal Evaluation (CIE-2) Examination Week",
                "description": "Mid-semester internal evaluation across all Third & Final Year subjects.",
                "event_type": DepartmentEvent.EventType.EXAM,
                "start": base_now + timedelta(days=3, hours=9),
                "end": base_now + timedelta(days=8, hours=17),
                "location": "Classrooms 301, 302, 304",
                "organizer": coordinator,
            },
            {
                "title": "Final-Year B.Tech Capstone Project Synopsis & Feasibility Presentation",
                "description": "Evaluation committee presentation with duplicate check verification and guide sign-off.",
                "event_type": DepartmentEvent.EventType.DEADLINE,
                "start": base_now + timedelta(days=9, hours=10),
                "end": base_now + timedelta(days=9, hours=16),
                "location": "Department Seminar Hall",
                "organizer": faculty_members[0],
            },
            {
                "title": "Hands-on Technical Workshop: Microservices with Docker & Kubernetes",
                "description": "Interactive training conducted by industry DevOps engineers from Red Hat.",
                "event_type": DepartmentEvent.EventType.WORKSHOP,
                "start": base_now + timedelta(days=14, hours=10),
                "end": base_now + timedelta(days=15, hours=17),
                "location": "Advanced Networking Lab (Lab 4)",
                "organizer": faculty_members[1],
            },
            {
                "title": "Department Advisory Board (DAB) Biannual Curriculum Review",
                "description": "Strategic consultation with industry stakeholders, alumni, and academic experts.",
                "event_type": DepartmentEvent.EventType.MEETING,
                "start": base_now + timedelta(days=18, hours=14),
                "end": base_now + timedelta(days=18, hours=17),
                "location": "Board Room, Main Building",
                "organizer": hod,
            },
        ]

        for e_info in demo_events:
            DepartmentEvent.objects.update_or_create(
                department=cse_dept,
                title=e_info["title"],
                defaults={
                    "description": e_info["description"],
                    "event_type": e_info["event_type"],
                    "start_datetime": e_info["start"],
                    "end_datetime": e_info["end"],
                    "location": e_info["location"],
                    "organizer": e_info["organizer"],
                },
            )

        # Department Documents
        demo_docs = [
            {
                "title": "B.Tech Computer Science & Engineering Curriculum & Scheme (2026-27)",
                "description": "Official autonomous curriculum syllabus booklet for Semester 1 through Semester 8.",
                "category": DepartmentDocument.Category.SYLLABUS,
                "version": "2.1",
                "allowed_roles": [],
                "file_name": "cse_curriculum_2026_27.pdf",
                "downloads": 142,
            },
            {
                "title": "Academic Calendar Even Semester 2026-27",
                "description": "Schedule of term start, instruction duration, CIE exam slots, vacation, and university exams.",
                "category": DepartmentDocument.Category.CIRCULAR,
                "version": "1.0",
                "allowed_roles": [],
                "file_name": "academic_calendar_even_2026_27.pdf",
                "downloads": 98,
            },
            {
                "title": "B.Tech Capstone Project Report & Synopsis Standard Template",
                "description": "IEEE two-column conference format and LaTeX/Word dissertation template for project teams.",
                "category": DepartmentDocument.Category.TEMPLATE,
                "version": "1.3",
                "allowed_roles": [],
                "file_name": "capstone_project_template_v1_3.docx",
                "downloads": 84,
            },
            {
                "title": "Database Management Systems Lab Manual & Practice Problems (CS501-L)",
                "description": "Comprehensive lab assignments covering SQL queries, PL/SQL stored procedures, and triggers.",
                "category": DepartmentDocument.Category.LAB_MANUAL,
                "version": "3.0",
                "allowed_roles": [],
                "file_name": "dbms_lab_manual_cs501.pdf",
                "downloads": 115,
            },
            {
                "title": "Confidential: End-Semester Exam Question Paper Bank & Solution Scheme",
                "description": "Restricted paper setter manuscripts and evaluation key schemes for university examiners.",
                "category": DepartmentDocument.Category.QUESTION_PAPER,
                "version": "1.0",
                "allowed_roles": [User.Role.FACULTY, User.Role.HOD, User.Role.PRINCIPAL],
                "file_name": "confidential_end_sem_paper_draft.pdf",
                "downloads": 12,
            },
            {
                "title": "Faculty Annual Appraisal & Performance Based Appraisal System (PBAS) Form",
                "description": "Annual faculty self-appraisal proforma for research publications, teaching credits, and API scores.",
                "category": DepartmentDocument.Category.TEMPLATE,
                "version": "1.1",
                "allowed_roles": [User.Role.FACULTY, User.Role.HOD],
                "file_name": "faculty_pbas_appraisal_2026.pdf",
                "downloads": 19,
            },
        ]

        for d_info in demo_docs:
            doc_obj, created = DepartmentDocument.objects.update_or_create(
                department=cse_dept,
                title=d_info["title"],
                defaults={
                    "description": d_info["description"],
                    "category": d_info["category"],
                    "version": d_info["version"],
                    "allowed_roles": d_info["allowed_roles"],
                    "uploaded_by": faculty_members[0],
                    "download_count": d_info["downloads"],
                },
            )
            if created or not doc_obj.file:
                mock_content = f"Mock file content for {d_info['title']}. Department Digital Hub TKIET 2026-27."
                doc_obj.file.save(d_info["file_name"], ContentFile(mock_content.encode("utf-8")), save=False)
                doc_obj.file_size_bytes = len(mock_content)
                doc_obj.file_type = d_info["file_name"].split(".")[-1].upper()
                doc_obj.save(update_fields=["file", "file_size_bytes", "file_type"])

        # 15. Accreditation & Reports (Phase 7)
        demo_criteria = [
            {
                "code": "C1",
                "title": "Vision, Mission and Program Educational Objectives (PEOs)",
                "description": "Establishment, consistency, and dissemination of Department Vision, Mission, and PEOs with stakeholder involvement.",
                "max_marks": 50,
                "obtained_marks": Decimal("44.50"),
                "status": AccreditationCriteria.Status.COMPLIANT,
                "evidences": [
                    {
                        "title": "Department Vision-Mission Statement & Stakeholder PEO Approval Minutes",
                        "description": "Official minutes from Department Advisory Board meeting ratifying PEO formulations.",
                        "doc_title": "B.Tech Computer Science & Engineering Curriculum & Scheme (2026-27)",
                        "proj_title": None,
                        "url": "https://tkiet.ac.in/departments/cse/vision-mission",
                    }
                ],
            },
            {
                "code": "C2",
                "title": "Program Curriculum and Teaching-Learning Processes",
                "description": "Curriculum structure, adherence to academic calendar, syllabus delivery progress, and ICT teaching pedagogies.",
                "max_marks": 100,
                "obtained_marks": Decimal("86.00"),
                "status": AccreditationCriteria.Status.COMPLIANT,
                "evidences": [
                    {
                        "title": "Autonomous Academic Calendar & Continuous Instruction Schedule",
                        "description": "Term calendar demarcating 14-week instruction, CIE examination weeks, and remedial slots.",
                        "doc_title": "Academic Calendar Even Semester 2026-27",
                        "proj_title": None,
                        "url": "",
                    },
                    {
                        "title": "Laboratory Manual & Experimental Practice Coursework (CS501-L)",
                        "description": "Hands-on DB queries, triggers, stored procedures, and practical experiment rubric.",
                        "doc_title": "Database Management Systems Lab Manual & Practice Problems (CS501-L)",
                        "proj_title": None,
                        "url": "",
                    },
                ],
            },
            {
                "code": "C3",
                "title": "Course Outcomes and Program Outcomes (COs & POs)",
                "description": "Attainment calculation methodology of Course Outcomes through CIE and indirect assessment exit surveys.",
                "max_marks": 175,
                "obtained_marks": Decimal("148.00"),
                "status": AccreditationCriteria.Status.COMPLIANT,
                "evidences": [
                    {
                        "title": "CIE Assessment Question Papers Mapped with Bloom's Taxonomy & COs",
                        "description": "Audited internal examination question papers demonstrating CO-PO direct question mapping.",
                        "doc_title": "Confidential: End-Semester Exam Question Paper Bank & Solution Scheme",
                        "proj_title": None,
                        "url": "",
                    }
                ],
            },
            {
                "code": "C4",
                "title": "Students' Performance & Capstone Projects",
                "description": "Academic progression, placement conversion ratio, and student capstone multi-disciplinary project quality.",
                "max_marks": 100,
                "obtained_marks": Decimal("74.00"),
                "status": AccreditationCriteria.Status.IN_PROGRESS,
                "evidences": [
                    {
                        "title": "Exemplary Capstone Project: Crop Disease Detection Deep Learning",
                        "description": "Completed student capstone engineering solution solving real-world agricultural problems.",
                        "doc_title": None,
                        "proj_title": "Smart Automated Crop Disease Detection using Deep Convolutional Neural Networks",
                        "url": "https://github.com/tkiet-cse/crop-disease-detection",
                    },
                    {
                        "title": "Standardized B.Tech Capstone Project Rubric & IEEE Format Template",
                        "description": "Department dissertation formatting guidelines and milestone progress rubrics.",
                        "doc_title": "B.Tech Capstone Project Report & Synopsis Standard Template",
                        "proj_title": None,
                        "url": "",
                    },
                ],
            },
            {
                "code": "C5",
                "title": "Faculty Information and Contributions",
                "description": "Student-Faculty Ratio (SFR), cadre ratio, faculty retention, journal research publications, and PBAS appraisals.",
                "max_marks": 175,
                "obtained_marks": Decimal("135.00"),
                "status": AccreditationCriteria.Status.NEEDS_ATTENTION,
                "evidences": [
                    {
                        "title": "Annual PBAS Faculty Self-Appraisal & Research Portfolio Records",
                        "description": "Standardized appraisal submissions for academic API scores and conference contributions.",
                        "doc_title": "Faculty Annual Appraisal & Performance Based Appraisal System (PBAS) Form",
                        "proj_title": None,
                        "url": "",
                    }
                ],
            },
        ]

        for crit in demo_criteria:
            c_obj, _ = AccreditationCriteria.objects.update_or_create(
                department=cse_dept,
                code=crit["code"],
                accreditation_body=AccreditationCriteria.Body.NBA,
                defaults={
                    "title": crit["title"],
                    "description": crit["description"],
                    "max_marks": crit["max_marks"],
                    "obtained_marks": crit["obtained_marks"],
                    "status": crit["status"],
                },
            )

            for ev in crit["evidences"]:
                doc_obj = DepartmentDocument.objects.filter(department=cse_dept, title=ev["doc_title"]).first() if ev["doc_title"] else None
                proj_obj = Project.objects.filter(department=cse_dept, title=ev["proj_title"]).first() if ev["proj_title"] else None

                EvidenceLink.objects.update_or_create(
                    criteria=c_obj,
                    title=ev["title"],
                    defaults={
                        "description": ev["description"],
                        "document": doc_obj,
                        "project": proj_obj,
                        "external_url": ev["url"],
                        "added_by": hod,
                    },
                )

        # 16. AI Knowledge Assistant Documents (Phase 10)
        demo_knowledge_docs = [
            {
                "title": "B.Tech Academic Regulations & Continuous Evaluation Scheme (2026-27)",
                "category": KnowledgeDocument.Category.ACADEMIC_REGULATION,
                "tags": "attendance, cie, passing marks, detention, condonation, grading, rules",
                "content": (
                    "TKIET Autonomous Academic Regulations for B.Tech CSE (Academic Year 2026-27):\n\n"
                    "1. Attendance Norms:\n"
                    "- Every student must maintain a minimum attendance of 75% in each registered theory and practical course.\n"
                    "- A student having attendance between 65% and 74.9% may be considered for condonation of attendance deficit on genuine medical grounds upon submission of valid medical certificates and hospital admission records countersigned by the Class Coordinator and HOD.\n"
                    "- Students with attendance strictly below 65% in any course will NOT be permitted to appear for the Semester End Examination (SEE) in that course and shall be detained.\n\n"
                    "2. Continuous Internal Evaluation (CIE) Scheme:\n"
                    "- Continuous evaluation consists of two Continuous Internal Evaluation tests (CIE-1 of 20 marks, CIE-2 of 20 marks) and Continuous Lab/Course Assessments (10 marks).\n"
                    "- A student must secure a minimum aggregate of 40% marks in the internal assessment components to be eligible for end-semester examinations.\n"
                    "- Students scoring below 40% or exhibiting a >= 15% grade drop between consecutive assessments are flagged on the Early Warning Risk Roster and scheduled for remedial laboratory and tutorial sessions."
                ),
            },
            {
                "title": "Database Management Systems (CS501) Syllabus & Learning Outcomes",
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": "cs501, dbms, database, syllabus, sql, normalization, transactions, nosql",
                "content": (
                    "Course Syllabus: CS501 Database Management Systems (Credits: 4, Semester 5, TE-CSE):\n\n"
                    "Unit 1: Introduction & Conceptual Modeling (6 Hours)\n"
                    "Database system architecture, data models, schemas, and instances. Entity-Relationship (ER) model, extended ER features, mapping ER diagrams to relational schemas.\n\n"
                    "Unit 2: Relational Model & Relational Algebra (6 Hours)\n"
                    "Relational model concepts, integrity constraints (entity, referential, domain). Relational algebra operations: select, project, join, division, aggregate functions.\n\n"
                    "Unit 3: SQL & Advanced Database Programming (8 Hours)\n"
                    "DDL, DML, DCL commands. Nested subqueries, complex joins, views, assertions, and triggers. PL/SQL blocks, stored procedures, cursor management, and exception handling.\n\n"
                    "Unit 4: Relational Database Design & Normalization (7 Hours)\n"
                    "Functional dependencies, closure of attributes, minimal cover. Normal forms: 1NF, 2NF, 3NF, Boyce-Codd Normal Form (BCNF). Lossless join decomposition and dependency preservation.\n\n"
                    "Unit 5: Transaction Processing & Concurrency Control (7 Hours)\n"
                    "ACID properties, transaction schedules, serializability (conflict and view). Two-Phase Locking (2PL), deadlock prevention and detection, timestamp ordering, recovery techniques.\n\n"
                    "Unit 6: Modern Storage & NoSQL Systems (6 Hours)\n"
                    "Limitations of relational model for unstructured big data. CAP theorem, BASE properties. Introduction to document-oriented databases (MongoDB) and key-value stores."
                ),
            },
            {
                "title": "B.Tech Final-Year Capstone Project Guidelines & Similarity Rules",
                "category": KnowledgeDocument.Category.PROJECT_GUIDELINES,
                "tags": "project, capstone, similarity, duplicate check, milestones, ieee, viva",
                "content": (
                    "Department Capstone Project Manual for B.Tech Final Year (Batches 2026 & 2027):\n\n"
                    "1. Team Composition & Domain Selection:\n"
                    "- Project teams must comprise 2 to 4 students from the final-year class.\n"
                    "- Permitted technology domains: Machine Learning & AI, Cloud & Distributed Systems, Cybersecurity, IoT & Embedded, Blockchain, Computer Vision, and Full-Stack Engineering.\n\n"
                    "2. Similarity Check & Duplicate Idea Policy:\n"
                    "- Prior to formal approval, project titles and abstracts are passed through the automated Department Similarity Check Engine.\n"
                    "- Proposals with an overlap score >= 60% with capstone projects from the past three academic batches are flagged as DUPLICATE RISK.\n"
                    "- Teams must revise their problem statement and technical architecture before committee reconsideration.\n\n"
                    "3. 5-Stage Evaluation Milestones:\n"
                    "  Stage 1: Synopsis & Problem Statement Submission (Week 3)\n"
                    "  Stage 2: Software Requirement Specification (SRS) & Architecture Design (Week 6)\n"
                    "  Stage 3: Mid-Term Progress Review & Working Core Modules (Week 10)\n"
                    "  Stage 4: Complete Prototype & Tested Code Implementation (Week 13)\n"
                    "  Stage 5: Final Dissertation Report (IEEE Conference Format) & External Viva-Voce (Week 15)\n\n"
                    "Each milestone requires formal online sign-off from the allotted faculty guide."
                ),
            },
            {
                "title": "TKIET Campus Placement Guidelines & Eligibility Policies",
                "category": KnowledgeDocument.Category.PLACEMENT,
                "tags": "placement, tcs, infosys, cgpa, eligibility, package, jobs, interview",
                "content": (
                    "Training & Placement Cell (T&P) CSE Guidelines (2026-27):\n\n"
                    "1. Academic Eligibility Criteria:\n"
                    "- Final-year students (BE-CSE) must possess an aggregate CGPA >= 6.75 (or 60% aggregate) with no active backlogs at the time of drive registration.\n"
                    "- Minimum 70% attendance in all T&P training bootcamps, coding practice sessions, and mock technical interview rounds.\n\n"
                    "2. Recruitment Drives & Process:\n"
                    "- Tier-1 Recruiters: TCS (Digital/Ninja), Infosys (SP/DSE), Cognizant, Persistent Systems, Tech Mahindra.\n"
                    "- Rounds: Online aptitude test (quantitative, logical, verbal), hands-on coding assessment (Data Structures & Algorithms), Technical Interview, and HR Interview.\n"
                    "- Students selected under a Dream Offer (> 7.0 LPA) are excused from further pooled campus interviews to ensure maximum placement opportunity across the batch."
                ),
            },
            {
                "title": 'COCOMO Model Overview & Project Modes (Software Project Planning)',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'cocomo, constructive cost model, boehm, 1981, basic, intermediate, detailed, organic, semidetached, embedded, kloc',
                "content": "The Constructive Cost Model (COCOMO) was proposed by B. W. Boehm in his 1981 book 'Software Engineering Economics' for software project planning and cost estimation. COCOMO has three hierarchical levels: Basic, Intermediate, and Detailed, and is applied to three project modes: Organic, Semidetached, and Embedded.\n\nComparison of Three COCOMO Modes:\n- Organic Mode: Typically 2-50 KLOC. Small-size project with experienced developers in a familiar, in-house environment, little innovation, and a not-tight deadline (e.g., payroll, inventory projects).\n- Semidetached Mode: Typically 50-300 KLOC. Medium-size project with a medium-size team, average previous experience on similar projects, medium innovation, medium deadline, and medium development environment (e.g., utility systems like compilers, database systems, editors).\n- Embedded Mode: Typically over 300 KLOC. Large, real-time systems with complex hardware/customer interfaces, very little previous experience, significant innovation, and a tight deadline (e.g., ATMs, Air Traffic Control systems).",
            },
            {
                "title": 'Basic COCOMO Model Formulas, Coefficients & Worked Examples',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'basic cocomo, effort, development time, person months, average staff size, productivity, ab, bb, cb, db, kloc',
                "content": 'Basic COCOMO Model Equations:\n- Effort (E) = a_b * (KLOC)^b_b in Person-Months (PM)\n- Development Time (D) = c_b * (E)^d_b in Months\n- Average Staff Size (SS) = E / D Persons\n- Productivity (P) = KLOC / E KLOC/PM\n\nTable 4(a) Basic COCOMO Coefficients (a_b, b_b, c_b, d_b):\n- Organic: a_b = 2.4, b_b = 1.05, c_b = 2.5, d_b = 0.38\n- Semidetached: a_b = 3.0, b_b = 1.12, c_b = 2.5, d_b = 0.35\n- Embedded: a_b = 3.6, b_b = 1.20, c_b = 2.5, d_b = 0.32\n\nWorked Examples:\n- Example 4.5 (400 KLOC): Organic -> E = 2.4*(400)^1.05 = 1295.31 PM, D = 2.5*(1295.31)^0.38 = 38.07 Months; Semidetached -> E = 3.0*(400)^1.12 = 2462.79 PM, D = 2.5*(2462.79)^0.35 = 38.45 Months; Embedded -> E = 3.6*(400)^1.20 = 4772.81 PM, D = 2.5*(4772.8)^0.32 = 38 Months.\n- Example 4.6 (200 KLOC, average team experience, not very tight schedule -> Semidetached mode): E = 3.0*(200)^1.12 = 1133.12 PM, D = 2.5*(1133.12)^0.35 = 29.3 Months, Average Staff Size SS = 1133.12 / 29.3 = 38.67 Persons, Productivity P = 200 / 1133.12 = 0.1765 KLOC/PM (176 LOC/PM).',
            },
            {
                "title": 'Intermediate COCOMO Model, Cost Drivers & EAF Multipliers',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'intermediate cocomo, eaf, effort adjustment factor, cost drivers, rely, data, cplx, time, stor, virt, turn, acap, aexp, pcap, vexp, lexp, modp, tool, sced',
                "content": 'Intermediate COCOMO Equations & Table 6 Coefficients:\n- Effort (E) = a_i * (KLOC)^b_i * EAF (Person-Months), where EAF is the product of 15 cost driver multipliers. Development Time (D) = c_i * (E)^d_i (Months).\n- Coefficients (a_i, b_i, c_i, d_i): Organic (3.2, 1.05, 2.5, 0.38), Semidetached (3.0, 1.12, 2.5, 0.35), Embedded (2.8, 1.20, 2.5, 0.32).\n\n15 Cost Drivers & Multipliers (Very Low, Low, Nominal, High, Very High, Extra High):\n- Product Attributes: RELY (Required s/w reliability: 0.75, 0.88, 1.00, 1.15, 1.40, --), DATA (Size of application database: --, 0.94, 1.00, 1.08, 1.16, --), CPLX (Complexity of product: 0.70, 0.85, 1.00, 1.15, 1.30, 1.65).\n- Computer/Hardware Attributes: TIME (Run time performance: --, --, 1.00, 1.11, 1.30, 1.66), STOR (Memory constraints: --, --, 1.00, 1.06, 1.21, 1.56), VIRT (Virtual machine volatility: --, 0.87, 1.00, 1.15, 1.30, --), TURN (Turnaround time: --, 0.87, 1.00, 1.07, 1.15, --).\n- Personnel Attributes: ACAP (Analyst capability: 1.46, 1.19, 1.00, 0.86, 0.71, --), AEXP (Application experience: 1.29, 1.13, 1.00, 0.91, 0.82, --), PCAP (Programmer capability: 1.42, 1.17, 1.00, 0.86, 0.70, --), VEXP (Virtual machine experience: 1.21, 1.10, 1.00, 0.90, --, --), LEXP (Programming language experience: 1.14, 1.07, 1.00, 0.95, --, --).\n- Project Attributes: MODP (Modern programming practices: 1.24, 1.10, 1.00, 0.91, 0.82, --), TOOL (Use of software tools: 1.24, 1.10, 1.00, 0.91, 0.83, --), SCED (Required development schedule: 1.23, 1.08, 1.00, 1.04, 1.10, --).\n\nWorked Examples:\n- Example 4.7 (400 KLOC Embedded, base E = 2.8*(400)^1.20 = 3712 PM): Case I (highly capable developers, very little language experience) -> EAF = 0.82 * 1.14 = 0.9348, E = 3470 PM, D = 33.9 Months. Case II (low quality developers, high language experience) -> EAF = 1.29 * 0.95 = 1.22, E = 4528 PM, D = 36.9 Months. Highly capable developers outperform low-quality developers even with less language experience.\n- Example 4.8 (Full-screen editor, 5 modules: Screen edit 4K, Command Language Interpreter 2K, File I/O 1K, Cursor Movement 2K, Screen Movement 3K; Total = 12 KLOC, Organic): With RELY High (1.15), CPLX High (1.15), ACAP High (0.86), LEXP Low (1.07) -> EAF = 1.2169, E = 3.2*(12)^1.05 * 1.2169 = 52.91 PM, D = 2.5*(52.91)^0.38 = 11.29 Months.',
            },
            {
                "title": 'Detailed COCOMO Model, Lifecycle Phases & Size Equivalent',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'detailed cocomo, phase-sensitive, product hierarchy, modules, subsystem, system level, size equivalent, adjustment factor, mu_p, tau_p, lifecycle phases',
                "content": 'Detailed COCOMO Model Features:\n- Uses phase-sensitive effort multipliers (cost drivers applied to design & test, manpower allocation for each phase) and a three-level product hierarchy: Modules, Subsystem, and System level.\n- Phase Effort and Development Time Ranges (% depends on mode & size): Plan/Requirements (Effort 6%-8%, Time 10%-40%), Design (Effort 16%-18%, Time 19%-38%), Programming (Effort 48%-68%, Time 24%-64%), Integration & Test (Effort 16%-34%, Time 18%-34%).\n\nSize Equivalent for Re-usable Code & Phase Formulas:\n- When software is partly developed from existing reusable code, modify Design Document (DD%), Code (C%), and Integration (I%) percentages: Adjustment factor A = 0.4*DD + 0.3*C + 0.3*I; Size equivalent S(equivalent) = (S * A) / 100.\n- Phase-wise effort E_p = mu_p * E and phase-wise development time D_p = tau_p * D.\n\nTable 7 Lifecycle Phase Fractions (Plan & Req, System Design, Detailed Design, Module Code & Test, Integration & Test):\n- Effort fractions (mu_p): Organic Small (S~2): 0.06, 0.16, 0.26, 0.42, 0.16; Organic Medium (S~32): 0.06, 0.16, 0.24, 0.38, 0.22; Semidetached Medium (S~32): 0.07, 0.17, 0.25, 0.33, 0.25; Semidetached Large (S~128): 0.07, 0.17, 0.24, 0.31, 0.28; Embedded Large (S~128): 0.08, 0.18, 0.25, 0.26, 0.31; Embedded Extra Large (S~320): 0.08, 0.18, 0.24, 0.24, 0.34.\n- Schedule fractions (tau_p): Organic Small (S~2): 0.10, 0.19, 0.24, 0.39, 0.18; Organic Medium (S~32): 0.12, 0.19, 0.21, 0.34, 0.26; Semidetached Medium (S~32): 0.20, 0.26, 0.21, 0.27, 0.26; Semidetached Large (S~128): 0.22, 0.27, 0.19, 0.25, 0.29; Embedded Large (S~128): 0.36, 0.36, 0.18, 0.18, 0.28; Embedded Extra Large (S~320): 0.40, 0.38, 0.16, 0.16, 0.30.',
            },
            {
                "title": 'COCOMO-II Stages & Application Composition Estimation Model',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'cocomo 2, cocomo-ii, application composition, early design, post architecture, object points, nop, new object points, prod, reuse',
                "content": 'COCOMO-II Application Categories & 3 Stages (Table 8):\n- Five project categories: End user programming, Application generators & composition aids, Application composition, Infrastructure, System integration.\n- Stage I: Application composition estimation model (for Application composition and prototyping stages).\n- Stage II: Early design estimation model (for Application generators, infrastructure & system integration in early design when less is known).\n- Stage III: Post architecture estimation model (used after completion of detailed architecture).\n\nApplication Composition Estimation Steps (Fig. 5 & Tables 9-11):\n1. Assess object counts (number of screens, reports, and 3GL components).\n2. Classify complexity levels (Simple, Medium, Difficult) using Table 9(a) for screens (based on views: <3, 3-7, >8 and data tables: <4, <8, 8+) and Table 9(b) for reports (sections: 0-1, 2-3, 4+ and data tables).\n3. Assign Table 10 complexity weights: Screen (Simple=1, Medium=2, Difficult=3), Report (Simple=2, Medium=5, Difficult=8), 3GL Component (Difficult=10).\n4. Determine object-point count (sum of weighted objects) and compute New Object Points: NOP = (object points * (100 - %reuse)) / 100.\n5. Lookup Productivity Rate (PROD = NOP/PM) from Table 11 (Very low=4, Low=7, Nominal=13, High=25, Very high=50) and compute Effort in PM = NOP / PROD.\n\nWorked Example 4.9 (Database Application):\n- 4 screens (4 views, 7 tables -> Medium, weight 2) + 2 reports (6 sections, 7 tables -> Difficult, weight 8), 10% reuse, Low developer experience/maturity (PROD = 7).\n- Object point count = 4*2 + 2*8 = 24; NOP = 24*(100-10)/100 = 21.6; Effort = 21.6 / 7 = 3.086 PM.',
            },
            {
                "title": 'Software Design Process, Objectives, Concepts & Levels',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'software design, design process, correctness, efficiency, understandability, completeness, maintainability, architectural design, preliminary design, detailed design, abstraction, modularity',
                "content": 'Software Design Process:\n- Software Design transforms user requirements documented in the SRS into a suitable design document for coding and implementation.\n- Items designed and documented: different modules required, control relationships among modules, interfaces among modules, data structures among modules, and algorithms for individual modules.\n\nObjectives & Core Concepts of Software Design:\n- Five Objectives: Correctness (implements all functionalities), Efficiency (optimizes resources, time, and cost), Understandability (modular and arranged in layers), Completeness (includes all data structures, modules, external interfaces), and Maintainability (easily amenable to customer change requests).\n- Core Design Concepts: Abstraction, Modularity, Architecture, Refinement, Pattern, Information Hiding, and Refactoring.\n\nThree Levels of Software Design:\n1. Architectural Design: Overall structure of the system and conceptual integrity; identifies interacting components and proposed solution domain.\n2. Preliminary (High-Level) Design: Decomposes the problem into modules, identifies control relationships and interfaces, producing the program architecture (using structure charts and UML).\n3. Detailed Design: Examines each module carefully to design data structures and algorithms, documented as a module specification document.',
            },
            {
                "title": 'Coupling and Cohesion in Software Design',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'coupling, cohesion, intra-module, inter-module, functional cohesion, data coupling, content coupling, modular design',
                "content": 'Cohesion vs Coupling:\n- Cohesion is an intra-module concept indicating the relationship and functional strength within a single module (module focuses on a single thing). High cohesion is good for software.\n- Coupling is an inter-module concept indicating the relationships and independence between two different modules. Low (loose) coupling is good for software; increasing coupling should be avoided.\n\nSix Types of Cohesion:\n1. Functional Cohesion\n2. Procedural Cohesion\n3. Temporal Cohesion\n4. Sequential Cohesion\n5. Layer Cohesion\n6. Communication Cohesion\n\nSix Types of Coupling:\n1. Common Coupling\n2. External Coupling\n3. Control Coupling\n4. Stamp Coupling\n5. Data Coupling\n6. Content Coupling',
            },
            {
                "title": 'Function-Oriented Design (DFD, Structured Charts) & Object-Oriented Design',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'function oriented design, dfd, data flow diagram, structured charts, data dictionaries, pseudocode, object oriented design, ood, encapsulation, inheritance, polymorphism',
                "content": "Function-Oriented Design & Design Notations:\n- Function-Oriented Design decomposes a system into interacting modules where each module has a clearly defined function.\n- Four Design Notations: Data Flow Diagrams (DFD), Data Dictionaries, Structured Charts, and Pseudocode.\n- DFD Symbols: Rounded Rectangle (functions/transformations), Rectangle (data stores), Circle (user interactions providing input or receiving output), Arrows (direction and name of data flow), and 'and'/'or' keywords (linking multiple input/output data flows).\n\nStructured Charts:\n- Partitions a system into black-box modules showing hierarchy, relationships, interactions, and information passed between modules.\n- Notations: Module (rectangle), Arrow, Data couple (arrow with open circle), Control Flag (arrow with filled circle), Loop (curved arrow), and Decision (diamond).\n\nObject-Oriented Design (OOD):\n- Views the system as a collection of objects where state is distributed among objects and tasks for one object cannot directly alter another's data.\n- Core OOD Concepts: Objects (entities with attributes and methods), Classes (generalized description/blueprint of objects), Messages (communication via target object, operation name, parameters), Abstraction (removing irrelevant details, amplifying essentials), Encapsulation (information hiding, bundling data and methods while restricting outside access), Inheritance (hierarchical subclasses reusing superclass variables and functions), and Polymorphism (same method name performing similar tasks with varying arguments/types).",
            },
            {
                "title": 'Software Requirements Specification (SRS): Characteristics & Components',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'srs, software requirements specification, functional requirements, design constraints, external interface, traceability, unambiguous, consistent, black-box',
                "content": 'Software Requirements Specification (SRS) Overview & Properties:\n- Produced after the feasibility study by system analysts during the requirements analysis and specification phase; acts as a contract between customer and developer.\n- Key Properties of a good SRS: Concise, Structured, Black-box view (defines what the system does, not how/implementation details), Conceptual integrity, Response to undesired events (exceptional conditions), and Verifiable.\n\n12 Characteristics of a Good SRS:\n1. Correctness, 2. Completeness (all essential requirements, responses to all input classes, full labels/references), 3. Consistency (no conflicts: object characteristic conflicts, temporal/action conflicts, or terminology conflicts), 4. Unambiguousness (only one interpretation), 5. Ranking for importance and stability (essential, conditional, optional), 6. Modifiability (indexed and cross-referenced), 7. Verifiability, 8. Traceability (Backward traceability to earlier sources and Forward traceability via unique IDs for maintenance), 9. Design Independence (no implementation details), 10. Testability, 11. Understandable by the customer (simple language, avoid excessive formal notations), 12. Right level of abstraction.\n\nMain Components of an SRS:\n- Functional Requirements: Connectivity between inputs and outputs (valid input ranges/units, operations performed, avoiding non-system algorithms, behavior for invalid inputs/abnormal errors).\n- Design Constraints: Standard compliance, hardware limitations (machines, OS, memory), fault tolerance (minimized to control cost/complexity), and security (access control, passwords, cryptography, activity logs).\n- External Interface Requirements: All interactions with people, hardware, and other software, plus UI and logical hardware interface characteristics.',
            },
            {
                "title": 'Software Process Framework, Umbrella Activities & Hardware vs Software',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'software process, process framework, communication, planning, modeling, construction, deployment, umbrella activities, hardware vs software',
                "content": 'Software Process & Framework Activities:\n- A software process (methodology) is a set of related activities leading to software production, covering four core activities: Software specification (requirements engineering), Software design and implementation, Software verification and validation, and Software evolution (maintenance).\n- Five Common Process Framework Activities: Communication (gathering requirements from stakeholders), Planning (technical tasks, risks, resources, schedule), Modeling (understanding requirements and design), Construction (code generation and testing), and Deployment (delivering to customers for evaluation and feedback).\n\nEight Umbrella Activities (used across large projects to track, control, and manage):\n1. Software project tracking and control, 2. Risk Management, 3. Software Quality Assurance (SQA), 4. Formal Technical Reviews, 5. Measurement, 6. Software Configuration Management, 7. Reusability management, 8. Work product preparation and production.\n\nHardware vs Software Development Differences:\n- Software is easier and cheaper to change than hardware and evolves through multiple releases; hardware consists of physical components that cannot be refactored after manufacturing.\n- Hardware designs are constrained by standard parts, have longer component acquisition lead times, and require more upfront architectural decisions compared to software.',
            },
            {
                "title": 'Software Coding, Code Review (Walkthrough vs Inspection) & Documentation',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'coding, code review, code walkthrough, code inspection, software documentation, internal documentation, external documentation, gunning fog index',
                "content": "Coding & Code Review vs Testing:\n- Coding starts after the design phase is complete and design docs are reviewed; the goal is to translate system design into high-level language code and unit test it following coding standards and guidelines.\n- Code Review (CR) happens after a module compiles and syntax errors are eliminated. CR is a cost-effective error-elimination strategy that directly detects errors, whereas Testing only detects failures under specific inputs and requires debugging and bug fixing.\n\nTwo Types of Code Review:\n- Code Walkthrough: An informal code analysis technique by 3-7 dev team members who select test cases and simulate execution by hand. Focuses on discovering algorithmic/logical errors (not fixing them); managers should not attend.\n- Code Inspection: Examines code against a checklist for classical programming errors (uninitialized variables, incompatible assignments, non-terminating loops, argument mismatches, array indices out of bounds, improper storage allocation/de-allocation, incorrect logical operators/precedence, floating-point equality comparisons) and coding standard adherence.\n\nSoftware Documentation & Gunning's Fog Index:\n- A software product = Executable files + Source Code + Documents. Internal documentation (in source code) includes comments, meaningful variable names, module/function headers, indentation, code structuring, constant identifiers, enumerated types, and user-defined data types. External documentation includes Users' manual, SRS, Design doc, Test doc, and Installation manual (key features: consistency and understandability).\n- Gunning's Fog Index measures document readability (years of formal education needed): Fog(D) = [0.4 * (words / sentences)] + [% of words having >= 3 syllables].",
            },
            {
                "title": 'Software Testing: Unit/Black-Box/White-Box Testing & Cyclomatic Complexity',
                "category": KnowledgeDocument.Category.SYLLABUS,
                "tags": 'testing, unit testing, stub, driver, black box testing, equivalence class partitioning, boundary value analysis, white box testing, statement coverage, branch coverage, condition coverage, path coverage, cfg, cyclomatic complexity, test documentation',
                "content": 'Testing Concepts, Levels & Unit Testing:\n- Testing aims to identify all defects in a program. An Error/Defect/Bug/Fault is a mistake made during development; a Failure is its manifestation/symptom. A Test case is a triplet [I, S, O] (Input, State, Output); a Test suite is a set of all test cases.\n- Three Testing Levels: Unit Testing, Integration Testing, and System Testing.\n- Unit Testing runs after a module is coded and reviewed using an environment of Driver + Module under Test + Stub (Stub = dummy procedures with simplified behavior; Driver = non-local data structures + code to call module functions).\n\nBlack Box vs White Box Testing:\n- Black Box Testing tests input/output behavior without internal code knowledge using Equivalence Class Partitioning (e.g., for integer sqrt in 0..5000: {-5, 500, 6000}) and Boundary Value Analysis (e.g., {-1, 0, 5000, 5001}).\n- White Box (Structural) Testing is based on code structure and has two types: Fault-based and Coverage-based. Coverage strategies: Statement Coverage (each statement executed >= 1 time), Branch Coverage (each branch traversed >= 1 time), Condition Coverage (each condition true and false >= 1 time), and Path Coverage (each linearly independent path executed >= 1 time).\n\nControl Flow Graph (CFG), Cyclomatic Complexity & Test Documentation:\n- A CFG is a directed graph of Nodes (N, unique program statements) and Edges (E, transfer of control).\n- Cyclomatic Complexity Metric: V(G) = E - N + 2 = (Non-overlapping Bounded Areas + 1) = (Decision Points + 1) = (Predicate Nodes + 1). For the Euclid GCD example, V(G) = 3.\n- Test Documentation is prepared towards the end of testing as a test summary report specifying total tests applied, successful tests, and unsuccessful tests (total or partial degree).',
            },
        ]

        for k_info in demo_knowledge_docs:
            KnowledgeDocument.objects.update_or_create(
                department=cse_dept,
                title=k_info["title"],
                defaults={
                    "category": k_info["category"],
                    "tags": k_info["tags"],
                    "content": k_info["content"],
                    "is_active": True,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Phase 10 Seed completed!\n"
                f"  - 1 Department (CSE) with AttainmentConfig\n"
                f"  - 12 Standard Program Outcomes (PO1..PO12)\n"
                f"  - 2 Class Groups (TE-CSE, BE-CSE)\n"
                f"  - 6 Subjects with faculty allocations\n"
                f"  - 51 Students (Real TKIET 2026-27 MCA Roll Call List with deliberate below-75% attendance & mark drops for M3 risk analytics)\n"
                f"  - 22 Attendance Sessions with records\n"
                f"  - 3 Published Assessments with marks grid\n"
                f"  - 4 Course Outcomes & CO-PO Mappings\n"
                f"  - 10 Digital Logbook Entries (reviewed & pending)\n"
                f"  - 3 Logged Student Risk Interventions\n"
                f"  - 6 Multi-Domain B.Tech Projects with Team Members and 30 Milestones\n"
                f"  - 4 Department Notices (pinned, urgent, role-scoped)\n"
                f"  - 4 Academic & Examination Events\n"
                f"  - 6 Department Documents (public syllabi, templates, lab manuals & confidential faculty papers)\n"
                f"  - 5 NBA Accreditation Criteria with 7 Evidence Links (documents, capstone projects, URLs)\n"
                f"  - 4 Rich Department Knowledge Base Documents for AI RAG Assistant"
            )
        )


