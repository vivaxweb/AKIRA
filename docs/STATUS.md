# Department Digital Hub — Project Status

| Phase | Status | Date | Commit Hash |
|---|---|---|---|
| Phase 0 — Scaffolding and environment verification | PASSED | 2026-11-12 | pending |
| Phase 1 — Backend foundation: accounts, roles, auth | NOT STARTED | - | - |
| Phase 2 — Frontend foundation and design system | NOT STARTED | - | - |
| Phase 3 — Academic Operations | NOT STARTED | - | - |
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
