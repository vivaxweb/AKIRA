export type Role = "PRINCIPAL" | "HOD" | "FACULTY" | "COORDINATOR" | "STUDENT";

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface StudentProfile {
  id: number;
  roll_no: string;
  class_group: number | null;
  class_group_name?: string;
  admission_year: number;
  user?: User;
}

export interface FacultyProfile {
  id: number;
  employee_id: string;
  designation: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  phone?: string;
  department: number | null;
  department_name?: string;
  department_code?: string;
  is_active: boolean;
  student_profile?: StudentProfile | null;
  faculty_profile?: FacultyProfile | null;
  created_at?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: Role;
    department: number | null;
  };
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CSVImportResult {
  success: boolean;
  structural_error: string | null;
  imported_count: number;
  failed_count: number;
  total_rows: number;
  errors: Array<{
    row: number;
    email: string;
    errors: string[];
  }>;
}

export interface ApiError {
  detail: string;
  code: string;
  fields?: Record<string, string[]>;
}

// --- Academic Types ---
export interface ClassGroup {
  id: number;
  department: number;
  department_name?: string;
  name: string;
  division: string;
  year: number;
  semester: number;
  academic_year: string;
  coordinator: number | null;
  coordinator_name?: string;
  students_count?: number;
}

export interface Subject {
  id: number;
  code: string;
  name: string;
  class_group: number;
  class_group_name?: string;
  faculty: number | null;
  faculty_name?: string;
  credits: number;
  is_active: boolean;
}

export interface SyllabusTopic {
  id: number;
  subject: number;
  unit_no: number;
  title: string;
  planned_hours: number;
  order: number;
  is_covered: boolean;
  covered_on?: string | null;
}

export interface AttendanceRecord {
  id: number;
  student: number;
  student_roll: string;
  student_name: string;
  status: "PRESENT" | "ABSENT" | "LEAVE";
}

export interface AttendanceSession {
  id: number;
  subject: number;
  subject_code: string;
  subject_name: string;
  date: string;
  kind: "LECTURE" | "PRACTICAL" | "TUTORIAL";
  slot: number;
  topic: number | null;
  topic_title?: string;
  marked_by: number | null;
  marked_by_name?: string;
  total_marked: number;
  present_count: number;
  records?: AttendanceRecord[];
}

export interface Assessment {
  id: number;
  subject: number;
  subject_code: string;
  subject_name: string;
  name: string;
  kind: "CIE" | "ASSIGNMENT" | "PRACTICAL" | "OTHER";
  max_marks: string;
  weightage?: string;
  date: string;
  is_published: boolean;
  linked_cos?: string[];
}

export interface Mark {
  id: number;
  assessment: number;
  student: number;
  student_roll: string;
  student_name: string;
  marks_obtained: string | null;
  is_absent: boolean;
}

export interface ProgramOutcome {
  id: number;
  code: string;
  title: string;
  description: string;
}

export interface CourseOutcome {
  id: number;
  subject: number;
  code: string;
  description: string;
}

export interface COPOMapping {
  id: number;
  course_outcome: number;
  program_outcome: number;
  co_code: string;
  po_code: string;
  level: number;
}

export interface COAttainmentResult {
  subject_code: string;
  subject_name: string;
  formula: string;
  config_used: {
    target_pct: number;
    level3_pct: number;
    level2_pct: number;
    level1_pct: number;
    is_placeholder: boolean;
  };
  co_results: Array<{
    co_id: number;
    co_code: string;
    description: string;
    assessments_count: number;
    total_students: number;
    students_met_target: number;
    percentage_met: number;
    attainment_level: number;
    status: string;
  }>;
}

export interface POAttainmentResult {
  subject_code: string;
  subject_name: string;
  formula: string;
  po_results: Array<{
    po_code: string;
    po_title: string;
    attainment: number;
    mapped_cos_count: number;
    status: string;
    contributors?: Array<{
      co_code: string;
      co_level: number;
      mapping_level: number;
    }>;
  }>;
}

export interface LogbookEntry {
  id: number;
  subject: number;
  subject_code: string;
  subject_name: string;
  faculty: number;
  faculty_name: string;
  date: string;
  hours: number;
  topics_taught: string;
  remarks: string;
  hod_remark: string;
  hod_reviewed_at: string | null;
  created_at: string;
}

export interface StudentRiskProfile {
  student_id: number;
  full_name: string;
  email: string;
  roll_number: string;
  class_group_id: number | null;
  class_group_name: string;
  overall_attendance_pct: number;
  total_sessions: number;
  attended_sessions: number;
  marks_avg_pct: number;
  failed_assessments_count: number;
  failed_assessments: Array<{
    assessment_name: string;
    subject_code: string;
    pct: number;
    is_absent: boolean;
  }>;
  grade_drops: Array<{
    subject_code: string;
    from_assessment: string;
    from_pct: number;
    to_assessment: string;
    to_pct: number;
    drop: number;
  }>;
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  risk_flags: {
    attendance: boolean;
    failing: boolean;
    grade_drop: boolean;
  };
  risk_reasons: string[];
  subject_attendance: Array<{
    subject_id: number;
    subject_code: string;
    subject_name: string;
    total_sessions: number;
    attended_sessions: number;
    attendance_pct: number;
  }>;
  interventions_count: number;
  latest_intervention: {
    id: number;
    type: string;
    status: string;
    created_at: string;
    remarks: string;
  } | null;
}

export interface Intervention {
  id: number;
  student: number;
  student_name: string;
  student_roll: string;
  student_email: string;
  intervention_type: "COUNSELING" | "REMEDIAL" | "PARENT_MEETING" | "ATTENDANCE_WARNING";
  intervention_type_display: string;
  status: "PLANNED" | "IN_PROGRESS" | "RESOLVED";
  status_display: string;
  reason: string;
  remarks: string;
  action_taken: string;
  created_by?: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface StudentAnalyticsSummary {
  total_students: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  attendance_risk_count: number;
  grade_drop_count: number;
  failing_count: number;
  average_attendance_pct: number;
  average_marks_pct: number;
  risk_breakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  scatter_points: Array<{
    student_id: number;
    name: string;
    roll_no: string;
    attendance_pct: number;
    marks_avg_pct: number;
    risk_level: "HIGH" | "MEDIUM" | "LOW";
  }>;
  assessment_trends: Array<{
    assessment_id: number;
    assessment_name: string;
    subject_code: string;
    date: string;
    average_pct: number;
    pass_rate_pct: number;
    total_students: number;
  }>;
}

export interface FacultyWorkloadReport {
  faculty_count: number;
  total_teaching_hours: number;
  faculty: Array<{
    faculty_id: number;
    faculty_name: string;
    email: string;
    designation: string;
    weekly_teaching_hours: number;
    subjects_count: number;
    subjects: Array<{
      subject_id: number;
      code: string;
      name: string;
      class_group: string;
      weekly_hours: number;
      total_topics: number;
      covered_topics: number;
      coverage_pct: number;
    }>;
    total_topics: number;
    covered_topics: number;
    overall_coverage_pct: number;
    logbook_entries_count: number;
    pending_logbook_reviews: number;
    verified_logbook_reviews: number;
    last_logbook_date: string | null;
    compliance_status: "EXCELLENT" | "GOOD" | "NEEDS_ATTENTION";
  }>;
}

