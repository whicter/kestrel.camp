# Kestrel — Setup & Usage

## Prerequisites

- Node.js 20+
- Python 3.12+ (project uses 3.14)
- Docker Desktop (for Postgres + Redis)
- A Mapbox account (free tier works) — optional, for the map view

---

## 1. Clone & install

```bash
git clone <repo>
cd kestrel

# Frontend
npm install

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## 2. Start infrastructure

```bash
# From project root
docker compose up -d
```

This starts:
- PostgreSQL 16 on port **5433** (not 5432 — avoids conflict with any local postgres)
- Redis 7 on port **6379**

---

## 3. Configure environment

**Backend** — create `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://kestrel:kestrel@localhost:5433/kestrel
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
JWT_EXPIRE_DAYS=7
IS_PRODUCTION=false
FRONTEND_URL=http://localhost:3000
```

**Frontend** — edit `.env.local` (already exists):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # paste your token here
```

Get a Mapbox token at [mapbox.com](https://mapbox.com) → Account → Tokens. The free tier is sufficient.

---

## 4. Run database migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

---

## 5. Seed campground data

```bash
cd backend
source .venv/bin/activate
python seed.py
```

Seeds 8 campgrounds across 4 providers (Yosemite, Grand Canyon, Crater Lake, Pfeiffer Big Sur, Julia Pfeiffer Burns, Rubble Creek, Canisbay Lake, Samuel P. Taylor).

---

## 6. Start all services

Open four terminal tabs:

**Tab 1 — FastAPI**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000 --reload
```

**Tab 2 — ARQ worker**
```bash
cd backend
source .venv/bin/activate
python run_worker.py
```

**Tab 3 — Next.js**
```bash
# From project root
npm run dev
```

**Tab 4 — (optional) watch worker logs**
```bash
tail -f /tmp/kestrel-worker.log
```

Open **http://localhost:3000**.

---

## 7. Basic usage

### Create an account
Click **Get started** in the top nav → register with any email + password.

### Find a campground
Go to **Search** → type a park or campground name → click **Watch** on any result.

### Set an alert
Pick a date range and minimum nights → **Create alert**. The worker will scan every 2 minutes and email you when a site opens.

### Check your alerts
Go to **Alerts** → see status (Watching / Triggered / Paused). Pause or delete at any time.

### Today's Releases
Go to **Releasing** → see which campgrounds have booking windows opening today, what date is becoming bookable, and what time the drop happens. Click **Set alert** on any entry to watch it.

---

## Development tools

### Trigger a manual scan
```bash
# Replace <campground_id> with a real UUID from the DB
curl -X POST http://localhost:8000/debug/scan/<campground_id>
```

### List all campgrounds
```bash
curl http://localhost:8000/debug/campgrounds
```

### API docs
```
http://localhost:8000/docs
```

---

## Production checklist

- Set `IS_PRODUCTION=true` in backend env
- Set a strong `JWT_SECRET`
- Set `SENDGRID_API_KEY` and `FROM_EMAIL` for real email delivery
- Set `FRONTEND_URL` to your actual domain for CORS
- Change Postgres port mapping back to 5432 (or use a managed DB)
- Run worker with a process manager (systemd, supervisord, or Docker)
- Add `NEXT_PUBLIC_MAPBOX_TOKEN` to your hosting environment

---

## Common issues

| Problem | Fix |
|---|---|
| `role "kestrel" does not exist` | Local Postgres intercepting port 5432 — make sure Docker maps to 5433 |
| `No module named 'greenlet'` | `pip install greenlet` |
| Worker crashes on startup | Python 3.12+ requires `run_worker.py` (not `arq app.workers.main.WorkerSettings` directly) |
| Map shows placeholder | Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local` and restart dev server |
| BC Parks / GoingToCamp always show 0 sites | Azure WAF blocks server-side requests — these providers are stubs pending Playwright integration |
