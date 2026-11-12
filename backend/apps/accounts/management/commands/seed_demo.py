"""
Idempotent demo data seeder.
Run via: python manage.py seed_demo [--reset]
Extended incrementally across phases.
"""
from django.core.management.base import BaseCommand
from apps.accounts.models import Department, User, StudentProfile, FacultyProfile
from apps.academics.models import ClassGroup


class Command(BaseCommand):
    help = "Seed demo data for Department Digital Hub (idempotent, supports --reset)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo records before seeding",
        )

    def handle(self, *args, **options):
        reset = options.get("reset", False)

        if reset:
            self.stdout.write(self.style.WARNING("Reset flag provided. Purging existing demo records..."))
            User.objects.filter(email__endswith="@demo.local").delete()
            Department.objects.filter(code__in=["CSE", "MECH"]).delete()
            self.stdout.write(self.style.SUCCESS("Demo records purged."))

        demo_password = "Demo@12345"

        # 1. Departments
        cse_dept, _ = Department.objects.get_or_create(
            code="CSE",
            defaults={"name": "Computer Science & Engineering"},
        )
        mech_dept, _ = Department.objects.get_or_create(
            code="MECH",
            defaults={"name": "Mechanical Engineering"},
        )

        # 2. Class Groups (stub for Phase 1, extended in Phase 3)
        te_cse_a, _ = ClassGroup.objects.get_or_create(
            department=cse_dept,
            name="TE-CSE",
            division="A",
            academic_year="2026-27",
            defaults={"year": 3, "semester": 5},
        )
        be_cse_a, _ = ClassGroup.objects.get_or_create(
            department=cse_dept,
            name="BE-CSE",
            division="A",
            academic_year="2026-27",
            defaults={"year": 4, "semester": 7},
        )

        # 3. Principal (Institution-wide)
        principal, created = User.objects.get_or_create(
            email="principal@demo.local",
            defaults={
                "first_name": "Demo",
                "last_name": "Principal",
                "role": User.Role.PRINCIPAL,
                "is_staff": True,
            },
        )
        if created or reset:
            principal.set_password(demo_password)
            principal.save()

        # 4. HOD (CSE Department)
        hod, created = User.objects.get_or_create(
            email="hod@demo.local",
            defaults={
                "first_name": "Demo",
                "last_name": "HOD CSE",
                "role": User.Role.HOD,
                "department": cse_dept,
                "is_staff": True,
            },
        )
        if created or reset:
            hod.set_password(demo_password)
            hod.save()
            FacultyProfile.objects.get_or_create(
                user=hod,
                defaults={"employee_id": "EMP-CSE-HOD", "designation": "Professor & HOD"},
            )

        # 5. Faculty members
        faculty_specs = [
            ("faculty1@demo.local", "Faculty", "One", "EMP-CSE-001", "Associate Professor"),
            ("faculty2@demo.local", "Faculty", "Two", "EMP-CSE-002", "Assistant Professor"),
            ("faculty3@demo.local", "Faculty", "Three", "EMP-CSE-003", "Assistant Professor"),
        ]
        for email, fn, ln, emp_id, desig in faculty_specs:
            f_user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": fn,
                    "last_name": ln,
                    "role": User.Role.FACULTY,
                    "department": cse_dept,
                },
            )
            if created or reset:
                f_user.set_password(demo_password)
                f_user.save()
                FacultyProfile.objects.get_or_create(
                    user=f_user,
                    defaults={"employee_id": emp_id, "designation": desig},
                )

        # 6. Class Coordinator (Faculty who also coordinates TE-CSE-A)
        coordinator, created = User.objects.get_or_create(
            email="coordinator@demo.local",
            defaults={
                "first_name": "Demo",
                "last_name": "Coordinator",
                "role": User.Role.COORDINATOR,
                "department": cse_dept,
            },
        )
        if created or reset:
            coordinator.set_password(demo_password)
            coordinator.save()
            FacultyProfile.objects.get_or_create(
                user=coordinator,
                defaults={"employee_id": "EMP-CSE-COORD", "designation": "Assistant Professor & Coordinator"},
            )
            te_cse_a.coordinator = coordinator
            te_cse_a.save()

        # 7. Students (TE-CSE-A)
        for i in range(1, 11):
            email = f"student{i:02d}@demo.local"
            roll = f"23CSE{i:03d}"
            s_user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "first_name": "Demo",
                    "last_name": f"Student {i:02d}",
                    "role": User.Role.STUDENT,
                    "department": cse_dept,
                },
            )
            if created or reset:
                s_user.set_password(demo_password)
                s_user.save()
                StudentProfile.objects.get_or_create(
                    user=s_user,
                    defaults={
                        "roll_no": roll,
                        "class_group": te_cse_a,
                        "admission_year": 2023,
                    },
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Phase 1 seed completed successfully!\n"
                "Logins created with password 'Demo@12345':\n"
                "  - principal@demo.local\n"
                "  - hod@demo.local\n"
                "  - faculty1@demo.local .. faculty3@demo.local\n"
                "  - coordinator@demo.local\n"
                "  - student01@demo.local .. student10@demo.local"
            )
        )
