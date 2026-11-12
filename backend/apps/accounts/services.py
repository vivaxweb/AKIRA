"""
CSV student import service.
Columns required: email, first_name, last_name, roll_no, class_group_id
- Structural validation: header check, empty file check. If structural error, imports nothing.
- Row validation: validates each row individually.
- Imports all valid rows inside a transaction (or batch) and reports errors for invalid rows.
"""
import csv
import io
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.db import transaction
from .models import User, StudentProfile, Department
from apps.academics.models import ClassGroup


REQUIRED_COLUMNS = ["email", "first_name", "last_name", "roll_no", "class_group_id"]


def import_students_from_csv(csv_file_or_content, default_department=None, acting_user=None):
    """
    Parses and imports students from a CSV.
    Returns:
    {
        "success": bool,
        "structural_error": str or None,
        "imported_count": int,
        "failed_count": int,
        "total_rows": int,
        "errors": [{"row": int, "email": str, "errors": [str]}]
    }
    """
    if isinstance(csv_file_or_content, bytes):
        content = csv_file_or_content.decode("utf-8-sig", errors="replace")
    elif hasattr(csv_file_or_content, "read"):
        raw = csv_file_or_content.read()
        if isinstance(raw, bytes):
            content = raw.decode("utf-8-sig", errors="replace")
        else:
            content = raw
    else:
        content = str(csv_file_or_content)

    reader = csv.reader(io.StringIO(content.strip()))
    try:
        header = next(reader, None)
    except Exception as e:
        return {
            "success": False,
            "structural_error": f"Failed to parse CSV file: {str(e)}",
            "imported_count": 0,
            "failed_count": 0,
            "total_rows": 0,
            "errors": [],
        }

    if not header:
        return {
            "success": False,
            "structural_error": "CSV file is empty.",
            "imported_count": 0,
            "failed_count": 0,
            "total_rows": 0,
            "errors": [],
        }

    # Normalize header column names (trim and lowercase)
    norm_header = [col.strip().lower() for col in header]
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in norm_header]
    if missing_cols:
        return {
            "success": False,
            "structural_error": f"Missing required columns in CSV header: {', '.join(missing_cols)}. Expected: {', '.join(REQUIRED_COLUMNS)}",
            "imported_count": 0,
            "failed_count": 0,
            "total_rows": 0,
            "errors": [],
        }

    col_index = {col: norm_header.index(col) for col in REQUIRED_COLUMNS}

    # Cache class groups to prevent repeated queries
    available_class_groups = {str(cg.id): cg for cg in ClassGroup.objects.all()}

    # Track emails and roll numbers within file to catch duplicates in same batch
    seen_emails_in_batch = set()
    seen_roll_nos_in_batch = set()

    row_errors = []
    valid_rows = []
    row_num = 1  # 1 is header

    for row in reader:
        row_num += 1
        if not row or not any(field.strip() for field in row):
            continue  # skip completely blank rows

        email = row[col_index["email"]].strip() if len(row) > col_index["email"] else ""
        first_name = row[col_index["first_name"]].strip() if len(row) > col_index["first_name"] else ""
        last_name = row[col_index["last_name"]].strip() if len(row) > col_index["last_name"] else ""
        roll_no = row[col_index["roll_no"]].strip() if len(row) > col_index["roll_no"] else ""
        class_group_id = row[col_index["class_group_id"]].strip() if len(row) > col_index["class_group_id"] else ""

        errors = []

        # Validate email
        if not email:
            errors.append("Email is required.")
        else:
            try:
                validate_email(email)
                if email.lower() in seen_emails_in_batch:
                    errors.append(f"Duplicate email '{email}' in this CSV file.")
                elif User.objects.filter(email__iexact=email).exists():
                    errors.append(f"A user with email '{email}' already exists.")
            except ValidationError:
                errors.append(f"Invalid email address '{email}'.")

        # Validate names
        if not first_name:
            errors.append("First name is required.")
        if not last_name:
            errors.append("Last name is required.")

        # Validate roll number
        if not roll_no:
            errors.append("Roll number is required.")
        else:
            if roll_no in seen_roll_nos_in_batch:
                errors.append(f"Duplicate roll number '{roll_no}' in this CSV file.")
            elif StudentProfile.objects.filter(roll_no=roll_no).exists():
                errors.append(f"A student with roll number '{roll_no}' already exists.")

        # Validate class group
        cg_obj = None
        if not class_group_id:
            errors.append("Class group ID is required.")
        elif class_group_id not in available_class_groups:
            errors.append(f"Class group ID '{class_group_id}' does not exist.")
        else:
            cg_obj = available_class_groups[class_group_id]
            # If acting user is HOD, verify class group belongs to HOD's department
            if acting_user and acting_user.role == User.Role.HOD and acting_user.department_id:
                if cg_obj.department_id != acting_user.department_id:
                    errors.append(f"Class group '{cg_obj.name}' belongs to another department.")

        if errors:
            row_errors.append({
                "row": row_num,
                "email": email,
                "errors": errors,
            })
        else:
            seen_emails_in_batch.add(email.lower())
            seen_roll_nos_in_batch.add(roll_no)
            valid_rows.append({
                "email": email.lower(),
                "first_name": first_name,
                "last_name": last_name,
                "roll_no": roll_no,
                "class_group": cg_obj,
            })

    # Perform imports for all valid rows
    imported_count = 0
    if valid_rows:
        with transaction.atomic():
            for item in valid_rows:
                # Use class group department or default
                dept = item["class_group"].department if item["class_group"] else default_department
                user = User.objects.create_user(
                    email=item["email"],
                    password="Demo@12345",
                    first_name=item["first_name"],
                    last_name=item["last_name"],
                    role=User.Role.STUDENT,
                    department=dept,
                )
                StudentProfile.objects.create(
                    user=user,
                    roll_no=item["roll_no"],
                    class_group=item["class_group"],
                    admission_year=item["class_group"].year if item["class_group"] else 2023,
                )
                imported_count += 1

    return {
        "success": len(row_errors) == 0,
        "structural_error": None,
        "imported_count": imported_count,
        "failed_count": len(row_errors),
        "total_rows": len(valid_rows) + len(row_errors),
        "errors": row_errors,
    }
