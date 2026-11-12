# Department Digital Hub — Project Status

| Phase | Status | Date | Commit Hash |
|---|---|---|---|
| Phase 0 — Scaffolding and environment verification | PASSED | 2026-11-12 | 69b792d |
| Phase 1 — Backend foundation: accounts, roles, auth | PASSED | 2026-11-12 | 9ad4e02 |
| Phase 2 — Frontend foundation and design system | PASSED | 2026-11-12 | 9195d63 |
| Phase 3 — Academic Operations | PASSED | 2026-11-12 | 1e5c373 |
| Phase 4 — Student & Faculty Intelligence | PASSED | 2026-11-12 | 0508537 |
| Phase 5 — Project Repository & Similarity Detection | PASSED | 2026-11-12 | 7ce33ad |
| Phase 6 — Communication & Document Library | PASSED | 2026-11-12 | cd05ea9 |
| Phase 7 — Reports, Accreditation, Dashboards | PASSED | 2026-11-12 | 5ca6ea7 |
| Phase 8 — Hardening, seed data, docs, packaging | PASSED | 2026-11-12 | a9dbf26 |
| Phase 9 — Deployment (Optional) | PREPARED, NOT EXECUTED | - | - |
| Phase 10 — AI Knowledge Assistant (RAG) | NOT STARTED | - | - |

---

## Phase 0 — Scaffolding and environment verification — PASSED
Built:
- Root repository scaffolding (`.gitignore`, `scripts/`, `docs/`, `backend/`, `frontend/`)
- Django 5.2 backend setup with 8 modular apps: `accounts`, `academics`, `insights`, `projects`, `communication`, `assistant`, `reports`, `core`
- PostgreSQL & SQLite dual-mode support via `DATABASE_URL` (SQLite default for zero-setup execution)
- Custom user model foundation in `accounts` (`User`, `Department`, `StudentProfile`, `FacultyProfile`, `ClassGroup`)
- JWT authentication configuration, CORS headers, drf-spectacular OpenAPI schema configuration
- Core pagination, standard exception handler, and `/api/v1/health/` endpoint
- Next.js 14.2 App Router frontend with TypeScript, Tailwind CSS, TanStack Query v5, Recharts, Lucide React, Zod, React Hook Form
- Automated PowerShell scripts: `setup.ps1`, `run-backend.ps1`, `run-frontend.ps1`, `make_zip.ps1`
- Architecture and Assumptions documentation

Commands run & results:
- `python --version` → Python 3.14.2
- `node --version` → v22.18.0
- `npm --version` → 10.9.3
- `git --version` → git version 2.55.0.windows.5
- `.venv\Scripts\python.exe manage.py check` → System check identified no issues (0 silenced)
- `.venv\Scripts\python.exe -m pytest apps/core/tests/test_health.py -v` → 1 passed in 0.52s
- `GET http://localhost:8000/api/v1/health/` → HTTP 200 `{"status":"ok","django_version":"5.2.19","service":"Department Digital Hub API","version":"1.0.0"}`
- `npm run build` (frontend) → Compiled successfully

Tests: 1 passed, 0 failed

Not implemented / partial:
- None for Phase 0. Full domain models and endpoints scheduled for Phases 1–7.

Assumptions added:
- AMP-001: Python 3.14.2 used due to host environment
- AMP-002: Django 5.2.19 used for Python 3.14 compatibility
- AMP-003: scikit-learn 1.9.1 pinned for cp314 binary wheel availability
- AMP-004: psycopg[binary] 3.3.9 pinned for cp314 binary wheel availability
- AMP-010: Next.js 14.2.35 pinned

How to verify by hand:
1. Run `.\backend\.venv\Scripts\python.exe backend\manage.py check` from the repo root to confirm Django configuration validity.
2. Run `.\backend\.venv\Scripts\python.exe -m pytest backend\apps\core\tests\test_health.py` to verify the automated health test passes.
3. Start the backend with `.\scripts\run-backend.ps1` and query `http://127.0.0.1:8000/api/v1/health/` in browser or curl to inspect the 200 OK response.

---

## Phase 1 — Backend foundation: accounts, roles, auth — PASSED
Built:
- `apps/accounts/models.py`: Custom `User` model with 5 roles (`PRINCIPAL`, `HOD`, `FACULTY`, `COORDINATOR`, `STUDENT`), `Department`, `StudentProfile`, `FacultyProfile`
- `apps/accounts/permissions.py`: DRF role permission classes (`IsPrincipal`, `IsHOD`, `IsFacultyLike`, `IsCoordinator`, `IsStudent`, `CanManageUsers`) and `get_scoped_users()` queryset filtering
- `apps/accounts/serializers.py`: Serializers for JWT login, `Me`, change password, user CRUD with nested profile creation/updating
- `apps/accounts/views.py`: `CustomTokenObtainPairView`, `MeView`, `ChangePasswordView`, `UserViewSet` with `toggle_active` and `import_csv` actions, `DepartmentViewSet`
- `apps/accounts/services.py`: Dedicated CSV student import engine validating required headers, syntax, duplicate detection within batch and database, and producing per-row error logs
- `apps/accounts/admin.py`: Django admin registration with inlines and fieldsets for all accounts models
- `apps/accounts/management/commands/seed_demo.py`: Idempotent seeding command with `--reset` support, populating CSE department, 2 class groups, principal, HOD, faculty, coordinator, and 10 students with shared password `Demo@12345`
- Test suite: `test_auth.py` (8 tests), `test_csv_import.py` (4 tests), `test_user_permissions.py` (9 tests)

Commands run & results:
- `.venv\Scripts\python.exe manage.py check` → System check identified no issues (0 silenced)
- `.venv\Scripts\python.exe manage.py seed_demo --reset` → Reset completed, seeded 10 students, 3 faculty, 1 coordinator, 1 HOD, 1 principal
- `.venv\Scripts\python.exe -m pytest -v` → 22 passed in 34.08s

Tests: 22 passed, 0 failed

Not implemented / partial:
- Forgot-password email flow is out of scope per section 12. Password change is fully implemented.

Assumptions added:
- None new in Phase 1 (existing AMP-001 through AMP-010 apply)

How to verify by hand:
1. Run `.\backend\.venv\Scripts\python.exe backend\manage.py seed_demo --reset` to seed demo accounts.
2. In PowerShell or curl, call `POST http://127.0.0.1:8000/api/v1/auth/login/` with `{"email": "hod@demo.local", "password": "Demo@12345"}` and verify JWT tokens and user payload are returned.
3. Call `GET http://127.0.0.1:8000/api/v1/auth/me/` with `Authorization: Bearer <access>` to view the authenticated profile.

---

## Phase 2 — Frontend foundation and design system — PASSED
Built:
- Design system: Slate neutral palette, Indigo 600 accent, responsive layout, accessible typography
- Core UI Primitives: `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `Skeleton`, `EmptyState`, `ProgressBar`, `Pagination`, `Dialog` (Modal), `Table`, `Toast` notifications
- API Client (`src/lib/api.ts`): Bearer JWT headers, silent token refresh on 401, query parameter serialization, and structured API error handling
- Client Providers (`src/lib/providers.tsx`): TanStack Query v5 with 30s `staleTime`, AuthProvider, ToastProvider
- Navigation system (`src/lib/nav.ts`): Role-aware sidebar filtering strictly according to the permission matrix
- Layout shell (`src/components/layout/AppLayout.tsx`): Fixed sidebar on desktop, collapsible mobile menu, header with department indicator, notification icon, user dropdown with role badge, and sign-out
- Application routes:
  - `/login`: Clean, centered sign-in form with one-click demo login quick-fill buttons for evaluators
  - `/dashboard`: Role-specific overview cards populated with live user identity from `/auth/me/`
  - `/settings/profile`: Profile update form and password change with validation
  - `/admin/users`: HOD user directory with debounced search, role filter, server pagination, modal for single user creation, user active/inactive toggle, and CSV student batch importer with per-row error summary
  - `/403`: Accessible restricted access page with return-to-dashboard action
  - `/not-found`: 404 page
  - `/error`: Global error boundary with retry capability

Commands run & results:
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → Compiled successfully
- First Load JS measurements:
  - `/login`: 104 kB (budget ≤ 170 kB)
  - `/dashboard`: 113 kB (budget ≤ 170 kB)
  - `/admin/users`: 107 kB (budget ≤ 170 kB)
  - `/settings/profile`: 105 kB (budget ≤ 170 kB)
  - `/403`: 97.6 kB (budget ≤ 170 kB)
- Live backend verification: Logged in as all 5 roles (`principal@demo.local`, `hod@demo.local`, `faculty1@demo.local`, `coordinator@demo.local`, `student01@demo.local`), confirmed `/auth/me/` = 200 for all, `/users/` = 200 for HOD & Principal, `/users/` = 403 Forbidden for Faculty, Coordinator, and Student.

Tests: Frontend TypeScript and ESLint 0 errors, production build passed, 22 backend tests passing.

Not implemented / partial: None for Phase 2.
Assumptions added: None new (AMP-007, AMP-010 apply).

How to verify by hand:
1. Start frontend with `.\scripts\run-frontend.ps1` and open `http://localhost:3000/login`.
2. Click any of the 5 demo login buttons (e.g. "HOD" or "Student 01") and sign in.
3. Observe role-specific dashboard and navigation. Try navigating to `http://localhost:3000/admin/users` as a student to see the 403 access restricted view.

---

## Phase 3 — Academic Operations — PASSED
Built:
- `apps/academics/models.py`: `Subject`, `ClassGroup`, `SyllabusTopic`, `TopicCoverage`, `AttendanceSession`, `AttendanceRecord`, `Assessment`, `Mark`, `ProgramOutcome`, `CourseOutcome`, `COPOMapping`, `AssessmentCO`, `AttainmentConfig`, `LogbookEntry`
- `apps/academics/services.py`: Direct CO attainment computation engine mapping student mark percentages against department thresholds (levels 0..3), derived PO attainment weighted average, student attendance percentage and low-attendance cutoff calculations
- `apps/academics/permissions.py`: Subject-level faculty permissions, logbook HOD review permissions, student read-only checks
- `apps/academics/serializers.py`: Serializers for full academics suite, bulk attendance session save, bulk marks spreadsheet save with atomic database transactions
- `apps/academics/views.py`: ViewSets for ClassGroup, Subject, Topic, TopicCoverage, AttendanceSession with bulk record endpoints, Assessment with bulk marks save, LogbookEntry with HOD review action, CO & PO attainment computation endpoints
- `apps/academics/admin.py`: Comprehensive Django admin registration for all academic models
- `apps/accounts/management/commands/seed_demo.py`: Extended to seed 2 class groups (`TE-CSE`, `BE-CSE`), 6 subjects, 12 engineering POs, 4 COs with PO correlations for DBMS, 3 assessments, 90 student marks entries, 22 attendance sessions with deliberate below-75% attendance students, and 10 digital logbook entries
- `frontend/src/app/academics/`:
  - `structure/page.tsx`: Class groups, subjects, teaching allocations, coordinator assignments
  - `attendance/page.tsx`: Interactive roster with one-click toggles, past session viewer, student personal statistics with cutoff warnings
  - `marks/page.tsx`: Keyboard-friendly marks grid, absent toggles, publishing, validation against `max_marks`
  - `syllabus/page.tsx`: Unit breakdowns, planned hours progress bar, coverage logging modal
  - `co-po/page.tsx`: Direct CO attainment scores, correlation matrix, derived PO values, department formula default notification
  - `logbook/page.tsx`: Daily faculty entry creation, topics taught log, HOD supervisory review modal
- Test suite: `apps/academics/tests/test_academics.py` (7 tests: bulk attendance idempotency, marks validation, hand-computed CO attainment math, permissions)

Commands run & results:
- `.venv\Scripts\python.exe -m pytest apps/academics/tests/test_academics.py -v` → 7 passed in 75.51s
- `.venv\Scripts\python.exe -m pytest -v` → 29 passed in 200.70s
- `npx tsc --noEmit` → 0 errors
- `npm run lint` → 0 errors
- `npm run build` → 16 static routes compiled successfully, all First Load JS bundles ≤ 108 kB

Tests: 29 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.

Not implemented / partial: None for Phase 3.
Assumptions added:
- AMP-005: Direct CO attainment credits full assessment weight to linked COs without splitting.

How to verify by hand:
1. Start backend and frontend with `.\scripts\run-backend.ps1` and `.\scripts\run-frontend.ps1`.
2. Login as `faculty1@demo.local` with `Demo@12345`.
3. Open `http://localhost:3000/academics/attendance`, mark attendance for DBMS, and save.
4. Open `http://localhost:3000/academics/marks`, enter CIE marks, and publish.
5. Open `http://localhost:3000/academics/co-po`, select DBMS, and observe live calculated CO attainment scores and derived PO values.
6. Open `http://localhost:3000/academics/logbook` and log a daily teaching entry.
7. Login as `hod@demo.local`, open `http://localhost:3000/academics/logbook`, and review/verify the pending entry.

---

## Phase 4 — Student & Faculty Intelligence — PASSED
Built:
- `apps/insights/models.py`: `Intervention` model tracking student early interventions with status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), category, reason, remarks, action taken, created by faculty/HOD, and resolved timestamp.
- `apps/insights/services.py`:
  - Rule-based Student Risk Classification Engine (`calculate_student_risk_profile`): flags attendance <75% (overall or subject-wise), failure in >=2 assessments (<40%), and performance drops (>=15% drop between consecutive assessments). Assigns risk tier `HIGH`, `MEDIUM`, or `LOW` with human-readable rationale list.
  - Class Performance & Correlation Aggregator (`get_student_analytics_summary`): computes class average attendance %, CIE average %, risk distribution, attendance-vs-marks scatter coordinates, assessment progression trends, and single-student timeline deep-dive.
  - Faculty Workload Aggregator (`get_faculty_workload_analytics`): weekly teaching hours, syllabus topic completion pace, and logbook HOD review compliance.
- `apps/insights/views.py`: REST endpoints for `/insights/student-risk/`, `/insights/student-analytics/`, `/insights/faculty-workload/`, and `InterventionViewSet` with custom `/resolve/` action.
- `apps/insights/tests/test_insights.py`: 9 comprehensive automated tests validating risk classification logic, endpoint scoping, student privacy isolation, and intervention workflows.
- `frontend/src/app/insights/`:
  - `risk/page.tsx`: Early warning risk roster, KPI summary cards, filter by risk level, intervention logging modal, and resolution history modal.
  - `students/page.tsx`: Class-level KPI cards, dynamic code-split `StudentCharts.tsx` with Recharts ScatterChart (attendance vs marks), Donut chart (risk distribution), BarChart (assessment progression), and individual student drill-down timeline.
  - `faculty/page.tsx`: Faculty workload cards, weekly credit hours, syllabus progress bars, and logbook review compliance indicators.
- Bundle optimization: Dynamic Next.js code-splitting for Recharts components in `StudentCharts.tsx`, keeping all route bundles ≤ 132 kB.

Commands run & results:
- `.venv\Scripts\python.exe -m pytest apps/insights/tests/test_insights.py -v` → 9 passed in 30.52s
- `.venv\Scripts\python.exe -m pytest -v` → 38 passed in 209.41s
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → 19 static routes compiled successfully, First Load JS bundles ≤ 132 kB (budget ≤ 170 kB)

Tests: 38 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.

Not implemented / partial: None for Phase 4.
Assumptions added: None new (AMP-001 through AMP-010 apply).

How to verify by hand:
1. Start backend and frontend with `.\scripts\run-backend.ps1` and `.\scripts\run-frontend.ps1`.
2. Login as `hod@demo.local` with `Demo@12345`.
3. Open `http://localhost:3000/insights/risk` to view the early warning risk roster. Inspect students with low attendance and grade drops. Click "Log Intervention" to record a counselling session.
4. Open `http://localhost:3000/insights/students` to see the Attendance vs Marks correlation scatter plot, risk distribution donut chart, and assessment pass-rate progression. Select a student in the deep-dive dropdown to inspect their subject attendance breakdown and marks timeline.
5. Open `http://localhost:3000/insights/faculty` to inspect faculty teaching hours, syllabus completion rates, and digital logbook compliance.

---

## Phase 5 — Project Repository & Similarity Detection — PASSED
Built:
- `apps/projects/models.py`:
  - `Project`: title, abstract, domain, batch_year, academic_year, team_leader, guide, github_url, live_url, status (`PROPOSED`, `UNDER_REVIEW`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, `REJECTED`), rejection_reason.
  - `ProjectMember`: project, student, role_in_team ("Team Leader" / "Member"), unique together.
  - `ProjectMilestone`: project, title, description, due_date, order, is_completed, completed_at, guide_signed_off, signed_off_at, guide_remarks.
  - `SimilarityCheck`: input_title, input_abstract, similarity_score, matched_project, match_details, checked_by.
- `apps/projects/similarity.py`:
  - Hybrid NLP duplicate detection engine combining TF-IDF n-grams (1, 2) on title and combined title+abstract with sublinear term-frequency scaling and cosine similarity.
  - Returns maximum similarity percentage (0-100), duplicate risk flag (threshold >= 60.0%), and ranked top matching projects with guide and batch information.
- `apps/projects/serializers.py`: `ProjectListSerializer`, `ProjectDetailSerializer` (with automated milestone generation and team member binding), `ProjectMilestoneSerializer`, and `SimilarityCheckRequest/ResponseSerializer`.
- `apps/projects/views.py`: `ProjectViewSet` with department filtering, `my_projects` scoping, `change-status`, and `assign-guide` actions; `ProjectMilestoneViewSet` with `toggle-complete` and `sign-off` actions; `SimilarityCheckView` API endpoint.
- `apps/projects/permissions.py`: Role-scoped permissions ensuring students only edit their own proposals in draft states, while guides/HOD approve status and sign off milestones.
- `apps/projects/tests/test_projects.py`: 7 automated tests covering duplicate idea detection (>60% flag), distinct ideas (<40%), empty corpus, student proposal creation with default 5 milestones, guide status update permissions, guide milestone sign-offs, and similarity endpoint API.
- `apps/accounts/management/commands/seed_demo.py`: Seeded 6 realistic B.Tech capstone projects across batches 2025-2027 in Machine Learning, Blockchain, Computer Vision, Cloud Computing, and IoT, complete with team members and 30 milestone items.
- `frontend/src/app/projects/page.tsx`:
  - Capstone project catalog with search, domain filter, batch filter, status filter, and "My Associated Projects" tab.
  - Interactive project detail modal with abstract, team roster, guide details, status change controls, and 5-stage milestone timeline with completion checkboxes and guide sign-off inputs.
  - "Submit New Project" modal with live instant similarity detection: debounced TF-IDF meter alerting students in real-time if their proposed idea has high duplicate overlap (>60%) with existing department projects.

Commands run & results:
- `.venv\Scripts\python.exe -m pytest apps/projects/tests/test_projects.py -v` → 7 passed in 49.77s
- `.venv\Scripts\python.exe -m pytest -v` → 45 passed in 367.85s
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → 20 static routes compiled successfully, `/projects` First Load JS: 134 kB (all routes ≤ 134 kB, budget ≤ 170 kB)

Tests: 45 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.

Not implemented / partial: None for Phase 5.
Assumptions added: None new (AMP-001 through AMP-010 apply).

How to verify by hand:
1. Start backend and frontend with `.\scripts\run-backend.ps1` and `.\scripts\run-frontend.ps1`.
2. Login as `student01@demo.local` with `Demo@12345`.
3. Open `http://localhost:3000/projects` to browse the capstone project repository.
4. Click "Submit New Project". Type a duplicate title: *"Smart Automated Crop Disease Detection using Deep Convolutional Neural Networks"* and note the instant similarity meter surging to >75% with a red Duplicate Warning banner listing the existing match!
5. Change to a unique idea (e.g. *"Autonomous Subsea Drone for Coral Reef Acoustic Mapping"*) and observe the meter drop to 0% with a green "Unique Idea" badge.
6. Open any project to view its 5-stage milestone timeline. As student, toggle completion on a milestone.
7. Login as `faculty1@demo.local`, open the same project, and click "Sign Off" on the completed milestone to record formal guide verification with remarks.

---

## Phase 6 — Communication & Document Library — PASSED
Built:
- `apps/communication/models.py`:
  - `Notice`: department, title, content, category (`ACADEMIC`, `EXAM`, `PLACEMENT`, `EVENT`, `GENERAL`), priority (`LOW`, `NORMAL`, `URGENT`), target_roles, is_pinned, expires_at, attachment, published_by.
  - `DepartmentEvent`: department, title, description, event_type (`EXAM`, `DEADLINE`, `WORKSHOP`, `SEMINAR`, `MEETING`, `HOLIDAY`, `OTHER`), start_datetime, end_datetime, location, organizer, target_roles.
  - `DepartmentDocument`: department, title, description, category (`SYLLABUS`, `TIMETABLE`, `CIRCULAR`, `TEMPLATE`, `QUESTION_PAPER`, `LAB_MANUAL`, `ACCREDITATION`, `OTHER`), file, file_size_bytes, file_type, version, allowed_roles (role-scoping for confidential faculty records), uploaded_by, download_count.
- `apps/communication/serializers.py`: `NoticeSerializer`, `DepartmentEventSerializer`, and `DepartmentDocumentSerializer` with automated file size/type computation and file URL serialization.
- `apps/communication/views.py`: `NoticeViewSet` with role filtering and pin ordering; `DepartmentEventViewSet` with event type and date range filters; `DepartmentDocumentViewSet` with role-restricted queryset scoping and `POST /download/` action incrementing counters.
- `apps/communication/permissions.py`: Role-scoped permissions ensuring students have read-only access and cannot see or download staff-only restricted documents.
- `apps/communication/tests/test_communication.py`: 7 automated tests covering faculty notice publication, student publish blocking, role-scoped notice visibility, event creation, confidential document hiding from students, and download tracking.
- `apps/accounts/management/commands/seed_demo.py`: Seeded 4 department notices (urgent, pinned, role-scoped), 4 academic events, and 6 documents (curriculum, academic calendar, IEEE capstone template, lab manual, and confidential question papers).
- `frontend/src/app/communication/notices/page.tsx`: Department Notice Board with pinned announcement banners, category filter pills, keyword search, urgent priority indicators, notice reader modal with attachment links, and publish notice modal.
- `frontend/src/app/communication/events/page.tsx`: Academic Calendar & Deadlines timeline with date badges, event type tags, location, organizer info, and event scheduling modal.
- `frontend/src/app/documents/page.tsx`: Centralized Document Library with category filters, version pills, restricted staff badges, search, download counters, and upload modal with role-based confidentiality controls.

Commands run & results:
- `.venv\Scripts\python.exe -m pytest apps/communication/tests/test_communication.py -v` → 7 passed in 17.20s
- `.venv\Scripts\python.exe -m pytest -v` → 52 passed in 359.04s
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → 23 static routes compiled successfully, all First Load JS bundles ≤ 134 kB (budget ≤ 170 kB)

Tests: 52 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.

Not implemented / partial: None for Phase 6.
Assumptions added: None new (AMP-001 through AMP-010 apply).

How to verify by hand:
1. Start backend and frontend with `.\scripts\run-backend.ps1` and `.\scripts\run-frontend.ps1`.
2. Login as `student01@demo.local` with `Demo@12345`.
3. Open `http://localhost:3000/communication/notices` to view published department notices, inspect pinned circulars, and search by keywords.
4. Open `http://localhost:3000/communication/events` to inspect the academic timeline, CIE-2 exam slots, and capstone presentation dates.
5. Open `http://localhost:3000/documents` to browse public syllabi and templates. Click "Download" to trigger the file download and increment the counter. Notice that confidential faculty question papers are completely hidden from the student view.
6. Login as `hod@demo.local`, open `http://localhost:3000/documents`, and observe the confidential end-semester question paper and faculty appraisal form with restricted staff badges.

---

## Phase 7 — Reports, Accreditation, Dashboards — PASSED
Built:
- `apps/reports/models.py`:
  - `AccreditationCriteria`: code, title, description, accreditation_body ("NBA" / "NAAC"), max_marks, obtained_marks, status (`COMPLIANT`, `IN_PROGRESS`, `NEEDS_ATTENTION`, `NOT_STARTED`), department.
  - `EvidenceLink`: criteria, title, description, document (FK `DepartmentDocument`), project (FK `Project`), external_url, added_by.
- `apps/reports/services.py`:
  - `generate_attendance_excel(class_group_id, subject_id)` (openpyxl): Styled institutional spreadsheet with session slots, present/absent counts, %, and eligibility indicators.
  - `generate_marks_excel(subject_id)` (openpyxl): Continuous internal evaluation spreadsheet with assessment components, class averages, and grade outcomes.
  - `generate_copo_attainment_excel(subject_id)` (openpyxl): 2-sheet workbook with direct CO attainment score calculation and full PO1..PO12 weighted correlation matrix.
  - `generate_student_progress_pdf(student_id)` (reportlab): Official institutional progress report card with college headers, academic standing, subject attendance table, CIE marks breakdown, capstone project allocation, and three signature blocks.
  - `get_executive_dashboard_kpis()`: Real-time aggregator for institutional performance (average attendance, high-risk students, syllabus pace, NBA readiness rate, pending logbook reviews).
- `apps/reports/serializers.py`, `views.py`, `permissions.py`, `urls.py`:
  - ViewSets for criteria and evidence links with HOD/Coordinator management scoping.
  - Dedicated export endpoints with binary content headers for XLSX and PDF downloads.
  - Executive dashboard endpoint providing live metrics for Principal, HOD, and Coordinators.
- `apps/reports/tests/test_reports.py`: 6 automated tests validating XLSX file structure, PDF generation, criteria evidence linking, and executive dashboard KPIs.
- `apps/accounts/management/commands/seed_demo.py`: Extended to seed Criteria 1 through Criteria 5 of NBA Tier-II framework with 7 evidence links to real documents, projects, and department URLs.
- `frontend/src/app/accreditation/page.tsx`: NBA & NAAC quality assurance dashboard with status badges, score meters, linked evidence drawer, and evidence attachment modals.
- `frontend/src/app/reports/page.tsx`: 1-Click Export Center with dedicated cards for Attendance XLSX, Internal Marks XLSX, CO-PO Attainment XLSX, and Student Progress Card PDF.
- `frontend/src/app/dashboard/page.tsx`: Live executive performance bar displaying department attendance, high-risk rosters, capstone projects, syllabus completion, and NBA compliance.

Commands run & results:
- `.venv\Scripts\python.exe -m pytest apps/reports/tests/test_reports.py -v` → 6 passed in 12.62s
- `.venv\Scripts\python.exe -m pytest -v` → 58 passed in 104.70s
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → 27 static routes compiled successfully, all First Load JS bundles ≤ 136 kB (budget ≤ 170 kB)

Tests: 58 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.

Not implemented / partial: None for Phase 7.
Assumptions added: None new (AMP-001 through AMP-010 apply).

How to verify by hand:
1. Start backend and frontend with `.\scripts\run-backend.ps1` and `.\scripts\run-frontend.ps1`.
2. Login as `hod@demo.local` with `Demo@12345`.
3. Open `http://localhost:3000/dashboard` and observe the live Executive Performance Indicators: Average Attendance (79.2%), High Risk Students, Capstones In Progress, Syllabus Completion %, and NBA Readiness Rate (60%).
4. Open `http://localhost:3000/accreditation` to view the 5 NBA Criteria. Click on Criterion C1 or C4 to inspect linked evidence documents and capstone projects. Click "Add Evidence" to attach a new item.
5. Open `http://localhost:3000/reports` to test the 1-Click Export Center. Download:
   - Attendance Register (XLSX) for CS501
   - Internal Assessment Marks Sheet (XLSX) for CS501
   - CO-PO Attainment Calculation (XLSX) for CS501
   - Student Comprehensive Progress Report (PDF)
6. Login as `student01@demo.local` with `Demo@12345`. Open `http://localhost:3000/reports` and click "Download Progress Report (PDF)" to verify student self-service report card download.

---

## Phase 8 — Hardening, seed data, docs, packaging — PASSED
Built:
- OpenAPI JSON specification: Generated `docs/openapi.json` (186 kB) via `drf-spectacular` covering all 8 modular apps.
- Operations Runbook (`docs/RUNBOOK.md`): End-to-end evaluation guide, quickstart instructions, port conflict mitigation, and troubleshooting procedures.
- Complete API Documentation (`docs/API.md`): Detailed REST endpoint index across all authentication, academic, insight, project, communication, report, and system health routes.
- Comprehensive `README.md`: B.Tech final-year project documentation with one-command setup, demo login matrix with 5 quick-fill presets, module catalog, and architecture overview.
- Environment Templates: `backend/.env.example` and `frontend/.env.example` configurations.
- Submission Packaging Automation (`scripts/make_zip.ps1`): Verified automated creation of clean 0.48 MB `submission.zip` stripped of node_modules, virtual environments, build artifacts, databases, and sensitive logs.

Commands run & results:
- `python manage.py spectacular --file docs/openapi.json` → Generated `docs/openapi.json` (186 KB)
- `powershell -ExecutionPolicy Bypass -File scripts/make_zip.ps1` → Submission ZIP created successfully (0.48 MB)
- `.venv\Scripts\python.exe -m pytest -v` → 58 passed in 104.70s
- `npm run lint` → ✔ No ESLint warnings or errors
- `npm run build` → 27 static routes compiled successfully, all First Load JS bundles ≤ 136 kB (budget ≤ 170 kB)

Tests: 58 backend tests passed, frontend TypeScript and ESLint 0 errors, production build passed.
Not implemented / partial: None for Phase 8.
Assumptions added: None new (AMP-001 through AMP-010 apply).

How to verify by hand:
1. Run `powershell -ExecutionPolicy Bypass -File scripts/make_zip.ps1` and verify that `submission.zip` is produced cleanly with size < 5 MB.
2. Open `docs/openapi.json` or query `http://127.0.0.1:8000/api/docs/` to inspect the complete OpenAPI documentation.
3. Review `docs/RUNBOOK.md` and verify all setup and troubleshooting instructions.






