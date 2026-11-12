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
