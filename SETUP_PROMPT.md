# AKIRA (Department Digital Hub) — Antigravity Automated Setup Prompt

> **Usage**: When you or a teammate clone this repository and open it in Antigravity, simply copy the entire prompt below and paste it into the Antigravity chat. The agent will autonomously configure the backend virtual environment, install packages, create `.env` files, run migrations, seed the complete academic dataset, install frontend packages, and verify the health of all services.

---

```markdown
# TASK: Complete Automated Environment Setup & Verification for AKIRA (Department Digital Hub)

You are tasked with setting up the entire development environment for the cloned repository **AKIRA (Department Digital Hub)**. Ensure the backend and frontend are properly configured, all dependencies are installed, environment files are generated, the database is migrated and populated with demo seed data, and both services are verified to run without errors.

---

### Phase 1: Prerequisites & System Diagnostics
1. Check the local operating system and shell environment.
2. Verify the installed tools and versions:
   - Python: Ensure Python 3.11+ is installed (`python --version` or `py --version`).
   - Node.js & npm: Ensure Node.js 18+ and npm 9+ are installed (`node --version`, `npm --version`).
   - Git: Ensure git is available (`git --version`).
3. If on Windows and executing PowerShell scripts, ensure script execution policy does not block local scripts (`Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`).

---

### Phase 2: Backend Environment & Database Setup (Django + DRF)
Navigate to the `backend/` directory and perform the following:
1. **Python Virtual Environment**:
   - Check if `.venv/` exists. If not, create it: `python -m venv .venv`.
   - Upgrade pip inside the virtual environment.
2. **Install Dependencies**:
   - Install all pinned dependencies from `backend/requirements.txt`:
     - Windows: `.venv\Scripts\pip.exe install -r requirements.txt`
     - Linux/macOS: `.venv/bin/pip install -r requirements.txt`
3. **Environment Configuration**:
   - Check if `backend/.env` exists. If not, copy `backend/.env.example` to `backend/.env`.
   - Ensure `DEBUG=True`, `DATABASE_URL=sqlite:///db.sqlite3`, and `CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000` are configured.
   - Note: `GROQ_API_KEY` is optional (fallback deterministic mode works out of the box if empty).
4. **Database Migrations**:
   - Run migrations using the built-in SQLite database:
     - Windows: `.venv\Scripts\python.exe manage.py migrate --run-syncdb`
     - Linux/macOS: `.venv/bin/python manage.py migrate --run-syncdb`
5. **Seed Demo Academic Data**:
   - Execute the demo seed command to populate realistic accounts, departments, courses, students, faculty, and capstone project data:
     - Windows: `.venv\Scripts\python.exe manage.py seed_demo`
     - Linux/macOS: `.venv/bin/python manage.py seed_demo`
   - Verify that all demo users and mock datasets were seeded without errors.

---

### Phase 3: Frontend Environment Setup (Next.js 14 + Tailwind CSS)
Navigate to the `frontend/` directory and perform the following:
1. **Node Dependencies**:
   - Check if `frontend/node_modules/` exists. If not or if outdated, install dependencies:
     `npm install`
2. **Environment Configuration**:
   - Check if `frontend/.env.local` exists. If not, copy `frontend/.env.example` to `frontend/.env.local`.
   - Ensure `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` is present.
3. **Frontend Build / Validation**:
   - Run a quick build or lint check (`npm run build` or inspect with Next.js) to ensure there are no missing packages or TypeScript compilation issues.

---

### Phase 4: Verification & Sanity Checks
1. Check that port `8000` (Django backend) and port `3000` (Next.js frontend) are free and available.
2. Verify backend readiness:
   - Check that `manage.py check` passes with 0 system errors.
   - Check that the health check endpoint responds: `GET http://127.0.0.1:8000/api/v1/health/`
   - Check that Swagger documentation schema compiles: `http://127.0.0.1:8000/api/docs/`
3. Verify helper scripts:
   - Verify that `scripts/setup.ps1`, `scripts/run-backend.ps1`, and `scripts/run-frontend.ps1` exist and are ready for daily use.

---

### Phase 5: Final Report & Quick Start Guide
Provide a concise, formatted summary containing:
1. **Status of Setup**: Confirm Backend, Frontend, and SQLite database are ready.
2. **How to Run**:
   - Terminal 1 (Backend): `.\scripts\run-backend.ps1` or `.venv\Scripts\python.exe backend/manage.py runserver`
   - Terminal 2 (Frontend): `.\scripts\run-frontend.ps1` or `cd frontend; npm run dev`
3. **Key Application URLs**:
   - Web App: `http://localhost:3000`
   - API Docs: `http://127.0.0.1:8000/api/docs/`
   - Django Admin: `http://127.0.0.1:8000/django-admin/`
4. **Demo Login Credentials** (all use password: `Demo@12345`):
   - HOD: `hodcse@tkietwarana.ac.in`
   - Faculty: `amol_patil@tkietwarana.ac.in`
   - Coordinator: `asphalle@tkietwarana.ac.in`
   - Principal: `principal@demo.local`
   - Student: `student01@demo.local`
```
