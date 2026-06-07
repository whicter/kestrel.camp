# Kestrel — Setup & Usage

## Prerequisites

- Node.js 20+
- Python 3.12+ (project uses 3.14)
- Docker Desktop (for Postgres + Redis)
- A Mapbox account (free tier) — optional, for the map view

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

Starts:
- PostgreSQL 16 on port **5433** (not 5432 — avoids conflict with local postgres)
- Redis 7 on port **6379**

---

## 3. Configure environment

**Backend** — create `backend/.env`:
```
DATABASE_URL=postgresql+asyncpg://kestrel:secret@localhost:5433/kestrel
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3001

# Email — get free API key at sendgrid.com (100 emails/day free)
SENDGRID_API_KEY=

# SMS — get credentials at twilio.com
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

**Frontend** — create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=   # get from mapbox.com → Account → Tokens
```

---

## 4. Run database migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

---

## 5. Import campground data

**Option A — Full Recreation.gov bulk import (~1126 campgrounds, recommended):**
```bash
cd backend
source .venv/bin/activate
python import_recreation_gov.py
```
Downloads the RIDB public CSV export (~244MB) from `ridb.recreation.gov/download`. No API key needed. Safe to re-run (upserts by provider_id).

**Option B — Minimal seed data (8 campgrounds, for quick dev):**
```bash
cd backend
source .venv/bin/activate
python seed.py
```

---

## 6. Set up notifications

### Email (SendGrid)
1. Sign up at [sendgrid.com](https://sendgrid.com) — free tier (100 emails/day)
2. Settings → API Keys → Create API Key (Full Access) → copy key
3. Settings → Sender Authentication → Single Sender Verification → add your sender email
4. Add to `backend/.env`: `SENDGRID_API_KEY=SG.xxx`

Email sends automatically whenever the API key is set (dev or production).

### SMS (Twilio)
1. Sign up at [twilio.com](https://twilio.com)
2. Buy a toll-free number (recommended for US compliance)
3. Submit toll-free verification in Twilio console → Messaging → Regulatory Compliance
4. Add to `backend/.env`:
   ```
   TWILIO_ACCOUNT_SID=ACxxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_FROM_NUMBER=+1xxxxxxxxxx
   ```

Users enable SMS and enter their phone number in `/settings`.

---

## 7. Start all services

Open three terminal tabs:

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

Open **http://localhost:3001**.

---

## 8. Basic usage

### Create an account
Click **Get started** in the top nav → register with any email + password.

### Find a campground
Go to **Search** → type a park or campground name → click **Watch** on any result.

### Set an alert
Pick a date range and minimum nights → **Create alert**. The worker scans every 2 minutes and notifies you when a site opens.

### Check your alerts
Go to **My Alerts** → see status (Watching / Available / Paused / Expired). Pause or delete at any time.

Alerts auto-expire when `date_to` passes — no manual cleanup needed.

### Today's Releases
Go to **Releasing** → see which campgrounds have booking windows opening today, what date becomes bookable, and the drop time. Click **Set alert** to watch it.

### Notification settings
Click your username in the nav → **Settings** → toggle email/SMS and enter your phone number.

---

## Development tools

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

## Production checklist

- [ ] Set `ENVIRONMENT=production` in backend env
- [ ] Set a strong random `SECRET_KEY` (`openssl rand -hex 32`)
- [ ] Set `SENDGRID_API_KEY` and verify sender domain (not single sender) for better deliverability
- [ ] Set Twilio credentials + complete toll-free verification
- [ ] Set `FRONTEND_URL` to your actual domain for CORS
- [ ] Run the bulk import: `python import_recreation_gov.py`
- [ ] Run worker with a process manager (systemd, supervisord, or Docker)
- [ ] Add `NEXT_PUBLIC_MAPBOX_TOKEN` to your hosting environment

---

## Common issues

| Problem | Fix |
|---|---|
| `role "kestrel" does not exist` | Local Postgres on port 5432 intercepting — check Docker maps to 5433 |
| `No module named 'greenlet'` | `pip install greenlet` |
| Worker crashes on startup | Use `python run_worker.py` (not `arq` CLI directly — Python 3.14 needs manual event loop) |
| Map shows placeholder | Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local` and restart dev server |
| BC Parks / GoingToCamp always 0 | Azure WAF blocks server-side requests — stubs until Playwright integration |
| SMS error 30032 | Toll-free number not yet verified — submit verification in Twilio console |
| Email 403 Forbidden | Sender email not verified in SendGrid — complete Single Sender Verification |
