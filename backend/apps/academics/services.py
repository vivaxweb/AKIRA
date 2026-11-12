"""
Pure computation services for CO-PO attainment and attendance statistics.
Follows Section 7 (M2 Academic Operations) and Section 1.1 rules.
"""
from decimal import Decimal
from django.db.models import Sum, Count, Q
from .models import (
    Subject,
    CourseOutcome,
    ProgramOutcome,
    COPOMapping,
    AssessmentCO,
    Assessment,
    Mark,
    AttainmentConfig,
    AttendanceSession,
    AttendanceRecord,
)
from apps.accounts.models import StudentProfile


def get_attainment_config(department):
    """Fetches department attainment config or falls back to standard placeholder defaults."""
    config = getattr(department, "attainment_config", None)
    if not config:
        config, _ = AttainmentConfig.objects.get_or_create(
            department=department,
            defaults={
                "target_pct": Decimal("60.00"),
                "level3_pct": Decimal("70.00"),
                "level2_pct": Decimal("60.00"),
                "level1_pct": Decimal("50.00"),
                "pass_mark_pct": Decimal("40.00"),
                "min_attendance_pct": Decimal("75.00"),
            },
        )
    return config


def compute_co_attainment(subject):
    """
    Computes direct Course Outcome (CO) attainment for a subject.
    
    Formula:
    For each CO:
      1. Identify all assessments linked to this CO.
      2. For each student with recorded marks in these assessments:
         Calculate aggregate percentage: sum(marks_obtained) / sum(max_marks) * 100.
      3. Calculate % of students scoring >= target_pct.
      4. Map that percentage to Attainment Level (0-3):
         - >= level3_pct -> Level 3
         - >= level2_pct -> Level 2
         - >= level1_pct -> Level 1
         - < level1_pct  -> Level 0
    """
    dept = subject.class_group.department
    config = get_attainment_config(dept)

    target_pct = float(config.target_pct)
    l3_pct = float(config.level3_pct)
    l2_pct = float(config.level2_pct)
    l1_pct = float(config.level1_pct)

    cos = CourseOutcome.objects.filter(subject=subject).order_by("code")
    results = []

    for co in cos:
        # Find assessments linked to this CO
        linked_assessment_ids = AssessmentCO.objects.filter(
            course_outcome=co
        ).values_list("assessment_id", flat=True)

        if not linked_assessment_ids:
            results.append({
                "co_id": co.id,
                "co_code": co.code,
                "description": co.description,
                "assessments_count": 0,
                "total_students": 0,
                "students_met_target": 0,
                "percentage_met": 0.0,
                "attainment_level": 0,
                "status": "Unassessed (No linked assessments)",
            })
            continue

        assessments = Assessment.objects.filter(id__in=linked_assessment_ids, is_published=True)
        if not assessments.exists():
            results.append({
                "co_id": co.id,
                "co_code": co.code,
                "description": co.description,
                "assessments_count": 0,
                "total_students": 0,
                "students_met_target": 0,
                "percentage_met": 0.0,
                "attainment_level": 0,
                "status": "No published assessments",
            })
            continue

        total_max_marks = sum(float(a.max_marks) for a in assessments)

        # Get all distinct students with marks in these assessments
        student_marks = Mark.objects.filter(
            assessment__in=assessments
        ).values("student_id").annotate(
            total_obtained=Sum("marks_obtained")
        )

        total_students = len(student_marks)
        if total_students == 0 or total_max_marks == 0:
            results.append({
                "co_id": co.id,
                "co_code": co.code,
                "description": co.description,
                "assessments_count": assessments.count(),
                "total_students": 0,
                "students_met_target": 0,
                "percentage_met": 0.0,
                "attainment_level": 0,
                "status": "No marks entered yet",
            })
            continue

        students_met_target = 0
        for sm in student_marks:
            obtained = float(sm["total_obtained"] or 0)
            score_pct = (obtained / total_max_marks) * 100.0
            if score_pct >= target_pct:
                students_met_target += 1

        pct_met = (students_met_target / total_students) * 100.0

        if pct_met >= l3_pct:
            level = 3
        elif pct_met >= l2_pct:
            level = 2
        elif pct_met >= l1_pct:
            level = 1
        else:
            level = 0

        results.append({
            "co_id": co.id,
            "co_code": co.code,
            "description": co.description,
            "assessments_count": assessments.count(),
            "total_students": total_students,
            "students_met_target": students_met_target,
            "percentage_met": round(pct_met, 2),
            "attainment_level": level,
            "status": "Computed",
        })

    return {
        "subject_code": subject.code,
        "subject_name": subject.name,
        "config_used": {
            "target_pct": target_pct,
            "level3_pct": l3_pct,
            "level2_pct": l2_pct,
            "level1_pct": l1_pct,
            "is_placeholder": True,
        },
        "formula": "Level 3: >= 70% students score >= 60% | Level 2: >= 60% | Level 1: >= 50% | Level 0: < 50%",
        "co_results": results,
    }


def compute_po_attainment(subject):
    """
    Computes derived Program Outcome (PO) attainment for a subject.
    Formula:
    Derived PO Attainment = sum(CO_level * mapping_level) / sum(mapping_level)
    """
    co_data = compute_co_attainment(subject)
    co_level_map = {item["co_code"]: item["attainment_level"] for item in co_data["co_results"]}

    pos = ProgramOutcome.objects.filter(department=subject.class_group.department).order_by("code")
    mappings = COPOMapping.objects.filter(course_outcome__subject=subject).select_related("course_outcome", "program_outcome")

    po_mappings = {}
    for m in mappings:
        po_code = m.program_outcome.code
        if po_code not in po_mappings:
            po_mappings[po_code] = {
                "po_id": m.program_outcome.id,
                "po_title": m.program_outcome.title,
                "contributors": [],
            }
        co_level = co_level_map.get(m.course_outcome.code, 0)
        po_mappings[po_code]["contributors"].append({
            "co_code": m.course_outcome.code,
            "co_level": co_level,
            "mapping_level": m.level,
        })

    po_results = []
    for po in pos:
        info = po_mappings.get(po.code)
        if not info or not info["contributors"]:
            po_results.append({
                "po_code": po.code,
                "po_title": po.title,
                "attainment": 0.0,
                "mapped_cos_count": 0,
                "status": "Not mapped in this course",
            })
            continue

        weighted_sum = sum(c["co_level"] * c["mapping_level"] for c in info["contributors"])
        total_weights = sum(c["mapping_level"] for c in info["contributors"])
        attainment = (weighted_sum / total_weights) if total_weights > 0 else 0.0

        po_results.append({
            "po_code": po.code,
            "po_title": po.title,
            "attainment": round(attainment, 2),
            "mapped_cos_count": len(info["contributors"]),
            "status": "Computed",
            "contributors": info["contributors"],
        })

    return {
        "subject_code": subject.code,
        "subject_name": subject.name,
        "formula": "PO Attainment = sum(CO_level * Mapping_level) / sum(Mapping_level)",
        "po_results": po_results,
    }


def compute_student_attendance_summary(student_profile, subject=None):
    """
    Computes attendance percentage for a student across all subjects or a single subject.
    Returns:
    {
        "total_sessions": int,
        "present_sessions": int,
        "absent_sessions": int,
        "percentage": float,
        "min_required_pct": float,
        "is_low_attendance": bool,
        "subject_code": str or None
    }
    """
    config = get_attainment_config(student_profile.class_group.department)
    min_pct = float(config.min_attendance_pct)

    records_query = AttendanceRecord.objects.filter(student=student_profile)
    if subject:
        records_query = records_query.filter(session__subject=subject)

    total_sessions = records_query.count()
    if total_sessions == 0:
        return {
            "total_sessions": 0,
            "present_sessions": 0,
            "absent_sessions": 0,
            "percentage": 100.0,
            "min_required_pct": min_pct,
            "is_low_attendance": False,
            "subject_code": subject.code if subject else None,
        }

    present_count = records_query.filter(status=AttendanceRecord.Status.PRESENT).count()
    absent_count = records_query.filter(status=AttendanceRecord.Status.ABSENT).count()
    pct = (present_count / total_sessions) * 100.0

    return {
        "total_sessions": total_sessions,
        "present_sessions": present_count,
        "absent_sessions": absent_count,
        "percentage": round(pct, 1),
        "min_required_pct": min_pct,
        "is_low_attendance": pct < min_pct,
        "subject_code": subject.code if subject else None,
    }
