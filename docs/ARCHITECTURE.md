# Department Digital Hub — Architecture

## System Overview

The Department Digital Hub is a full-stack web application built as a B.Tech final-year project for the CSE Department at TKIET Warananagar (Academic Year 2026-27).

## Architecture Block Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  Next.js 14.2 (App Router) + TypeScript + Tailwind CSS          │
│  TanStack Query · React Hook Form · Zod · Recharts (lazy)       │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTPS / REST (JSON)
                           │  Bearer JWT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DJANGO BACKEND                             │
│  Python 3.14 · Django 5.2 · Django REST Framework 3.15         │
│                                                                  │
│  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │ accounts   │ │academics │ │insights  │ │  projects     │   │
│  │ auth/JWT   │ │ attend.  │ │ analytics│ │  similarity   │   │
│  │ RBAC       │ │ marks    │ │ risk     │ │  TF-IDF/emb   │   │
│  │ CSV import │ │ CO-PO    │ │ faculty  │ │  SimilarityBk │   │
│  └────────────┘ └──────────┘ └──────────┘ └───────────────┘   │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │communication│ │assistant │ │ reports  │ │  core        │   │
│  │ notices     │ │ doc lib  │ │ XLSX/PDF │ │  pagination  │   │
│  │ events      │ │ RAG/chat │ │ accredit.│ │  exceptions  │   │
│  │ deadlines   │ │ Groq LLM │ │ criteria │ │  health      │   │
│  │ notifs      │ │ChromaDB  │ │          │ │              │   │
│  └─────────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                                  │
│  OpenAPI (drf-spectacular) · JWT (simplejwt) · WhiteNoise       │
└───────────┬────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────┐
│                 DATABASE LAYER               │
│                                              │
│  SQLite (dev, default) ◄─── DATABASE_URL ───►│
│  PostgreSQL 15 (production/Supabase)         │
│                                              │
│  ChromaDB (optional, for RAG embeddings)     │
└──────────────────────────────────────────────┘
```

## Module-to-Feature Map

| Module | Django App | Frontend Routes |
|--------|-----------|----------------|
| M1 User & Role Mgmt | accounts | /admin/users, /settings/profile |
| M2 Academic Operations | academics | /academics/* |
| M3 Student/Faculty Intelligence | insights | /insights/* |
| M4 Project Repository | projects | /projects/* |
| M5 AI Knowledge Assistant | assistant | /documents, /assistant |
| M6 Communication | communication | /communication/* |
| M7 Reports & Accreditation | reports | /reports, /accreditation |

## Key Design Decisions

1. **SQLite by default** — zero external dependencies for local dev/demo
2. **Role-based access enforced server-side** — DRF permission classes + queryset scoping
3. **TF-IDF similarity (default)** — no ML models needed; corpus cached in memory
4. **Rule-based analytics** — no ML models; all thresholds configurable via AttainmentConfig
5. **WhatsApp stub** — NotificationChannel abstraction; WhatsApp makes no network calls
6. **JWT auth** — access token in memory, refresh in localStorage (trade-off documented)
