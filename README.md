# Department Digital Hub

A centralized web platform for academic operations, analytics, project repositories with duplicate-idea detection, communication, report/accreditation support, and an AI knowledge assistant for Computer Science & Engineering departments.

> **B.Tech Final-Year Project** (Academic Year 2026-27)  
> Department of Computer Science & Engineering  
> Tatyasaheb Kore Institute of Engineering & Technology (TKIET), Warananagar

---

## 1. Quick Start (Windows 11)

### Prerequisites
- Python 3.11+ (or 3.14)
- Node.js 18+ and npm 9+
- Git

### One-Command Setup
Clone or unzip the repository, open PowerShell in the project root, and execute:

```powershell
.\scripts\setup.ps1
```

This single command will:
1. Create a Python virtual environment in `backend\.venv`
2. Install all pinned backend dependencies
3. Generate local `.env` configuration
4. Run migrations using zero-setup SQLite database
5. Seed demo accounts and academic datasets
6. Install frontend dependencies in `frontend\node_modules`

### Running the Application

Open two separate PowerShell terminal windows:

**Terminal 1 — Backend API:**
```powershell
.\scripts\run-backend.ps1
```
Backend API will be live at `http://127.0.0.1:8000/`.  
Interactive API Docs (Swagger): `http://127.0.0.1:8000/api/docs/`  
Health Check: `http://127.0.0.1:8000/api/v1/health/`

**Terminal 2 — Frontend Application:**
```powershell
.\scripts\run-frontend.ps1
```
Frontend Web Portal will be live at `http://localhost:3000/`.

---

## 2. Demo Logins

All demo accounts share the password: **`Demo@12345`**

| Role | Email | Scope & Permissions |
|---|---|---|
| **Principal** | `principal@demo.local` | Institution-wide read access, accreditation overview, institute dashboards |
| **HOD** | `hod@demo.local` | Full department management, user administration, approval workflows, logbook review |
| **Faculty** | `faculty1@demo.local` | Assigned subjects attendance marking, assessments & marks grid, logbook entry |
| **Coordinator** | `coordinator@demo.local` | All faculty permissions plus class-level oversight, class risk lists |
| **Student** | `student01@demo.local` | Self attendance review, marks view, project submission, notice board, AI assistant |

---

## 3. Technology Stack

- **Frontend:** Next.js 14.2 (App Router), TypeScript 5, Tailwind CSS 3, TanStack Query v5, Recharts, Lucide React
- **Backend:** Python 3.14 / Django 5.2, Django REST Framework 3.15, SimpleJWT, drf-spectacular
- **Database:** SQLite (default for local zero-setup dev) / PostgreSQL 15 (production via `DATABASE_URL`)
- **Reporting:** ReportLab (PDF), openpyxl (Excel/XLSX)
- **ML / Similarity:** Scikit-Learn (TF-IDF Vectorizer with sublinear term frequency and n-grams)

---

## 4. Running Tests

```powershell
# Backend unit & integration tests
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# Frontend lint & build check
cd ..\frontend
npm run lint
npm run build
```

---

## 5. Building the Submission ZIP

To create `submission.zip` stripped of node_modules, virtual environments, build artifacts, and sensitive logs:

```powershell
.\scripts\make_zip.ps1
```
