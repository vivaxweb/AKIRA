# Department Digital Hub — API Reference

Comprehensive REST API documentation for the **Department Digital Hub** backend.

- **Interactive Swagger UI**: `http://127.0.0.1:8000/api/docs/`
- **OpenAPI Schema (JSON)**: `http://127.0.0.1:8000/api/schema/` or `docs/openapi.json`
- **Base Endpoint**: `http://127.0.0.1:8000/api/v1/`

---

## 1. Authentication (`/api/v1/auth/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `POST` | `/auth/login/` | Obtain JWT access + refresh tokens and profile payload | Public |
| `POST` | `/auth/refresh/` | Refresh expired access token | Public |
| `GET` | `/auth/me/` | Current user profile, role, and department metadata | Authenticated |
| `POST` | `/auth/change-password/` | Update user password with old password verification | Authenticated |

---

## 2. User & Department Management (`/api/v1/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/departments/` | List academic departments | Authenticated |
| `GET` | `/users/` | List users with search, role filtering, pagination | HOD, Principal |
| `POST` | `/users/` | Create a new staff or student user | HOD |
| `GET` | `/users/{id}/` | Retrieve user details | HOD, Principal |
| `PATCH`| `/users/{id}/` | Update user profile and details | HOD |
| `POST` | `/users/{id}/toggle_active/` | Toggle active/inactive status | HOD |
| `POST` | `/users/import_csv/` | Batch import students from CSV with row validation | HOD |

---

## 3. Academic Operations (`/api/v1/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/class-groups/` | List class groups and divisions | Authenticated |
| `GET` | `/subjects/` | List subjects with teaching faculty allocations | Authenticated |
| `GET` | `/syllabus-topics/` | List syllabus topics for subject | Authenticated |
| `POST` | `/syllabus-topics/{id}/log_coverage/` | Mark topic as taught on date | Faculty (allotted) |
| `GET` | `/attendance-sessions/` | List attendance sessions | Authenticated |
| `POST` | `/attendance-sessions/bulk_save/` | Atomic bulk attendance save / update | Faculty (allotted) |
| `GET` | `/assessments/` | List CIE and practical assessments | Authenticated |
| `POST` | `/assessments/{id}/bulk_marks/` | Atomic bulk marks spreadsheet entry | Faculty (allotted) |
| `GET` | `/co-po/co-attainment/?subject_id={id}` | Direct CO attainment scores (Levels 0..3) | Staff |
| `GET` | `/co-po/po-attainment/?subject_id={id}` | Derived PO attainment weighted average | Staff |
| `GET` | `/logbooks/` | Faculty digital teaching logbook | Faculty, Coordinator, HOD |
| `POST` | `/logbooks/{id}/review/` | HOD supervisory logbook sign-off | HOD |

---

## 4. Student & Faculty Intelligence (`/api/v1/insights/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/insights/student-risk/` | Early warning academic risk roster | Staff |
| `GET` | `/insights/student-analytics/` | Class KPI cards, attendance vs marks scatter | Staff |
| `GET` | `/insights/faculty-workload/` | Weekly teaching hours & logbook compliance | Staff |
| `GET` | `/insights/interventions/` | Student remedial interventions list | Staff |
| `POST` | `/insights/interventions/` | Record counseling / remedial session | Staff |
| `POST` | `/insights/interventions/{id}/resolve/`| Mark intervention as resolved | Staff |

---

## 5. Project Repository & Similarity Detection (`/api/v1/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/projects/` | Browse capstone projects with search and filters | Authenticated |
| `POST` | `/projects/` | Submit project proposal (auto 5 milestones) | Student, Staff |
| `GET` | `/projects/{id}/` | Project details, team members, and milestones | Authenticated |
| `POST` | `/projects/similarity-check/` | Instant debounced TF-IDF duplicate checker | Authenticated |
| `POST` | `/projects/{id}/change_status/` | Approve, reject, or update proposal status | Guide, HOD |
| `POST` | `/project-milestones/{id}/toggle_complete/` | Student toggles milestone completed | Team Member |
| `POST` | `/project-milestones/{id}/sign_off/` | Guide formal verification & remarks | Guide, HOD |

---

## 6. Communication & Document Library (`/api/v1/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/notices/` | List published notices (role-scoped) | Authenticated |
| `POST` | `/notices/` | Publish urgent or general notice | Faculty, Coordinator, HOD |
| `GET` | `/department-events/` | Academic calendar & deadlines | Authenticated |
| `POST` | `/department-events/` | Schedule exam slot or event | Faculty, Coordinator, HOD |
| `GET` | `/documents/` | Document library (confidential files hidden) | Authenticated |
| `POST` | `/documents/` | Upload document with role permissions | Staff |
| `POST` | `/documents/{id}/download/` | Record download & return file stream | Authenticated (scoped) |

---

## 7. Reports & Accreditation (`/api/v1/reports/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/reports/attendance-export/` | Download styled attendance matrix XLSX | Staff |
| `GET` | `/reports/marks-export/` | Download continuous internal marks XLSX | Staff |
| `GET` | `/reports/copo-export/` | Download CO-PO attainment calculation XLSX | Staff |
| `GET` | `/reports/student-progress-pdf/` | Download student progress report card PDF | Authenticated |
| `GET` | `/reports/executive-dashboard/` | High-level executive KPI metrics | Principal, HOD, Coord |
| `GET` | `/reports/criteria/` | NBA / NAAC accreditation criteria checklist | Authenticated |
| `POST` | `/reports/criteria/` | Create or update criterion | HOD, Coordinator |
| `POST` | `/reports/evidence/` | Attach document or project evidence | HOD, Coordinator |

---

## 8. System Health (`/api/v1/`)

| Method | Endpoint | Description | Role / Permission |
|---|---|---|---|
| `GET` | `/health/` | Service health status, Django version, and API version | Public (200 OK) |
