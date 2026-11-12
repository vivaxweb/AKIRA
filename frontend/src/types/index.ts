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
