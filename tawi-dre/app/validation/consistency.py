from typing import Dict, Any, List, Optional
from app.models import StudentRecord, MarkType


def validate_attendance(
    present: int,
    absent: int,
    school_days: int
) -> Dict[str, Any]:
    """
    Mathematical consistency check for physical attendance row:
    Present days + Absent days must not exceed total school session days.
    """
    total = present + absent

    if total > school_days:
        return {
            "valid": False,
            "reason": (
                f"Present + absent = {total}, "
                f"but school days = {school_days}"
            )
        }

    return {
        "valid": True,
        "reason": None
    }


def validate_student_record(
    record: StudentRecord,
    school_days: Optional[int] = None
) -> List[str]:
    """
    Evaluate structural rules on a parsed student row:
    - Name presence & length
    - Mathematical consistency of mark counts
    - Valid admission number structure
    """
    issues: List[str] = []

    # 1. Student Name rule
    if not record.student_name or len(record.student_name.strip()) < 2:
        issues.append("Missing or illegible student name")

    # 2. Daily marks vs total count
    present_marks = sum(1 for m in record.attendance_marks if m.status == MarkType.PRESENT)
    absent_marks = sum(1 for m in record.attendance_marks if m.status == MarkType.ABSENT)

    if school_days is not None:
        val = validate_attendance(present_marks, absent_marks, school_days)
        if not val["valid"]:
            issues.append(val["reason"])

    # 3. Monthly total match
    if record.total_present > 0 and record.total_present != present_marks:
        issues.append(
            f"Parsed total present ({record.total_present}) does not equal counted tick marks ({present_marks})"
        )

    return issues


def detect_duplicate_students(records: List[StudentRecord]) -> List[str]:
    """
    Check for duplicate student names or admission numbers across rows.
    """
    seen_names: Dict[str, int] = {}
    seen_adms: Dict[str, int] = {}
    warnings: List[str] = []

    for rec in records:
        clean_name = rec.student_name.strip().lower()
        if clean_name in seen_names:
            warnings.append(
                f"Duplicate student name '{rec.student_name}' on rows {seen_names[clean_name]} and {rec.row_index}"
            )
        else:
            seen_names[clean_name] = rec.row_index

        if rec.admission_number:
            adm = str(rec.admission_number).strip()
            if adm in seen_adms:
                warnings.append(
                    f"Duplicate admission number '{adm}' on rows {seen_adms[adm]} and {rec.row_index}"
                )
            else:
                seen_adms[adm] = rec.row_index

    return warnings
