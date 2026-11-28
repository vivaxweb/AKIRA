# EduSync — Academic Hub

A centralized, enterprise-grade web platform for academic operations, student and faculty intelligence, capstone project repository with NLP duplicate-idea detection, role-scoped communication, accreditation and report generation, and an AI knowledge assistant for college engineering departments.

> **Repository**: [https://github.com/vivaxweb/AKIRA](https://github.com/vivaxweb/AKIRA)  
> **B.Tech Final-Year Project** (Academic Year 2026-27)  
> Department of Computer Science & Engineering  
> Tatyasaheb Kore Institute of Engineering & Technology (TKIET), Warananagar

---

## 🤖 1-Click Automated Setup with Antigravity
If you are using **Google Antigravity** (or another AI coding assistant), open this repository and paste the prompt found in:
👉 **[`SETUP_PROMPT.md`](SETUP_PROMPT.md)**

The assistant will autonomously prepare Python `.venv`, install packages, configure `.env`, run SQLite migrations, seed full demo data, and verify frontend & backend readiness!

---

## 1. Quick Start

### Prerequisites
- **Python**: 3.11, 3.12, 3.13 (or 3.14) — *Ensure "Add python.exe to PATH" was selected during install*
- **Node.js**: v18, v20, or v22 LTS (includes `npm`)
- **Git**: Installed
- **PowerShell**: 5.1+ or PowerShell 7+ (on Windows) or Bash (on Linux/macOS)

### Step 1: Clone the Repository
```bash
git clone https://github.com/vivaxweb/AKIRA.git
cd AKIRA
```

### Step 2: Automated One-Command Setup (Windows / PowerShell)
In PowerShell from the project root:

```powershell
.\scripts\setup.ps1
```

> **Note (PowerShell Execution Policy)**: If Windows prevents running `.ps1` scripts, run this once:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

#### Manual Step-by-Step Setup (Alternative / macOS / Linux):
```bash
# Backend Setup
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate --run-syncdb
python manage.py seed_demo
cd ..

# Frontend Setup
cd frontend
cp .env.example .env.local
npm install
cd ..
```

This will:
1. Create a Python virtual environment in `backend/.venv`
2. Install all backend dependencies
3. Generate local `.env` and `.env.local` configurations
4. Run migrations using the zero-setup SQLite database (`db.sqlite3`)
5. Seed realistic demo accounts and full academic datasets (`python manage.py seed_demo`)
6. Install frontend dependencies in `frontend/node_modules`

---

## 2. Running the Application

Open two separate PowerShell terminal windows:

### Terminal 1 — Backend API
```powershell
.\scripts\run-backend.ps1
```
- **Backend API**: `http://127.0.0.1:8000/`
- **Interactive Swagger UI**: `http://127.0.0.1:8000/api/docs/`
- **OpenAPI Schema (JSON)**: `http://127.0.0.1:8000/api/schema/`
- **Health Check**: `http://127.0.0.1:8000/api/v1/health/`
- **Django Admin**: `http://127.0.0.1:8000/django-admin/`

### Terminal 2 — Next.js Frontend
```powershell
.\scripts\run-frontend.ps1
```
- **Frontend Web Portal**: `http://localhost:3000/`

---

## 3. Demo Accounts & Evaluator Quick-Fill

All demo accounts share the password: **`Demo@12345`**

On the login page (`http://localhost:3000/login`), **5 One-Click Quick-Fill buttons** allow instant switching between all roles without manual typing:

| Role | Name & Official Email | Password | Scope & Key Capabilities |
|---|---|---|---|
| **Principal** | Dr. D. N. Mudgal<br>`principal@demo.local` | `Demo@12345` | Institution-wide oversight, cross-department read access, NBA accreditation audit, executive KPIs |
| **HOD** | Dr. Ramgouda B. Patil<br>`hodcse@tkietwarana.ac.in` | `Demo@12345` | Full department management, user directory & CSV student importer, project approvals, logbook review |
| **Faculty Guide** | Prof. Amol G. Patil<br>`amol_patil@tkietwarana.ac.in` | `Demo@12345` | Allocated courses attendance roster, CIE marks grid, digital logbook entries, capstone milestone sign-off |
| **Class Coordinator** | Prof. Anil S. Phalle<br>`asphalle@tkietwarana.ac.in` | `Demo@12345` | Class group coordination, attendance compliance audits, student intervention logging |
| **Student** | Vivek Vijaykumar Desai (Roll: 26MCA121)<br>`student01@demo.local` | `Demo@12345` | Attendance tracking, CIE marks view, capstone proposal submission with instant similarity meter, progress card PDF |
| **Student (At Risk)** | Chaitra Ramesh Gavali (Roll: 26MCA128)<br>`student28@demo.local` | `Demo@12345` | Seeded below 75% attendance and with mark drop to demonstrate early warning risk detection & remedial alerts |

---

## 4. Key Modules & Features

### M1: User & Role Management (`/admin/users`)
- 5-Tier Role-Based Access Control (`PRINCIPAL`, `HOD`, `FACULTY`, `COORDINATOR`, `STUDENT`).
- HOD user directory with server pagination, role filtering, and debounced search.
- Single user creation and active/inactive status toggling.
- CSV Student Batch Importer with syntax validation, duplicate checking, and row-level error reporting.

### M2: Academic Operations (`/academics/*`)
- **Structure & Allocation (`/academics/structure`)**: Class groups, divisions, subjects, and teaching faculty allocations.
- **Attendance Register (`/academics/attendance`)**: Interactive one-click toggle roster, session history, and student-wise cutoff statistics.
- **Internal Marks (`/academics/marks`)**: Keyboard-friendly marks grid, absent toggles, publishing workflow, and max-marks validation.
- **Syllabus Coverage (`/academics/syllabus`)**: Unit breakdown, planned hours progress bar, and topic teaching log.
- **Digital Logbook (`/academics/logbook`)**: Daily teaching entries with topic coverage, and HOD supervisory review/verification modal.
- **CO-PO Attainment (`/academics/co-po`)**: Direct CO attainment scores (Levels 0..3), PO correlation matrix, and derived PO weighted averages.

### M3: Student & Faculty Intelligence (`/insights/*`)
- **Academic Risk List (`/insights/risk`)**: Deterministic rule-based engine flagging attendance < 75%, grade drops >= 15%, and multiple CIE failures.
- **Student Analytics (`/insights/students`)**: Dynamic code-split Recharts ScatterChart (attendance vs marks), Donut chart (risk tiers), and individual student timeline deep-dive.
- **Faculty Workload (`/insights/faculty`)**: Weekly teaching hours, syllabus pace, and digital logbook review compliance.
- **Intervention Tracking**: Formal counseling and remedial action logging with resolution workflows.

### M4: Capstone Project Repository & Similarity Detection (`/projects`)
- Multi-domain capstone project catalog across graduation batches 2025–2027.
- **Instant Similarity Detection**: Hybrid NLP engine (TF-IDF n-grams 1-2 on title and title+abstract with cosine similarity) warning students in real-time if their proposed idea overlaps >= 60% with existing department projects.
- **5-Stage Milestone Timeline**: Team member completion tracking and formal faculty guide sign-offs with review remarks.

### M5: Communication & Document Library (`/communication/*`, `/documents`)
- **Notice Board (`/communication/notices`)**: Priority announcements (urgent, pinned, role-scoped).
- **Academic Events (`/communication/events`)**: Timeline of CIE exam weeks, workshops, and capstone presentations.
- **Document Library (`/documents`)**: Syllabi, templates, lab manuals, and confidential examination paper banks (strictly hidden from student accounts).

### M6: Reports, Accreditation & Dashboards (`/reports`, `/accreditation`, `/dashboard`)
- **1-Click Export Center (`/reports`)**:
  - Attendance Register (XLSX) formatted for university submission.
  - Internal Assessment Marks Sheet (XLSX) with class averages.
  - CO-PO Attainment Calculation (XLSX) 2-sheet workbook.
  - Student Comprehensive Progress Card (PDF) with college headers and signatures.
- **NBA & NAAC Quality Assurance (`/accreditation`)**: Criteria 1 to 5 checklist with compliance badges and linked evidence repository (documents, projects, external URLs).
- **Executive Performance Indicators (`/dashboard`)**: Real-time KPI dashboard for Principal and HOD (average attendance, high-risk rosters, active capstones, syllabus rate, and NBA readiness).

---

## 5. Technology Stack & Design Decisions

| Component | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | Next.js 14.2 (App Router) + TypeScript | React Server Components, file-based routing, strict type safety |
| **Styling & Icons** | Tailwind CSS 3 + Lucide React | Accessible, responsive Slate/Indigo palette |
| **State & API Client** | TanStack Query v5 + Fetch Client | Silent Bearer JWT refresh on 401, query caching, 0 bundle bloat |
| **Backend Framework** | Django 5.2 + Django REST Framework 3.15 | Battle-tested ORM, clean serializer validation, modular architecture |
| **Auth & Security** | SimpleJWT + Role Scoping | Short-lived access token in memory, refresh token stored safely |
| **Database** | Dual-mode: SQLite (default) / PostgreSQL | Zero external database dependencies required for local evaluation |
| **Spreadsheet Generation**| openpyxl | Multi-sheet styled Excel generation with cell borders and formulas |
| **PDF Generation** | ReportLab | Flowable document templates for official printable report cards |
| **NLP Duplicate Engine** | Scikit-Learn (TF-IDF + Cosine Similarity) | Fast, deterministic text similarity without heavy external LLM reliance |

---

## 6. Running Automated Tests

```powershell
# 1. Run all 58 backend tests
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# 2. Run frontend linter and production build
cd ..\frontend
npm run lint
npm run build
```

---

## 7. Packaging Academic Submission ZIP

To generate a clean ZIP archive of the project for academic submission without heavy temporary dependencies:

```powershell
.\scripts\make_zip.ps1
```
This produces `submission.zip` in the project root, automatically excluding `.venv`, `node_modules`, `.next`, `__pycache__`, `db.sqlite3`, and `.git`.

---

## 8. License & Academic Attribution

Developed for B.Tech Computer Science & Engineering final-year project evaluation (TKIET Warananagar, Academic Year 2026-27). All rights reserved.
