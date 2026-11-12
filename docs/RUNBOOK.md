# Department Digital Hub — Operations & Evaluation Runbook

This runbook guides evaluators and developers through setup, demo data seeding, testing, manual verification, and troubleshooting for the **Department Digital Hub** (B.Tech Computer Science & Engineering, TKIET Warananagar).

---

## 1. Prerequisites

- **Python**: 3.11 or higher (Python 3.14.2 verified)
- **Node.js**: v18 or higher (v22.18.0 LTS verified)
- **PowerShell / Terminal**: Windows PowerShell 5.1+, PowerShell 7+, or bash
- **Git**: Installed for version tracking

---

## 2. Automated Setup (One-Click)

From the project root:

```powershell
.\scripts\setup.ps1
```

This automated script will:
1. Create a Python virtual environment in `backend/.venv`
2. Install all backend dependencies (`pip install -r backend/requirements.txt`)
3. Install frontend dependencies (`npm install` inside `frontend/`)
4. Apply all database migrations (`python manage.py migrate`)
5. Seed realistic demo data (`python manage.py seed_demo --reset`)

---

## 3. Starting the Services

Open two terminal windows from the repository root:

### Terminal 1 — Backend API Server
```powershell
.\scripts\run-backend.ps1
```
Runs at: **`http://127.0.0.1:8000`**
- Health Check: `http://127.0.0.1:8000/api/v1/health/`
- Interactive Swagger UI: `http://127.0.0.1:8000/api/docs/`
- OpenAPI JSON Schema: `http://127.0.0.1:8000/api/schema/`
- Django Admin: `http://127.0.0.1:8000/django-admin/`

### Terminal 2 — Next.js Frontend
```powershell
.\scripts\run-frontend.ps1
```
Runs at: **`http://localhost:3000`**

---

## 4. Evaluator Credentials

All demo user accounts share the common password: **`Demo@12345`**

| Role | Email | Password | Primary Capabilities & Responsibilities |
|---|---|---|---|
| **Principal** | `principal@demo.local` | `Demo@12345` | Institution-wide oversight, cross-department read access, accreditation review, executive KPIs |
| **HOD** | `hod@demo.local` | `Demo@12345` | Department administration, user management & CSV import, project approvals, logbook review |
| **Faculty** | `faculty1@demo.local` | `Demo@12345` | Attendance entry, CIE marks entry, digital logbook logging, capstone milestone sign-off |
| **Faculty** | `faculty2@demo.local` | `Demo@12345` | Course coordination, syllabus coverage tracking, document management |
| **Coordinator**| `coordinator@demo.local`| `Demo@12345` | Class group coordination, attendance compliance audits, student intervention logging |
| **Student** | `student01@demo.local`| `Demo@12345` | Personal attendance & CIE marks tracking, capstone proposal submission, progress card PDF |
| **Student** | `student28@demo.local`| `Demo@12345` | Seeded below 75% attendance to demonstrate early warning risk detection & remedial alerts |

> **Evaluator Quick-Fill**: On `http://localhost:3000/login`, one-click demo login buttons automatically fill credentials for all 5 roles.

---

## 5. Running Automated Tests

### Backend Test Suite (58 Tests)
```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```
Verifies:
- JWT authentication, password updates, and token refresh
- User management scoping and CSV batch importer validation
- Attendance idempotency, marks validation, hand-computed CO-PO attainment math
- Rule-based risk classification engine (<75% attendance, grade drop, failing CIE)
- NLP hybrid similarity duplicate proposal detection (>= 60% threshold)
- Role-scoped communication, notices, events, and confidential document isolation
- OpenPyXL attendance, marks, and CO-PO XLSX generation
- ReportLab student progress report card PDF generation
- Executive dashboard KPI aggregation

### Frontend Linter and Production Build
```powershell
cd frontend
npm run lint
npm run build
```
Verifies:
- 0 TypeScript errors (`tsc --noEmit`)
- 0 ESLint warnings or errors
- 27 static routes generated
- First Load JS bundle budget strictly ≤ 170 kB (peak: 136 kB)

---

## 6. Building the Submission ZIP

To package the project for academic submission without heavy temporary dependencies:

```powershell
.\scripts\make_zip.ps1
```
Creates `submission.zip` in the project root, automatically excluding `node_modules`, `.venv`, `.next`, `__pycache__`, and `.git`.

---

## 7. Troubleshooting

### Port Conflicts
- If port `8000` is busy: `.\backend\.venv\Scripts\python.exe backend\manage.py runserver 8080`
- If port `3000` is busy: `cd frontend; npm run dev -- -p 3001`

### Reset Database
To completely wipe and re-seed the demo dataset:
```powershell
.\backend\.venv\Scripts\python.exe backend\manage.py seed_demo --reset
```
