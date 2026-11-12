# Department Digital Hub — Project Status

| Phase | Status | Date | Commit Hash |
|---|---|---|---|
| Phase 0 — Scaffolding and environment verification | PASSED | 2026-11-12 | 69b792d |
| Phase 1 — Backend foundation: accounts, roles, auth | PASSED | 2026-11-12 | 9ad4e02 |
| Phase 2 — Frontend foundation and design system | PASSED | 2026-11-12 | 9195d63 |
| Phase 3 — Academic Operations | PASSED | 2026-11-12 | 1e5c373 |
| Phase 4 — Student & Faculty Intelligence | NOT STARTED | - | - |
| Phase 5 — Project Repository & Similarity Detection | NOT STARTED | - | - |
| Phase 6 — Communication & Document Library | NOT STARTED | - | - |
| Phase 7 — Reports, Accreditation, Dashboards | NOT STARTED | - | - |
| Phase 8 — Hardening, seed data, docs, packaging | NOT STARTED | - | - |
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



