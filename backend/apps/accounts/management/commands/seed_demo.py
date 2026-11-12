"""
Comprehensive, idempotent demo data seeder.
Run via: python manage.py seed_demo [--reset]
Populates full academic dataset for B.Tech CSE Department (TKIET 2026-27).
"""
import random
from datetime import date, timedelta
from decimal import Decimal
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
            self.stdout.write(self.style.WARNING("Reset flag provided. Purging existing database..."))
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
            User.objects.filter(email__endswith="@demo.local").delete()
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

        # 3. Staff accounts: Principal, HOD, Faculty, Coordinator
        principal, _ = User.objects.get_or_create(
            email="principal@demo.local",
            defaults={"first_name": "Demo", "last_name": "Principal", "role": User.Role.PRINCIPAL, "is_staff": True},
        )
        principal.set_password(demo_password)
        principal.save()

        hod, _ = User.objects.get_or_create(
            email="hod@demo.local",
            defaults={"first_name": "Demo", "last_name": "HOD CSE", "role": User.Role.HOD, "department": cse_dept, "is_staff": True},
        )
        hod.set_password(demo_password)
        hod.save()
        FacultyProfile.objects.get_or_create(user=hod, defaults={"employee_id": "EMP-CSE-HOD", "designation": "Professor & HOD"})

        faculty_members = []
        faculty_meta = [
            ("faculty1@demo.local", "Faculty", "One", "EMP-CSE-001", "Associate Professor"),
            ("faculty2@demo.local", "Faculty", "Two", "EMP-CSE-002", "Assistant Professor"),
            ("faculty3@demo.local", "Faculty", "Three", "EMP-CSE-003", "Assistant Professor"),
        ]
        for email, fn, ln, emp_id, desig in faculty_meta:
            f_user, _ = User.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "role": User.Role.FACULTY, "department": cse_dept},
            )
            f_user.set_password(demo_password)
            f_user.save()
            FacultyProfile.objects.get_or_create(user=f_user, defaults={"employee_id": emp_id, "designation": desig})
            faculty_members.append(f_user)

        coordinator, _ = User.objects.get_or_create(
            email="coordinator@demo.local",
            defaults={"first_name": "Demo", "last_name": "Coordinator", "role": User.Role.COORDINATOR, "department": cse_dept},
        )
        coordinator.set_password(demo_password)
        coordinator.save()
        FacultyProfile.objects.get_or_create(user=coordinator, defaults={"employee_id": "EMP-CSE-COORD", "designation": "Assistant Professor & Coordinator"})

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

        # 5. Students (40 students: 30 in TE-CSE-A, 10 in BE-CSE-A)
        students = []
        for i in range(1, 41):
            email = f"student{i:02d}@demo.local"
            roll = f"23CSE{i:03d}"
            cg = te_cse_a if i <= 30 else be_cse_a
            s_user, _ = User.objects.get_or_create(
                email=email,
                defaults={"first_name": "Demo", "last_name": f"Student {i:02d}", "role": User.Role.STUDENT, "department": cse_dept},
            )
            s_user.set_password(demo_password)
            s_user.save()
            sp, _ = StudentProfile.objects.get_or_create(
                user=s_user,
                defaults={"roll_no": roll, "class_group": cg, "admission_year": 2023 if i <= 30 else 2022},
            )
            students.append(sp)

        # 6. Subjects (6 subjects)
        subjects_data = [
            ("CS501", "Database Management Systems", te_cse_a, faculty_members[0], 4),
            ("CS502", "Computer Networks", te_cse_a, faculty_members[1], 4),
            ("CS503", "Theory of Computation", te_cse_a, coordinator, 3),
            ("CS504", "Advanced Java Programming", te_cse_a, faculty_members[0], 3),
            ("CS701", "Cloud Computing", be_cse_a, faculty_members[1], 4),
            ("CS702", "Artificial Intelligence", be_cse_a, faculty_members[2], 4),
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
                "leader": students[0].user,
                "members": [students[1].user, students[2].user],
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
                "guide": faculty_members[1],
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
                "guide": faculty_members[2],
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
                "guide": faculty_members[0],
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
                "guide": faculty_members[1],
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

        self.stdout.write(
            self.style.SUCCESS(
                f"Phase 6 Seed completed!\n"
                f"  - 1 Department (CSE) with AttainmentConfig\n"
                f"  - 12 Standard Program Outcomes (PO1..PO12)\n"
                f"  - 2 Class Groups (TE-CSE, BE-CSE)\n"
                f"  - 6 Subjects with faculty allocations\n"
                f"  - 40 Students (with deliberate below-75% attendance & mark drops for M3 risk analytics)\n"
                f"  - 22 Attendance Sessions with records\n"
                f"  - 3 Published Assessments with marks grid\n"
                f"  - 4 Course Outcomes & CO-PO Mappings\n"
                f"  - 10 Digital Logbook Entries (reviewed & pending)\n"
                f"  - 3 Logged Student Risk Interventions\n"
                f"  - 6 Multi-Domain B.Tech Projects with Team Members and 30 Milestones\n"
                f"  - 4 Department Notices (pinned, urgent, role-scoped)\n"
                f"  - 4 Academic & Examination Events\n"
                f"  - 6 Department Documents (public syllabi, templates, lab manuals & confidential faculty papers)"
            )
        )


