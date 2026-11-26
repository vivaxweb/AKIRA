"""
Reports and Accreditation Services.
Generates:
1. Attendance Matrix XLSX (openpyxl)
2. Internal Marks XLSX (openpyxl)
3. CO-PO Attainment Calculation XLSX (openpyxl)
4. Comprehensive Student Progress Card PDF (reportlab)
5. Executive Dashboard KPI Aggregator
"""
import io
from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from django.db.models import Count, Q, Avg

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)

from apps.accounts.models import Department, StudentProfile, FacultyProfile, User
from apps.academics.models import (
    ClassGroup,
    Subject,
    AttendanceSession,
    AttendanceRecord,
    Assessment,
    Mark,
    CourseOutcome,
    ProgramOutcome,
    COPOMapping,
    SyllabusTopic,
    TopicCoverage,
    LogbookEntry,
)
from apps.academics.services import compute_co_attainment, compute_po_attainment
from apps.projects.models import Project, ProjectMilestone
from apps.insights.models import Intervention
from apps.insights.services import calculate_student_risk_profile
from apps.reports.models import AccreditationCriteria, EvidenceLink


# ---------------------------------------------------------------------------
# Excel Styling Helpers
# ---------------------------------------------------------------------------
def _style_excel_header(ws, max_col, title, subtitle="", meta_info=""):
    """Adds a standardized college header banner to the worksheet."""
    thin_border = Border(
        left=Side(style="thin", color="CCCCCC"),
        right=Side(style="thin", color="CCCCCC"),
        top=Side(style="thin", color="CCCCCC"),
        bottom=Side(style="thin", color="CCCCCC"),
    )

    # Row 1: College Name
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=max_col)
    cell1 = ws.cell(row=1, column=1)
    cell1.value = "TATYASAHEB KORE INSTITUTE OF ENGINEERING & TECHNOLOGY, WARANANAGAR"
    cell1.font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    cell1.alignment = Alignment(horizontal="center", vertical="center")

    # Row 2: Department
    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=max_col)
    cell2 = ws.cell(row=2, column=1)
    cell2.value = "Department of Computer Science & Engineering"
    cell2.font = Font(name="Calibri", size=11, bold=True, color="475569")
    cell2.alignment = Alignment(horizontal="center", vertical="center")

    # Row 3: Report Title
    ws.merge_cells(start_row=3, start_column=1, end_row=3, end_column=max_col)
    cell3 = ws.cell(row=3, column=1)
    cell3.value = title.upper()
    cell3.font = Font(name="Calibri", size=12, bold=True, color="0F172A")
    cell3.alignment = Alignment(horizontal="center", vertical="center")

    # Row 4: Metadata
    if subtitle or meta_info:
        ws.merge_cells(start_row=4, start_column=1, end_row=4, end_column=max_col)
        cell4 = ws.cell(row=4, column=1)
        cell4.value = f"{subtitle} | {meta_info}".strip(" | ")
        cell4.font = Font(name="Calibri", size=9, italic=True, color="64748B")
        cell4.alignment = Alignment(horizontal="center", vertical="center")


# ---------------------------------------------------------------------------
# 1. Attendance Matrix Excel
# ---------------------------------------------------------------------------
def generate_attendance_excel(class_group_id=None, subject_id=None) -> bytes:
    """
    Generates an Excel matrix with student roll numbers, names, and attendance records
    for each date slot, along with total attended, total sessions, and attendance percentage.
    """
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Attendance Matrix"
    ws.views.sheetView[0].showGridLines = True

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    def_font = Font(name="Calibri", size=10)
    danger_font = Font(name="Calibri", size=10, color="DC2626", bold=True)
    success_font = Font(name="Calibri", size=10, color="16A34A")

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    if subject_id:
        subject = Subject.objects.select_related("class_group", "faculty").get(id=subject_id)
        class_group = subject.class_group
        sessions = list(AttendanceSession.objects.filter(subject=subject).order_by("date", "slot"))
        students = list(
            StudentProfile.objects.filter(class_group=class_group).select_related("user").order_by("roll_no")
        )

        records_map = {}
        for r in AttendanceRecord.objects.filter(session__subject=subject):
            records_map[(r.student_id, r.session_id)] = r.status

        num_sessions = len(sessions)
        max_col = max(7, 2 + num_sessions + 4)

        subtitle = f"Subject: {subject.name} ({subject.code})"
        faculty_name = subject.faculty.get_full_name() if subject.faculty else "Unassigned"
        meta = f"Class: {class_group.name} | Faculty: {faculty_name} | Generated: {timezone.now().strftime('%d-%b-%Y')}"
        _style_excel_header(ws, max_col, "Attendance Register & Statistics", subtitle, meta)

        start_row = 6
        headers = ["Roll No", "Student Name"]
        for s in sessions:
            headers.append(f"{s.date.strftime('%d/%m')}\nS{s.slot}")
        headers.extend(["Present", "Total", "Att. %", "Status"])

        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = thin_border
        ws.row_dimensions[start_row].height = 28

        curr_row = start_row + 1
        session_presents = [0] * num_sessions

        for st in students:
            ws.cell(row=curr_row, column=1, value=st.roll_no).border = thin_border
            ws.cell(row=curr_row, column=1).alignment = Alignment(horizontal="center")
            ws.cell(row=curr_row, column=2, value=st.user.get_full_name()).border = thin_border

            p_count = 0
            for idx, sess in enumerate(sessions):
                status = records_map.get((st.id, sess.id), "-")
                val = "P" if status == "PRESENT" else ("A" if status == "ABSENT" else ("L" if status == "LEAVE" else "-"))
                if val == "P":
                    p_count += 1
                    session_presents[idx] += 1
                c = ws.cell(row=curr_row, column=3 + idx, value=val)
                c.alignment = Alignment(horizontal="center")
                c.border = thin_border
                if val == "A":
                    c.font = danger_font

            pct = round((p_count / num_sessions * 100), 1) if num_sessions > 0 else 0.0
            
            c_p = ws.cell(row=curr_row, column=3 + num_sessions, value=p_count)
            c_p.alignment = Alignment(horizontal="center")
            c_p.border = thin_border

            c_t = ws.cell(row=curr_row, column=4 + num_sessions, value=num_sessions)
            c_t.alignment = Alignment(horizontal="center")
            c_t.border = thin_border

            c_pct = ws.cell(row=curr_row, column=5 + num_sessions, value=f"{pct}%")
            c_pct.alignment = Alignment(horizontal="center")
            c_pct.border = thin_border
            c_pct.font = danger_font if pct < 75.0 else success_font

            status_txt = "DEFICIT" if pct < 75.0 else "ELIGIBLE"
            c_st = ws.cell(row=curr_row, column=6 + num_sessions, value=status_txt)
            c_st.alignment = Alignment(horizontal="center")
            c_st.border = thin_border
            c_st.font = danger_font if status_txt == "DEFICIT" else bold_font

            curr_row += 1

        # Summary Row
        summary_row = curr_row
        ws.cell(row=summary_row, column=1, value="TOTAL PRESENT").font = bold_font
        ws.merge_cells(start_row=summary_row, start_column=1, end_row=summary_row, end_column=2)
        ws.cell(row=summary_row, column=1).alignment = Alignment(horizontal="right")
        ws.cell(row=summary_row, column=1).border = thin_border
        ws.cell(row=summary_row, column=2).border = thin_border

        for idx, p_tot in enumerate(session_presents):
            c = ws.cell(row=summary_row, column=3 + idx, value=p_tot)
            c.font = bold_font
            c.alignment = Alignment(horizontal="center")
            c.border = thin_border

        for col_idx in range(3 + num_sessions, 7 + num_sessions):
            c = ws.cell(row=summary_row, column=col_idx, value="")
            c.border = thin_border

    else:
        # Class group overview
        cg = ClassGroup.objects.get(id=class_group_id)
        subjects = list(cg.subjects.all())
        students = list(StudentProfile.objects.filter(class_group=cg).select_related("user").order_by("roll_no"))

        max_col = 3 + len(subjects) + 3
        _style_excel_header(ws, max_col, "Cumulative Class Attendance Report", f"Class: {cg.name}", f"AY: {cg.academic_year}")

        start_row = 6
        headers = ["Roll No", "Student Name"] + [s.code for s in subjects] + ["Total Attended", "Total Sessions", "Overall %", "Risk Status"]
        for col_idx, h in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border

        curr_row = start_row + 1
        for st in students:
            ws.cell(row=curr_row, column=1, value=st.roll_no).border = thin_border
            ws.cell(row=curr_row, column=2, value=st.user.get_full_name()).border = thin_border
            
            tot_p = 0
            tot_s = 0
            for idx, subj in enumerate(subjects):
                s_records = AttendanceRecord.objects.filter(student=st, session__subject=subj)
                count_all = s_records.count()
                count_pres = s_records.filter(status="PRESENT").count()
                tot_p += count_pres
                tot_s += count_all
                s_pct = round((count_pres / count_all * 100), 1) if count_all > 0 else 0.0
                c = ws.cell(row=curr_row, column=3 + idx, value=f"{s_pct}%")
                c.alignment = Alignment(horizontal="center")
                c.border = thin_border
                if s_pct < 75.0 and count_all > 0:
                    c.font = danger_font

            overall_pct = round((tot_p / tot_s * 100), 1) if tot_s > 0 else 0.0
            ws.cell(row=curr_row, column=3 + len(subjects), value=tot_p).border = thin_border
            ws.cell(row=curr_row, column=4 + len(subjects), value=tot_s).border = thin_border
            
            c_ov = ws.cell(row=curr_row, column=5 + len(subjects), value=f"{overall_pct}%")
            c_ov.alignment = Alignment(horizontal="center")
            c_ov.border = thin_border
            c_ov.font = danger_font if overall_pct < 75.0 else success_font

            risk_txt = "HIGH RISK" if overall_pct < 75.0 else "NORMAL"
            c_r = ws.cell(row=curr_row, column=6 + len(subjects), value=risk_txt)
            c_r.alignment = Alignment(horizontal="center")
            c_r.border = thin_border
            c_r.font = danger_font if risk_txt == "HIGH RISK" else bold_font

            curr_row += 1

    # Adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            val_str = str(cell.value or "")
            if cell.row > 4 and len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 24

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# 2. Internal Marks Excel
# ---------------------------------------------------------------------------
def generate_marks_excel(subject_id: int) -> bytes:
    """Generates an Excel sheet for CIE and continuous internal marks for a subject."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Internal Marks"
    ws.views.sheetView[0].showGridLines = True

    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    danger_font = Font(name="Calibri", size=10, color="DC2626", bold=True)
    success_font = Font(name="Calibri", size=10, color="16A34A")
    def_font = Font(name="Calibri", size=10)

    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    subject = Subject.objects.select_related("class_group", "faculty").get(id=subject_id)
    class_group = subject.class_group
    assessments = list(Assessment.objects.filter(subject=subject).order_by("created_at"))
    students = list(
        StudentProfile.objects.filter(class_group=class_group).select_related("user").order_by("roll_no")
    )

    marks_map = {}
    for m in Mark.objects.filter(assessment__subject=subject):
        marks_map[(m.student_id, m.assessment_id)] = m

    num_assessments = len(assessments)
    max_col = max(6, 2 + num_assessments + 4)

    subtitle = f"Subject: {subject.name} ({subject.code})"
    faculty_name = subject.faculty.get_full_name() if subject.faculty else "Unassigned"
    meta = f"Class: {class_group.name} | Faculty: {faculty_name} | Generated: {timezone.now().strftime('%d-%b-%Y')}"
    _style_excel_header(ws, max_col, "Continuous Internal Evaluation (CIE) Marks Sheet", subtitle, meta)

    start_row = 6
    headers = ["Roll No", "Student Name"]
    for a in assessments:
        headers.append(f"{a.name}\n(Max {float(a.max_marks):.0f})")
    headers.extend(["Total Obtained", "Max Marks", "Percentage (%)", "Result"])

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border
    ws.row_dimensions[start_row].height = 28

    total_max_marks = sum(float(a.max_marks) for a in assessments)

    curr_row = start_row + 1
    assessment_averages = [0.0] * num_assessments

    for st in students:
        ws.cell(row=curr_row, column=1, value=st.roll_no).border = thin_border
        ws.cell(row=curr_row, column=1).alignment = Alignment(horizontal="center")
        ws.cell(row=curr_row, column=2, value=st.user.get_full_name()).border = thin_border

        obtained_sum = 0.0
        for idx, a in enumerate(assessments):
            m = marks_map.get((st.id, a.id))
            if m:
                if m.is_absent:
                    val_str = "AB"
                    val_num = 0.0
                else:
                    val_num = float(m.marks_obtained)
                    val_str = f"{val_num:.1f}"
            else:
                val_str = "-"
                val_num = 0.0

            obtained_sum += val_num
            assessment_averages[idx] += val_num

            c = ws.cell(row=curr_row, column=3 + idx, value=val_str)
            c.alignment = Alignment(horizontal="center")
            c.border = thin_border
            if val_str == "AB" or (val_str != "-" and val_num < float(a.max_marks) * 0.4):
                c.font = danger_font

        pct = round((obtained_sum / total_max_marks * 100), 1) if total_max_marks > 0 else 0.0

        c_tot = ws.cell(row=curr_row, column=3 + num_assessments, value=round(obtained_sum, 1))
        c_tot.alignment = Alignment(horizontal="center")
        c_tot.border = thin_border
        c_tot.font = bold_font

        c_max = ws.cell(row=curr_row, column=4 + num_assessments, value=total_max_marks)
        c_max.alignment = Alignment(horizontal="center")
        c_max.border = thin_border

        c_pct = ws.cell(row=curr_row, column=5 + num_assessments, value=f"{pct}%")
        c_pct.alignment = Alignment(horizontal="center")
        c_pct.border = thin_border
        c_pct.font = danger_font if pct < 40.0 else (bold_font if pct >= 60.0 else def_font)

        res_txt = "FAIL" if pct < 40.0 else ("DISTINCTION" if pct >= 75.0 else ("FIRST CLASS" if pct >= 60.0 else "PASS"))
        c_res = ws.cell(row=curr_row, column=6 + num_assessments, value=res_txt)
        c_res.alignment = Alignment(horizontal="center")
        c_res.border = thin_border
        c_res.font = danger_font if res_txt == "FAIL" else success_font

        curr_row += 1

    # Class Average Row
    summary_row = curr_row
    ws.cell(row=summary_row, column=1, value="CLASS AVERAGE").font = bold_font
    ws.merge_cells(start_row=summary_row, start_column=1, end_row=summary_row, end_column=2)
    ws.cell(row=summary_row, column=1).alignment = Alignment(horizontal="right")
    ws.cell(row=summary_row, column=1).border = thin_border
    ws.cell(row=summary_row, column=2).border = thin_border

    num_students = len(students)
    for idx, tot_m in enumerate(assessment_averages):
        avg = round(tot_m / num_students, 1) if num_students > 0 else 0.0
        c = ws.cell(row=summary_row, column=3 + idx, value=avg)
        c.font = bold_font
        c.alignment = Alignment(horizontal="center")
        c.border = thin_border

    for col_idx in range(3 + num_assessments, 7 + num_assessments):
        c = ws.cell(row=summary_row, column=col_idx, value="")
        c.border = thin_border

    # Adjust widths
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = 14
    ws.column_dimensions["A"].width = 12
    ws.column_dimensions["B"].width = 24

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# 3. CO-PO Attainment Excel
# ---------------------------------------------------------------------------
def generate_copo_attainment_excel(subject_id: int) -> bytes:
    """Generates an Excel workbook containing CO direct attainment and the CO-PO correlation matrix."""
    wb = openpyxl.Workbook()
    
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    subject = Subject.objects.select_related("class_group", "faculty").get(id=subject_id)
    dept = subject.class_group.department

    # Compute attainment using existing service math
    co_data = compute_co_attainment(subject)
    co_results = co_data.get("co_results", []) if isinstance(co_data, dict) else co_data
    po_data = compute_po_attainment(subject)
    po_results = po_data.get("po_results", []) if isinstance(po_data, dict) else po_data

    # Sheet 1: Course Outcome Attainment
    ws1 = wb.active
    ws1.title = "CO Attainment"
    ws1.views.sheetView[0].showGridLines = True

    _style_excel_header(
        ws1, 7, "Direct Course Outcome (CO) Attainment",
        f"Subject: {subject.name} ({subject.code})",
        f"Class: {subject.class_group.name} | AY: {subject.class_group.academic_year}"
    )

    start_row = 6
    headers1 = ["CO Code", "Description", "Assessed Components", "Students Evaluated", "Met Target Count", "% Met Target", "Attainment Level (0-3)"]
    for idx, h in enumerate(headers1, 1):
        c = ws1.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border
    ws1.row_dimensions[start_row].height = 24

    for r_idx, co in enumerate(co_results, start_row + 1):
        ws1.cell(row=r_idx, column=1, value=co.get("co_code")).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=2, value=co.get("description"))
        ws1.cell(row=r_idx, column=3, value=co.get("assessments_count")).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=4, value=co.get("total_students")).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=5, value=co.get("students_met_target")).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=6, value=f"{co.get('percentage_met', 0):.1f}%").alignment = Alignment(horizontal="center")
        
        c_lvl = ws1.cell(row=r_idx, column=7, value=co.get("attainment_level"))
        c_lvl.alignment = Alignment(horizontal="center")
        c_lvl.font = bold_font

        for col_idx in range(1, 8):
            ws1.cell(row=r_idx, column=col_idx).border = thin_border

    # Adjust widths for Sheet 1
    ws1.column_dimensions["A"].width = 12
    ws1.column_dimensions["B"].width = 38
    ws1.column_dimensions["C"].width = 20
    ws1.column_dimensions["D"].width = 18
    ws1.column_dimensions["E"].width = 18
    ws1.column_dimensions["F"].width = 16
    ws1.column_dimensions["G"].width = 22

    # Sheet 2: CO-PO Matrix
    ws2 = wb.create_sheet(title="CO-PO Correlation Matrix")
    ws2.views.sheetView[0].showGridLines = True

    pos = list(ProgramOutcome.objects.filter(department=dept).order_by("code"))
    po_codes = [p.code for p in pos]
    num_pos = len(po_codes)
    max_col2 = max(4, 1 + num_pos)

    _style_excel_header(
        ws2, max_col2, "CO-PO Correlation Matrix & Derived Attainment",
        f"Subject: {subject.name} ({subject.code})",
        f"Scale: 1-Low, 2-Medium, 3-High | Max Level: 3.0"
    )

    start_row = 6
    headers2 = ["Course Outcome"] + po_codes
    for idx, h in enumerate(headers2, 1):
        c = ws2.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border
    ws2.row_dimensions[start_row].height = 24

    # Build mapping map
    mappings = COPOMapping.objects.filter(course_outcome__subject=subject).select_related("course_outcome", "program_outcome")
    map_dict = {(m.course_outcome.code, m.program_outcome.code): m.level for m in mappings}

    curr_row = start_row + 1
    for co in co_results:
        c_code = co.get("co_code")
        ws2.cell(row=curr_row, column=1, value=c_code).alignment = Alignment(horizontal="center")
        ws2.cell(row=curr_row, column=1).font = bold_font
        ws2.cell(row=curr_row, column=1).border = thin_border

        for p_idx, p_code in enumerate(po_codes, 2):
            val = map_dict.get((c_code, p_code), "-")
            c = ws2.cell(row=curr_row, column=p_idx, value=val)
            c.alignment = Alignment(horizontal="center")
            c.border = thin_border
        curr_row += 1

    # Derived PO Attainment Row
    ws2.cell(row=curr_row, column=1, value="Derived PO Attainment (0-3)").font = bold_font
    ws2.cell(row=curr_row, column=1).border = thin_border

    # po_results is a list of dicts: {"po_code": ..., "attainment": ...}
    po_score_map = {item["po_code"]: item.get("attainment", 0.0) for item in po_results if "po_code" in item}
    for p_idx, p_code in enumerate(po_codes, 2):
        score = po_score_map.get(p_code, 0.0)
        c = ws2.cell(row=curr_row, column=p_idx, value=round(float(score), 2))
        c.font = bold_font
        c.alignment = Alignment(horizontal="center")
        c.border = thin_border

    # Adjust widths for Sheet 2
    ws2.column_dimensions["A"].width = 24
    for p_idx in range(2, 2 + num_pos):
        ws2.column_dimensions[get_column_letter(p_idx)].width = 10

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# 4. Comprehensive Student Progress Report PDF
# ---------------------------------------------------------------------------
def generate_student_progress_pdf(student_id: int) -> bytes:
    """Generates a clean PDF academic progress report card for a student using ReportLab."""
    student = StudentProfile.objects.select_related("user", "class_group", "class_group__department").get(id=student_id)
    user = student.user
    class_group = student.class_group

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        "CollegeTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        alignment=1,  # Center
        textColor=colors.HexColor("#1E3A8A"),
    )
    subtitle_style = ParagraphStyle(
        "DeptSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        alignment=1,
        textColor=colors.HexColor("#475569"),
    )
    doc_header_style = ParagraphStyle(
        "DocHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        alignment=1,
        textColor=colors.HexColor("#0F172A"),
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1E293B"),
    )
    body_style = ParagraphStyle(
        "BodySmall",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#334155"),
    )
    meta_bold = ParagraphStyle(
        "MetaBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E293B"),
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("TATYASAHEB KORE INSTITUTE OF ENGINEERING & TECHNOLOGY", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("Department of Computer Science & Engineering", subtitle_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph("STUDENT ACADEMIC PROGRESS & PERFORMANCE REPORT", doc_header_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1E3A8A"), spaceAfter=10))

    # 2. Student Metadata Box
    advisor_name = class_group.coordinator.get_full_name() if class_group.coordinator else "Not Assigned"
    meta_data = [
        [
            Paragraph("<b>Student Name:</b>", meta_bold),
            Paragraph(user.get_full_name(), body_style),
            Paragraph("<b>Roll Number:</b>", meta_bold),
            Paragraph(student.roll_no, body_style),
        ],
        [
            Paragraph("<b>Class & Div:</b>", meta_bold),
            Paragraph(f"{class_group.name} - Div {class_group.division}", body_style),
            Paragraph("<b>Academic Year:</b>", meta_bold),
            Paragraph(class_group.academic_year, body_style),
        ],
        [
            Paragraph("<b>Class Coordinator:</b>", meta_bold),
            Paragraph(advisor_name, body_style),
            Paragraph("<b>Report Date:</b>", meta_bold),
            Paragraph(timezone.now().strftime("%d-%b-%Y"), body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[1.3 * inch, 2.3 * inch, 1.2 * inch, 2.2 * inch])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Risk Profile & Advisory Banner
    risk_profile = calculate_student_risk_profile(user, class_group)
    risk_level = risk_profile.get("risk_level", "LOW") if risk_profile else "LOW"
    risk_color = (
        colors.HexColor("#DC2626") if risk_level == "HIGH"
        else (colors.HexColor("#D97706") if risk_level == "MEDIUM" else colors.HexColor("#16A34A"))
    )
    risk_bg = (
        colors.HexColor("#FEF2F2") if risk_level == "HIGH"
        else (colors.HexColor("#FFFBEB") if risk_level == "MEDIUM" else colors.HexColor("#F0FDF4"))
    )

    reasons = risk_profile.get("reasons", []) if risk_profile else []
    reason_text = " • ".join(reasons) if reasons else "Academic standing is satisfactory. No critical warnings."

    risk_box_data = [
        [
            Paragraph(f"<b>STATUS: {risk_level} RISK</b>", ParagraphStyle("RiskT", parent=meta_bold, textColor=risk_color, fontSize=9.5)),
            Paragraph(f"<b>Evaluation Summary:</b> {reason_text}", body_style),
        ]
    ]
    risk_table = Table(risk_box_data, colWidths=[1.6 * inch, 5.4 * inch])
    risk_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), risk_bg),
            ("BOX", (0, 0), (-1, -1), 1, risk_color),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    story.append(risk_table)
    story.append(Spacer(1, 12))

    # 4. Attendance Summary Table
    story.append(Paragraph("1. Course Attendance Summary", section_heading))
    story.append(Spacer(1, 4))

    att_headers = ["Code", "Course Name", "Conducted", "Attended", "Attendance %", "Status"]
    att_rows = [[Paragraph(f"<b>{h}</b>", meta_bold) for h in att_headers]]

    total_conducted = 0
    total_attended = 0

    for subj in class_group.subjects.all():
        records = AttendanceRecord.objects.filter(student=student, session__subject=subj)
        conducted = records.count()
        attended = records.filter(status="PRESENT").count()
        total_conducted += conducted
        total_attended += attended
        pct = round((attended / conducted * 100), 1) if conducted > 0 else 0.0
        status_str = "DEFICIT" if pct < 75.0 and conducted > 0 else "ELIGIBLE"

        status_style = ParagraphStyle(
            "StatusStyle",
            parent=body_style,
            textColor=colors.HexColor("#DC2626") if status_str == "DEFICIT" else colors.HexColor("#16A34A"),
            fontName="Helvetica-Bold",
        )

        att_rows.append([
            Paragraph(subj.code, body_style),
            Paragraph(subj.name, body_style),
            Paragraph(str(conducted), body_style),
            Paragraph(str(attended), body_style),
            Paragraph(f"{pct}%", status_style),
            Paragraph(status_str, status_style),
        ])

    overall_att_pct = round((total_attended / total_conducted * 100), 1) if total_conducted > 0 else 0.0
    att_rows.append([
        Paragraph("<b>OVERALL</b>", meta_bold),
        Paragraph("<b>All Courses Aggregate</b>", meta_bold),
        Paragraph(f"<b>{total_conducted}</b>", meta_bold),
        Paragraph(f"<b>{total_attended}</b>", meta_bold),
        Paragraph(f"<b>{overall_att_pct}%</b>", meta_bold),
        Paragraph(f"<b>{'DEFICIT' if overall_att_pct < 75.0 else 'ELIGIBLE'}</b>", meta_bold),
    ])

    att_table = Table(att_rows, colWidths=[1.0 * inch, 2.6 * inch, 0.8 * inch, 0.8 * inch, 1.0 * inch, 0.8 * inch])
    att_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#F1F5F9")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ALIGN", (2, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(att_table)
    story.append(Spacer(1, 12))

    # 5. Internal Assessment Marks
    story.append(Paragraph("2. Continuous Internal Evaluation (CIE) Marks", section_heading))
    story.append(Spacer(1, 4))

    marks_headers = ["Course", "Assessment", "Marks Obtained", "Maximum Marks", "Percentage", "Result"]
    marks_rows = [[Paragraph(f"<b>{h}</b>", meta_bold) for h in marks_headers]]

    student_marks = Mark.objects.filter(student=student).select_related("assessment", "assessment__subject").order_by("assessment__subject__code", "assessment__name")

    if student_marks.exists():
        for m in student_marks:
            a = m.assessment
            subj = a.subject
            max_m = float(a.max_marks)
            if m.is_absent:
                obt_str = "AB"
                pct_str = "0.0%"
                res_str = "ABSENT"
                res_color = colors.HexColor("#DC2626")
            else:
                obt_val = float(m.marks_obtained)
                obt_str = f"{obt_val:.1f}"
                pct_val = round((obt_val / max_m * 100), 1) if max_m > 0 else 0.0
                pct_str = f"{pct_val}%"
                res_str = "FAIL" if pct_val < 40.0 else "PASS"
                res_color = colors.HexColor("#DC2626") if res_str == "FAIL" else colors.HexColor("#16A34A")

            res_style = ParagraphStyle("ResStyle", parent=body_style, textColor=res_color, fontName="Helvetica-Bold")

            marks_rows.append([
                Paragraph(subj.code, body_style),
                Paragraph(a.name, body_style),
                Paragraph(obt_str, body_style),
                Paragraph(f"{max_m:.0f}", body_style),
                Paragraph(pct_str, body_style),
                Paragraph(res_str, res_style),
            ])
    else:
        marks_rows.append([
            Paragraph("No internal assessment marks recorded yet for this semester.", body_style),
            Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style), Paragraph("", body_style),
        ])

    marks_table = Table(marks_rows, colWidths=[1.1 * inch, 2.1 * inch, 1.0 * inch, 1.0 * inch, 1.0 * inch, 0.8 * inch])
    marks_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ("ALIGN", (2, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(marks_table)
    story.append(Spacer(1, 12))

    # 6. Projects & Capstone Experience (if enrolled)
    student_projects = Project.objects.filter(
        Q(team_leader=user) | Q(members__student=user)
    ).distinct()

    if student_projects.exists():
        story.append(Paragraph("3. Capstone Project Allocation", section_heading))
        story.append(Spacer(1, 4))
        proj_headers = ["Project Title", "Domain", "Guide", "Current Status"]
        proj_rows = [[Paragraph(f"<b>{h}</b>", meta_bold) for h in proj_headers]]
        for p in student_projects:
            guide_name = p.guide.get_full_name() if p.guide else "Under Allocation"
            proj_rows.append([
                Paragraph(p.title, body_style),
                Paragraph(p.domain, body_style),
                Paragraph(guide_name, body_style),
                Paragraph(p.get_status_display(), meta_bold),
            ])
        proj_table = Table(proj_rows, colWidths=[2.8 * inch, 1.5 * inch, 1.5 * inch, 1.2 * inch])
        proj_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ])
        )
        story.append(proj_table)
        story.append(Spacer(1, 14))

    # 7. Signature Block
    story.append(KeepTogether([
        Spacer(1, 16),
        Table([
            [
                Paragraph("<b>______________________</b><br/><b>Student Signature</b>", meta_bold),
                Paragraph("<b>______________________</b><br/><b>Class Coordinator</b>", meta_bold),
                Paragraph("<b>______________________</b><br/><b>Head of Department (HOD)</b>", meta_bold),
            ]
        ], colWidths=[2.3 * inch, 2.4 * inch, 2.3 * inch], style=[("ALIGN", (0, 0), (-1, -1), "CENTER")])
    ]))

    doc.build(story)
    return buffer.getvalue()


# ---------------------------------------------------------------------------
# 5. Executive Dashboard KPI Aggregator
# ---------------------------------------------------------------------------
def get_executive_dashboard_kpis(department_id: int = None) -> dict:
    """
    Returns high-level institutional and departmental KPIs for the Executive Dashboard
    (Principal, HOD, and Academic Coordinators).
    """
    dept = None
    if department_id:
        dept = Department.objects.filter(id=department_id).first()
    if not dept:
        dept = Department.objects.first()

    total_students = StudentProfile.objects.filter(user__is_active=True).count()
    total_faculty = FacultyProfile.objects.filter(user__is_active=True).count()
    total_projects = Project.objects.all().count()
    active_projects = Project.objects.exclude(
        status__in=[Project.Status.REJECTED, Project.Status.COMPLETED]
    ).count()
    completed_projects = Project.objects.filter(status=Project.Status.COMPLETED).count()

    # Department Average Attendance %
    all_records = AttendanceRecord.objects.all()
    total_records = all_records.count()
    present_records = all_records.filter(status=AttendanceRecord.Status.PRESENT).count()
    avg_attendance = round((present_records / total_records * 100), 1) if total_records > 0 else 0.0

    # Risk Roster breakdown
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    for st in StudentProfile.objects.select_related("user", "class_group"):
        risk = calculate_student_risk_profile(st.user, st.class_group)
        lvl = risk.get("risk_level", "LOW") if risk else "LOW"
        if lvl == "HIGH":
            high_risk_count += 1
        elif lvl == "MEDIUM":
            medium_risk_count += 1
        else:
            low_risk_count += 1

    # Syllabus completion rate
    total_topics = SyllabusTopic.objects.count()
    covered_topics = TopicCoverage.objects.count()
    syllabus_rate = round((covered_topics / total_topics * 100), 1) if total_topics > 0 else 0.0

    # Pending logbook reviews
    pending_logbooks = LogbookEntry.objects.filter(hod_reviewed_at__isnull=True).count()

    # Project milestone completion
    total_milestones = ProjectMilestone.objects.count()
    completed_milestones = ProjectMilestone.objects.filter(is_completed=True).count()
    milestone_rate = round((completed_milestones / total_milestones * 100), 1) if total_milestones > 0 else 0.0

    # Accreditation / NBA criteria
    criteria_qs = AccreditationCriteria.objects.all()
    if dept:
        criteria_qs = criteria_qs.filter(department=dept)
    
    nba_total = criteria_qs.count()
    nba_compliant = criteria_qs.filter(status=AccreditationCriteria.Status.COMPLIANT).count()
    nba_in_progress = criteria_qs.filter(status=AccreditationCriteria.Status.IN_PROGRESS).count()
    nba_needs_attention = criteria_qs.filter(status=AccreditationCriteria.Status.NEEDS_ATTENTION).count()
    nba_not_started = criteria_qs.filter(status=AccreditationCriteria.Status.NOT_STARTED).count()

    nba_compliance_pct = round((nba_compliant / nba_total * 100), 1) if nba_total > 0 else 0.0

    # Active interventions
    open_interventions = Intervention.objects.filter(status__in=["OPEN", "IN_PROGRESS"]).count()

    return {
        "department_name": dept.name if dept else "Computer Science & Engineering",
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_projects": total_projects,
        "active_projects": active_projects,
        "completed_projects": completed_projects,
        "avg_attendance": avg_attendance,
        "high_risk_students_count": high_risk_count,
        "medium_risk_students_count": medium_risk_count,
        "low_risk_students_count": low_risk_count,
        "syllabus_completion_rate": syllabus_rate,
        "covered_topics_count": covered_topics,
        "total_topics_count": total_topics,
        "pending_logbook_reviews": pending_logbooks,
        "project_milestone_completion_rate": milestone_rate,
        "open_interventions_count": open_interventions,
        "nba_compliance_rate": nba_compliance_pct,
        "nba_summary": {
            "total_criteria": nba_total,
            "compliant": nba_compliant,
            "in_progress": nba_in_progress,
            "needs_attention": nba_needs_attention,
            "not_started": nba_not_started,
        },
    }


# ---------------------------------------------------------------------------
# 6. Comprehensive NBA Multi-Module Accreditation Audit Excel Generator
# ---------------------------------------------------------------------------
def generate_nba_audit_excel(department_id: int = None) -> bytes:
    """
    Generates an official multi-sheet NBA Self-Assessment Report (SAR) Excel workbook
    synthesizing cross-module evidence across all academic operations:
    - Sheet 1: NBA Criteria 1-5 Status & Scored Compliance
    - Sheet 2: Cross-Module Institutional Performance Indicators
    - Sheet 3: Criterion 3 CO-PO Attainment Articulation Summary
    - Sheet 4: Criterion 4 & 5 Capstone Projects with Similarity Scores & Mentors
    - Sheet 5: Department Accreditation Evidence Repository
    """
    wb = openpyxl.Workbook()
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    thin_border = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )

    dept = None
    if department_id:
        dept = Department.objects.filter(id=department_id).first()
    if not dept:
        dept = Department.objects.first()

    kpis = get_executive_dashboard_kpis(dept.id if dept else None)
    criteria_qs = AccreditationCriteria.objects.filter(department=dept).prefetch_related("evidences") if dept else AccreditationCriteria.objects.all().prefetch_related("evidences")

    # Sheet 1: Criteria Compliance
    ws1 = wb.active
    ws1.title = "Criteria Compliance"
    ws1.views.sheetView[0].showGridLines = True

    _style_excel_header(
        ws1, 6, "NBA Self-Assessment Report (SAR) — Criteria Compliance",
        f"Department: {dept.name if dept else 'Computer Science & Engineering'} ({dept.code if dept else 'CSE'})",
        f"Accreditation Body: NBA | Overall Compliance: {kpis.get('nba_compliance_rate', 0)}%"
    )

    headers1 = ["Criterion Code", "Criterion Title", "Status", "Max Marks", "Obtained Marks", "Evidence Links Count"]
    start_row = 6
    for idx, h in enumerate(headers1, 1):
        c = ws1.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border
    ws1.row_dimensions[start_row].height = 24

    tot_max = 0
    tot_obtained = 0
    for r_idx, cr in enumerate(criteria_qs.order_by("code"), start_row + 1):
        ws1.cell(row=r_idx, column=1, value=cr.code).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=2, value=cr.title)
        
        st_cell = ws1.cell(row=r_idx, column=3, value=cr.status)
        st_cell.alignment = Alignment(horizontal="center")
        st_cell.font = bold_font

        ws1.cell(row=r_idx, column=4, value=cr.max_marks).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=5, value=cr.obtained_marks).alignment = Alignment(horizontal="center")
        ws1.cell(row=r_idx, column=6, value=cr.evidences.count()).alignment = Alignment(horizontal="center")

        tot_max += cr.max_marks
        tot_obtained += cr.obtained_marks

        for col_idx in range(1, 7):
            ws1.cell(row=r_idx, column=col_idx).border = thin_border

    summary_r = start_row + criteria_qs.count() + 1
    ws1.cell(row=summary_r, column=1, value="TOTAL").font = bold_font
    ws1.cell(row=summary_r, column=1).alignment = Alignment(horizontal="center")
    ws1.cell(row=summary_r, column=4, value=tot_max).font = bold_font
    ws1.cell(row=summary_r, column=4).alignment = Alignment(horizontal="center")
    ws1.cell(row=summary_r, column=5, value=tot_obtained).font = bold_font
    ws1.cell(row=summary_r, column=5).alignment = Alignment(horizontal="center")
    for col_idx in range(1, 7):
        ws1.cell(row=summary_r, column=col_idx).border = thin_border

    ws1.column_dimensions["A"].width = 16
    ws1.column_dimensions["B"].width = 44
    ws1.column_dimensions["C"].width = 18
    ws1.column_dimensions["D"].width = 14
    ws1.column_dimensions["E"].width = 16
    ws1.column_dimensions["F"].width = 20

    # Sheet 2: Cross-Module Institutional Indicators
    ws2 = wb.create_sheet(title="Institutional Indicators")
    ws2.views.sheetView[0].showGridLines = True

    _style_excel_header(
        ws2, 3, "Cross-Module Quality & Operations Indicators",
        f"TKIET Warananagar · Department of {dept.name if dept else 'CSE'}",
        "Synthesized from Academics, Insights, Capstones & Accreditation Modules"
    )

    kpi_rows = [
        ("Total Active Students Enrolled (M1)", kpis.get("total_students", 0), "Students across SE, TE, and BE batches"),
        ("Total Faculty Teaching Members (M1)", kpis.get("total_faculty", 0), "Full-time teaching faculty with doctoral/masters credentials"),
        ("Student-to-Faculty Ratio (SFR - Criterion 5)", f"{round(kpis.get('total_students', 0) / max(1, kpis.get('total_faculty', 0)), 1)}:1", "Benchmark: <= 15:1 for NBA tier accreditation"),
        ("Department Average Attendance (Criterion 2 & 4)", f"{kpis.get('avg_attendance', 0)}%", "Calculated across all published attendance sessions"),
        ("High-Risk Students Identified (Criterion 4)", kpis.get("high_risk_students_count", 0), "Early-warning threshold (<75% attendance / mark drop >=15%)"),
        ("Medium & Low Risk Students", kpis.get("medium_risk_students_count", 0) + kpis.get("low_risk_students_count", 0), "Tracked through continuous internal evaluations"),
        ("Syllabus Topic Coverage Rate (Criterion 2)", f"{kpis.get('syllabus_completion_rate', 0)}%", f"{kpis.get('covered_topics_count', 0)} of {kpis.get('total_topics_count', 0)} topics completed with teaching logs"),
        ("Pending Digital Logbook Reviews (Criterion 2)", kpis.get("pending_logbook_reviews", 0), "Daily entries logged by faculty awaiting HOD supervisory sign-off"),
        ("Active Capstone Projects (Criterion 4 & 5)", kpis.get("active_projects", 0), "Industry-relevant B.Tech final-year project teams"),
        ("Capstone Milestone Completion Rate", f"{kpis.get('project_milestone_completion_rate', 0)}%", "5-stage formal guide review and sign-off completion"),
        ("NBA Criteria Compliance Rate (Criterion 1..5)", f"{kpis.get('nba_compliance_rate', 0)}%", f"{kpis.get('nba_summary', {}).get('compliant', 0)} compliant of {kpis.get('nba_summary', {}).get('total_criteria', 0)} total criteria"),
    ]

    ws2.cell(row=start_row, column=1, value="Indicator Name").fill = header_fill
    ws2.cell(row=start_row, column=1).font = header_font
    ws2.cell(row=start_row, column=1).alignment = Alignment(horizontal="center")
    ws2.cell(row=start_row, column=1).border = thin_border

    ws2.cell(row=start_row, column=2, value="Metric Value").fill = header_fill
    ws2.cell(row=start_row, column=2).font = header_font
    ws2.cell(row=start_row, column=2).alignment = Alignment(horizontal="center")
    ws2.cell(row=start_row, column=2).border = thin_border

    ws2.cell(row=start_row, column=3, value="Benchmarking & Remarks").fill = header_fill
    ws2.cell(row=start_row, column=3).font = header_font
    ws2.cell(row=start_row, column=3).alignment = Alignment(horizontal="center")
    ws2.cell(row=start_row, column=3).border = thin_border

    for idx, (name, val, remarks) in enumerate(kpi_rows, start_row + 1):
        ws2.cell(row=idx, column=1, value=name).font = bold_font
        ws2.cell(row=idx, column=2, value=str(val)).alignment = Alignment(horizontal="center")
        ws2.cell(row=idx, column=3, value=remarks)
        for col_idx in range(1, 4):
            ws2.cell(row=idx, column=col_idx).border = thin_border

    ws2.column_dimensions["A"].width = 46
    ws2.column_dimensions["B"].width = 18
    ws2.column_dimensions["C"].width = 50

    # Sheet 3: Criterion 3 CO-PO Summary across subjects
    ws3 = wb.create_sheet(title="CO-PO Summary")
    ws3.views.sheetView[0].showGridLines = True

    pos = list(ProgramOutcome.objects.filter(department=dept).order_by("code")) if dept else list(ProgramOutcome.objects.all().order_by("code"))
    po_codes = [p.code for p in pos]

    _style_excel_header(
        ws3, len(po_codes) + 3, "Criterion 3: Program Outcome (PO) Attainment Articulation Matrix",
        f"Department of {dept.name if dept else 'Computer Science & Engineering'}",
        "Direct assessment scores weighted by CO-PO mapping matrix (Scale 0..3)"
    )

    headers3 = ["Course Code", "Course Name", "Class Group"] + po_codes
    for idx, h in enumerate(headers3, 1):
        c = ws3.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border

    subjects = Subject.objects.select_related("class_group").all()
    if dept:
        subjects = subjects.filter(class_group__department=dept)

    for r_idx, sub in enumerate(subjects, start_row + 1):
        ws3.cell(row=r_idx, column=1, value=sub.code).alignment = Alignment(horizontal="center")
        ws3.cell(row=r_idx, column=2, value=sub.name)
        ws3.cell(row=r_idx, column=3, value=sub.class_group.name if sub.class_group else "-").alignment = Alignment(horizontal="center")

        try:
            po_data = compute_po_attainment(sub)
            po_map = {item["po_code"]: item.get("attainment", 0.0) for item in po_data.get("po_results", [])}
        except Exception:
            po_map = {}

        for p_idx, p_code in enumerate(po_codes, 4):
            val = po_map.get(p_code, 0.0)
            c = ws3.cell(row=r_idx, column=p_idx, value=val if val > 0 else "-")
            c.alignment = Alignment(horizontal="center")
            if val > 0:
                c.font = bold_font

        for col_idx in range(1, len(po_codes) + 4):
            ws3.cell(row=r_idx, column=col_idx).border = thin_border

    ws3.column_dimensions["A"].width = 14
    ws3.column_dimensions["B"].width = 32
    ws3.column_dimensions["C"].width = 16
    for p_idx in range(4, len(po_codes) + 4):
        ws3.column_dimensions[get_column_letter(p_idx)].width = 10

    # Sheet 4: Capstone Projects
    ws4 = wb.create_sheet(title="Capstone Projects")
    ws4.views.sheetView[0].showGridLines = True

    _style_excel_header(
        ws4, 6, "Criterion 4 & 5: Capstone Projects Repository & NLP Similarity",
        "Evaluation of Student Projects, Faculty Mentorship & Originality",
        f"Batch AY 2026-27 | Total Projects: {Project.objects.count()}"
    )

    headers4 = ["Project Title", "Domain", "Faculty Guide", "NLP Similarity Score", "Milestones Status", "Current Status"]
    for idx, h in enumerate(headers4, 1):
        c = ws4.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border

    for r_idx, proj in enumerate(Project.objects.select_related("guide").prefetch_related("milestones").all(), start_row + 1):
        ws4.cell(row=r_idx, column=1, value=proj.title)
        ws4.cell(row=r_idx, column=2, value=proj.domain or "-").alignment = Alignment(horizontal="center")
        ws4.cell(row=r_idx, column=3, value=proj.guide.full_name if proj.guide else "-")
        
        check = proj.similarity_checks.first()
        sim_val = f"{check.similarity_score:.1f}%" if check else "Unique (Original)"
        c_sim = ws4.cell(row=r_idx, column=4, value=sim_val)
        c_sim.alignment = Alignment(horizontal="center")
        c_sim.font = bold_font

        total_m = proj.milestones.count()
        comp_m = proj.milestones.filter(is_completed=True).count()
        ws4.cell(row=r_idx, column=5, value=f"{comp_m}/{total_m} completed").alignment = Alignment(horizontal="center")

        ws4.cell(row=r_idx, column=6, value=proj.status).alignment = Alignment(horizontal="center")

        for col_idx in range(1, 7):
            ws4.cell(row=r_idx, column=col_idx).border = thin_border

    ws4.column_dimensions["A"].width = 38
    ws4.column_dimensions["B"].width = 18
    ws4.column_dimensions["C"].width = 24
    ws4.column_dimensions["D"].width = 22
    ws4.column_dimensions["E"].width = 20
    ws4.column_dimensions["F"].width = 16

    # Sheet 5: Evidence Repository
    ws5 = wb.create_sheet(title="Evidence Repository")
    ws5.views.sheetView[0].showGridLines = True

    _style_excel_header(
        ws5, 5, "NBA Accreditation Audit Evidence Repository",
        "Linked Documents, Deliverables, Course Files & Official Records",
        "Evidence Verification for Visiting NBA Peer Team"
    )

    headers5 = ["Criterion Code", "Evidence Title", "Description", "Linked Asset / Type", "Added By"]
    for idx, h in enumerate(headers5, 1):
        c = ws5.cell(row=start_row, column=idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border

    for r_idx, ev in enumerate(EvidenceLink.objects.select_related("criteria", "document", "project", "added_by").all(), start_row + 1):
        ws5.cell(row=r_idx, column=1, value=ev.criteria.code if ev.criteria else "-").alignment = Alignment(horizontal="center")
        ws5.cell(row=r_idx, column=2, value=ev.title).font = bold_font
        ws5.cell(row=r_idx, column=3, value=ev.description or "-")
        
        asset_txt = "External Link" if ev.external_url else ("Document: " + ev.document.title if ev.document else ("Project: " + ev.project.title if ev.project else "Record"))
        ws5.cell(row=r_idx, column=4, value=asset_txt)
        ws5.cell(row=r_idx, column=5, value=ev.added_by.full_name if ev.added_by else "System").alignment = Alignment(horizontal="center")

        for col_idx in range(1, 6):
            ws5.cell(row=r_idx, column=col_idx).border = thin_border

    ws5.column_dimensions["A"].width = 16
    ws5.column_dimensions["B"].width = 30
    ws5.column_dimensions["C"].width = 44
    ws5.column_dimensions["D"].width = 32
    ws5.column_dimensions["E"].width = 20

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
