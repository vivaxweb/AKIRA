from django.db.models import Avg, Count, Q
from django.utils import timezone
from apps.accounts.models import User
from apps.academics.models import (
    ClassGroup,
    Subject,
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Mark,
    SyllabusTopic,
    TopicCoverage,
    LogbookEntry,
)
from apps.insights.models import Intervention


def calculate_student_risk_profile(student, class_group=None):
    """
    Evaluates academic risk for a student based on:
    1. Overall & subject attendance (< 75% cutoff)
    2. Failing assessments (>= 2 assessments < 40%)
    3. Significant performance drop (>= 15 percentage drop between CIE 1 and CIE 2 / consecutive assessments)
    """
    profile = getattr(student, "student_profile", None)
    roll_no = getattr(profile, "roll_no", getattr(profile, "roll_number", "")) if profile else ""
    cg = profile.class_group if profile else None
    if class_group and cg != class_group:
        return None

    # 1. Attendance
    records_qs = (
        AttendanceRecord.objects.filter(student=profile)
        if profile
        else AttendanceRecord.objects.none()
    )
    if class_group:
        records_qs = records_qs.filter(session__subject__class_group=class_group)

    total_sessions = records_qs.count()
    attended_sessions = records_qs.filter(status=AttendanceRecord.Status.PRESENT).count()
    overall_att_pct = (
        round((attended_sessions / total_sessions) * 100, 1)
        if total_sessions > 0
        else 100.0
    )

    # Subject-wise attendance
    subject_attendance = []
    low_subject_att = []
    # Get subjects in student's class group
    if cg:
        for subj in cg.subjects.all():
            subj_records = records_qs.filter(session__subject=subj)
            s_total = subj_records.count()
            s_att = subj_records.filter(status=AttendanceRecord.Status.PRESENT).count()
            s_pct = round((s_att / s_total) * 100, 1) if s_total > 0 else 100.0
            subject_attendance.append({
                "subject_id": subj.id,
                "subject_code": subj.code,
                "subject_name": subj.name,
                "total_sessions": s_total,
                "attended_sessions": s_att,
                "attendance_pct": s_pct,
            })
            if s_total > 0 and s_pct < 75.0:
                low_subject_att.append(f"{subj.code} ({s_pct}%)")

    # 2. Marks and Assessments
    marks_qs = (
        Mark.objects.filter(student=profile, assessment__is_published=True).select_related(
            "assessment", "assessment__subject"
        )
        if profile
        else Mark.objects.none()
    )

    total_marks_pct_sum = 0
    marks_count = 0
    failed_assessments = []
    subject_assessments = {}

    for mark in marks_qs:
        max_m = mark.assessment.max_marks
        if max_m > 0 and not mark.is_absent:
            pct = round((mark.marks_obtained / max_m) * 100, 1)
        else:
            pct = 0.0

        total_marks_pct_sum += pct
        marks_count += 1

        if pct < 40.0 or mark.is_absent:
            failed_assessments.append({
                "assessment_name": mark.assessment.name,
                "subject_code": mark.assessment.subject.code,
                "pct": pct,
                "is_absent": mark.is_absent,
            })

        # Group by subject to track grade drops
        s_id = mark.assessment.subject.id
        if s_id not in subject_assessments:
            subject_assessments[s_id] = []
        subject_assessments[s_id].append({
            "assessment": mark.assessment,
            "pct": pct,
            "date": mark.assessment.date,
        })

    marks_avg_pct = round(total_marks_pct_sum / marks_count, 1) if marks_count > 0 else 0.0

    # 3. Grade Drop Check (>= 15% drop across consecutive assessments in any subject)
    grade_drops = []
    for s_id, assessments_list in subject_assessments.items():
        if len(assessments_list) >= 2:
            # Sort by assessment date or name
            sorted_list = sorted(assessments_list, key=lambda x: (x["date"], x["assessment"].name))
            for i in range(1, len(sorted_list)):
                prev = sorted_list[i - 1]
                curr = sorted_list[i]
                drop = prev["pct"] - curr["pct"]
                if drop >= 15.0:
                    subj_code = curr["assessment"].subject.code
                    grade_drops.append({
                        "subject_code": subj_code,
                        "from_assessment": prev["assessment"].name,
                        "from_pct": prev["pct"],
                        "to_assessment": curr["assessment"].name,
                        "to_pct": curr["pct"],
                        "drop": round(drop, 1),
                    })

    # Evaluate Risk Level & Reasons
    risk_reasons = []
    risk_flags = {
        "attendance": False,
        "failing": False,
        "grade_drop": False,
    }

    if overall_att_pct < 75.0:
        risk_flags["attendance"] = True
        risk_reasons.append(f"Overall attendance below 75% ({overall_att_pct}%)")
    elif low_subject_att:
        risk_flags["attendance"] = True
        risk_reasons.append(f"Low attendance in: {', '.join(low_subject_att)}")

    if len(failed_assessments) >= 2:
        risk_flags["failing"] = True
        risk_reasons.append(f"Failing in {len(failed_assessments)} assessments (< 40%)")
    elif len(failed_assessments) == 1:
        risk_reasons.append(f"Failing in 1 assessment: {failed_assessments[0]['assessment_name']}")

    if grade_drops:
        risk_flags["grade_drop"] = True
        for gd in grade_drops:
            risk_reasons.append(
                f"Grade dropped by {gd['drop']}% in {gd['subject_code']} ({gd['from_assessment']} {gd['from_pct']}% -> {gd['to_assessment']} {gd['to_pct']}%)"
            )

    # Determine Risk Category
    # High: Severe attendance (<60%) or multiple distinct risk flags or >= 2 failing assessments with low attendance
    flag_count = sum(1 for f in risk_flags.values() if f)
    if overall_att_pct < 60.0 or flag_count >= 2 or len(failed_assessments) >= 3:
        risk_level = "HIGH"
    elif flag_count == 1 or len(failed_assessments) >= 1 or len(grade_drops) >= 1:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # Interventions
    interventions = Intervention.objects.filter(student=student)
    latest_int = interventions.first()

    return {
        "student_id": student.id,
        "full_name": student.get_full_name(),
        "email": student.email,
        "roll_number": roll_no,
        "class_group_id": cg.id if cg else None,
        "class_group_name": cg.name if cg else "Unassigned",
        "overall_attendance_pct": overall_att_pct,
        "total_sessions": total_sessions,
        "attended_sessions": attended_sessions,
        "marks_avg_pct": marks_avg_pct,
        "failed_assessments_count": len(failed_assessments),
        "failed_assessments": failed_assessments,
        "grade_drops": grade_drops,
        "risk_level": risk_level,
        "risk_flags": risk_flags,
        "risk_reasons": risk_reasons,
        "subject_attendance": subject_attendance,
        "interventions_count": interventions.count(),
        "latest_intervention": {
            "id": latest_int.id,
            "type": latest_int.intervention_type,
            "status": latest_int.status,
            "created_at": latest_int.created_at,
            "remarks": latest_int.remarks[:100] if latest_int.remarks else "",
        } if latest_int else None,
    }


def get_students_risk_list(class_group_id=None, risk_level=None, search=None):
    """Returns list of student risk summaries matching filter criteria."""
    students_qs = User.objects.filter(role="STUDENT", is_active=True).select_related(
        "student_profile", "student_profile__class_group"
    )

    if class_group_id:
        students_qs = students_qs.filter(student_profile__class_group_id=class_group_id)

    if search:
        search_terms = search.strip().split()
        for term in search_terms:
            students_qs = students_qs.filter(
                Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
                | Q(email__icontains=term)
                | Q(student_profile__roll_number__icontains=term)
            )

    results = []
    for s in students_qs:
        profile = calculate_student_risk_profile(s)
        if not profile:
            continue
        if risk_level and profile["risk_level"] != risk_level.upper():
            continue
        results.append(profile)

    # Sort: HIGH risk first, then MEDIUM, then LOW; within risk level, lowest attendance first
    risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    results.sort(key=lambda x: (risk_order.get(x["risk_level"], 3), x["overall_attendance_pct"]))
    return results


def get_student_analytics_summary(class_group_id=None, student_id=None):
    """
    Returns aggregate class performance metrics or detailed individual student trends.
    """
    if student_id:
        student = User.objects.filter(id=student_id, role="STUDENT").first()
        if not student:
            return None
        profile = getattr(student, "student_profile", None)
        risk_profile = calculate_student_risk_profile(student)
        
        # Assessments timeline
        marks_qs = (
            Mark.objects.filter(student=profile, assessment__is_published=True)
            .select_related("assessment", "assessment__subject")
            .order_by("assessment__date")
            if profile
            else Mark.objects.none()
        )
        
        timeline = []
        for m in marks_qs:
            pct = round((m.marks_obtained / m.assessment.max_marks) * 100, 1) if m.assessment.max_marks > 0 and not m.is_absent else 0.0
            timeline.append({
                "assessment_id": m.assessment.id,
                "assessment_name": m.assessment.name,
                "subject_code": m.assessment.subject.code,
                "date": m.assessment.date,
                "marks_obtained": m.marks_obtained,
                "max_marks": m.assessment.max_marks,
                "percentage": pct,
                "is_absent": m.is_absent,
            })
            
        interventions = list(Intervention.objects.filter(student=student).values(
            "id", "intervention_type", "status", "reason", "remarks", "action_taken", "created_at", "resolved_at"
        ))

        return {
            "student_profile": risk_profile,
            "timeline": timeline,
            "interventions": interventions,
        }

    # Aggregate Class Analytics
    students_risk = get_students_risk_list(class_group_id=class_group_id)
    total_students = len(students_risk)

    high_risk_count = sum(1 for s in students_risk if s["risk_level"] == "HIGH")
    medium_risk_count = sum(1 for s in students_risk if s["risk_level"] == "MEDIUM")
    low_risk_count = sum(1 for s in students_risk if s["risk_level"] == "LOW")

    avg_attendance = (
        round(sum(s["overall_attendance_pct"] for s in students_risk) / total_students, 1)
        if total_students > 0
        else 0.0
    )
    avg_marks = (
        round(sum(s["marks_avg_pct"] for s in students_risk) / total_students, 1)
        if total_students > 0
        else 0.0
    )

    # Attendance vs Marks Scatter Points
    scatter_points = [
        {
            "student_id": s["student_id"],
            "name": s["full_name"],
            "roll_no": s["roll_number"],
            "attendance_pct": s["overall_attendance_pct"],
            "marks_avg_pct": s["marks_avg_pct"],
            "risk_level": s["risk_level"],
        }
        for s in students_risk
    ]

    # Assessment Performance Progression
    assessments_qs = Assessment.objects.filter(is_published=True).select_related("subject")
    if class_group_id:
        assessments_qs = assessments_qs.filter(subject__class_group_id=class_group_id)

    assessment_trends = []
    for a in assessments_qs.order_by("date", "name"):
        marks = Mark.objects.filter(assessment=a)
        m_count = marks.count()
        if m_count > 0:
            pcts = [(m.marks_obtained / a.max_marks) * 100 for m in marks if not m.is_absent and a.max_marks > 0]
            avg_p = round(sum(pcts) / len(pcts), 1) if pcts else 0.0
            pass_count = sum(1 for p in pcts if p >= 40.0)
            pass_rate = round((pass_count / m_count) * 100, 1)
        else:
            avg_p = 0.0
            pass_rate = 0.0

        assessment_trends.append({
            "assessment_id": a.id,
            "assessment_name": a.name,
            "subject_code": a.subject.code,
            "date": a.date,
            "average_pct": avg_p,
            "pass_rate_pct": pass_rate,
            "total_students": m_count,
        })

    return {
        "total_students": total_students,
        "high_risk_count": high_risk_count,
        "medium_risk_count": medium_risk_count,
        "low_risk_count": low_risk_count,
        "attendance_risk_count": sum(1 for s in students_risk if s["risk_flags"]["attendance"]),
        "grade_drop_count": sum(1 for s in students_risk if s["risk_flags"]["grade_drop"]),
        "failing_count": sum(1 for s in students_risk if s["risk_flags"]["failing"]),
        "average_attendance_pct": avg_attendance,
        "average_marks_pct": avg_marks,
        "risk_breakdown": [
            {"name": "High Risk", "value": high_risk_count, "color": "#ef4444"},
            {"name": "Medium Risk", "value": medium_risk_count, "color": "#f59e0b"},
            {"name": "Low Risk / On Track", "value": low_risk_count, "color": "#10b981"},
        ],
        "scatter_points": scatter_points,
        "assessment_trends": assessment_trends,
    }


def get_faculty_workload_analytics(department=None):
    """
    Computes faculty teaching allocations, syllabus coverage pace, and logbook compliance.
    """
    faculty_qs = User.objects.filter(role="FACULTY", is_active=True).select_related("faculty_profile", "department")
    if department:
        faculty_qs = faculty_qs.filter(department=department)

    results = []
    total_assigned_hours_dept = 0

    for f in faculty_qs:
        f_prof = getattr(f, "faculty_profile", None)
        designation = f_prof.designation if f_prof else "Faculty"
        
        # Subjects taught
        subjects = Subject.objects.filter(faculty=f).select_related("class_group")
        subjects_data = []
        weekly_hours_total = 0
        total_topics_count = 0
        covered_topics_count = 0

        for subj in subjects:
            weekly_hours = getattr(subj, "weekly_hours", getattr(subj, "credits", 3))
            weekly_hours_total += weekly_hours

            # Syllabus topics
            topics = SyllabusTopic.objects.filter(subject=subj)
            t_count = topics.count()
            cov_count = TopicCoverage.objects.filter(topic__in=topics).count()
            cov_pct = round((cov_count / t_count) * 100, 1) if t_count > 0 else 0.0

            total_topics_count += t_count
            covered_topics_count += cov_count

            subjects_data.append({
                "subject_id": subj.id,
                "code": subj.code,
                "name": subj.name,
                "class_group": subj.class_group.name if subj.class_group else "None",
                "weekly_hours": weekly_hours,
                "total_topics": t_count,
                "covered_topics": cov_count,
                "coverage_pct": cov_pct,
            })

        # Overall syllabus completion for faculty
        overall_coverage_pct = (
            round((covered_topics_count / total_topics_count) * 100, 1)
            if total_topics_count > 0
            else 0.0
        )

        # Logbook compliance
        logbooks = LogbookEntry.objects.filter(faculty=f)
        total_entries = logbooks.count()
        pending_review = logbooks.filter(hod_reviewed_at__isnull=True).count()
        verified_entries = logbooks.filter(hod_reviewed_at__isnull=False).count()
        last_entry = logbooks.order_by("-date").first()

        # Compliance Rating
        if total_entries >= 10 and overall_coverage_pct >= 60.0:
            compliance = "EXCELLENT"
        elif total_entries >= 5 and overall_coverage_pct >= 40.0:
            compliance = "GOOD"
        else:
            compliance = "NEEDS_ATTENTION"

        total_assigned_hours_dept += weekly_hours_total

        results.append({
            "faculty_id": f.id,
            "faculty_name": f.get_full_name(),
            "email": f.email,
            "designation": designation,
            "weekly_teaching_hours": weekly_hours_total,
            "subjects_count": len(subjects_data),
            "subjects": subjects_data,
            "total_topics": total_topics_count,
            "covered_topics": covered_topics_count,
            "overall_coverage_pct": overall_coverage_pct,
            "logbook_entries_count": total_entries,
            "pending_logbook_reviews": pending_review,
            "verified_logbook_reviews": verified_entries,
            "last_logbook_date": last_entry.date if last_entry else None,
            "compliance_status": compliance,
        })

    return {
        "faculty_count": len(results),
        "total_teaching_hours": total_assigned_hours_dept,
        "faculty": results,
    }
