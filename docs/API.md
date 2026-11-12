# Department Digital Hub — API Documentation

Auto-generated OpenAPI schema is available at:
- **Schema (JSON):** `/api/schema/`
- **Swagger UI:** `/api/docs/`
- **Exported file:** `docs/openapi.json` (generated in Phase 8)

See the running server for interactive API exploration.

## Base URL

`/api/v1/`

## Authentication

All endpoints (except `/api/v1/health/` and auth endpoints) require:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/auth/login/ | Obtain access + refresh tokens |
| POST | /api/v1/auth/refresh/ | Refresh access token |
| GET | /api/v1/auth/me/ | Current user profile |
| POST | /api/v1/auth/change-password/ | Change password |

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/health/ | Health check (public) |

> Full endpoint documentation is auto-generated. See /api/docs/ when the server is running.
