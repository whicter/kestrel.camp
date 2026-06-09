# Kestrel — Setup Guide

---

## Local Development

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.12+
- Docker Desktop (for Postgres + Redis)

### 1. Clone & install

```bash
git clone https://github.com/whicter/kestrel.camp.git
cd kestrel

# Frontend
pnpm install

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Start infrastructure

```bash
# From project root
docker compose up -d
```

Starts:
- PostgreSQL 16 on port **5433** (not 5432 — avoids conflict with local postgres)
- Redis 7 on port **6379**

### 3. Configure environment

**Backend** — create `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://kestrel:secret@localhost:5433/kestrel
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3001

# Email — get free API key at sendgrid.com
SENDGRID_API_KEY=

# SMS — get credentials at twilio.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# Error monitoring — get DSN from sentry.io
SENTRY_DSN=
```

**Frontend** — create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=   # mapbox.com → Account → Tokens
NEXT_PUBLIC_SENTRY_DSN=     # sentry.io → project settings
```

### 4. Run database migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

### 5. Import campground data

**Full import (recommended):**
```bash
# Recreation.gov — ~1126 US federal campgrounds
python import_recreation_gov.py

# ReserveCalifornia — 115 CA state parks
python import_reserve_california.py
```

Both scripts are safe to re-run (upserts by provider_id). `import_recreation_gov.py` downloads the RIDB CSV (~244MB) on first run.

**Minimal seed (8 campgrounds, quick dev):**
```bash
python seed.py
```

### 6. Start all services

Three terminal tabs:

```bash
# Tab 1 — FastAPI
cd backend && source .venv/bin/activate
uvicorn app.main:app --port 8000 --reload

# Tab 2 — ARQ worker
cd backend && source .venv/bin/activate
python run_worker.py

# Tab 3 — Next.js
pnpm dev
```

Open **http://localhost:3001**.

---

## Production Deployment

### Current setup
- **Frontend**: Vercel (auto-deploys on push to `master`)
- **Backend API**: Railway service
- **Worker**: Railway service (separate from API, same repo)
- **PostgreSQL**: Railway managed Postgres
- **Redis**: Railway managed Redis

### Railway environment variables (API + Worker services)

```
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
SECRET_KEY=<openssl rand -hex 32>
ENVIRONMENT=production
FRONTEND_URL=https://kestrel-camp.vercel.app

SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

SENTRY_DSN=https://...@sentry.io/...
```

### Vercel environment variables

```
NEXT_PUBLIC_API_URL=https://<railway-api-url>
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...
```

### Running migrations in production

Migrations are **not** run automatically on deploy. Run them manually against the Railway database:

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://<railway-db-url>" .venv/bin/alembic upgrade head
```

### Creating an admin user

Register an account through the UI first, then:

```bash
cd backend
source .venv/bin/activate
DATABASE_URL="postgresql+asyncpg://<railway-db-url>" python make_admin.py user@example.com
```

Or connect directly via psql and run:
```sql
UPDATE users SET is_admin = true WHERE email = 'user@example.com';
```

---

## Notifications Setup

### Email (SendGrid)
1. Sign up at [sendgrid.com](https://sendgrid.com) — free tier (100 emails/day)
2. Settings → API Keys → Create API Key → copy
3. Settings → Sender Authentication → Single Sender Verification → verify sender email
4. Set `SENDGRID_API_KEY` in environment

### SMS (Twilio)
1. Sign up at [twilio.com](https://twilio.com)
2. Buy a toll-free number
3. Messaging → Regulatory Compliance → submit toll-free verification
4. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

### Sentry
1. Create account at [sentry.io](https://sentry.io)
2. Create two projects: one **FastAPI**, one **Next.js**
3. Copy each DSN to the corresponding environment variable
4. For source maps: Settings → Auth Tokens → create token → set `SENTRY_AUTH_TOKEN` in Vercel

---

## Development Tools

### Trigger a manual scan
```bash
curl -X POST http://localhost:8000/debug/scan/<campground_id>
```

### List all campgrounds
```bash
curl http://localhost:8000/debug/campgrounds
```

### API docs (Swagger UI)
```
http://localhost:8000/docs
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `role "kestrel" does not exist` | Local Postgres on port 5432 intercepting — confirm Docker maps to 5433 |
| Worker crashes on startup | Use `python run_worker.py`, not `arq` CLI directly |
| Map shows placeholder | Add `NEXT_PUBLIC_MAPBOX_TOKEN` and restart dev server |
| BC Parks / GoingToCamp always 0 results | Azure WAF blocks server-side requests — known limitation |
| SMS error 30032 | Toll-free number not yet verified — submit in Twilio console |
| Email 403 Forbidden | Sender not verified in SendGrid — complete Single Sender Verification |
| Sentry not receiving events | Check DSN env vars are set and redeploy |
