# Kestrel 🏕️

Campsite availability alerts. Get notified the moment a site opens up — no more refreshing reservation pages.

**Live**: https://kestrel-camp.vercel.app

---

## What it does

- Search 1,100+ US federal campgrounds (Recreation.gov) and 115 California state parks (ReserveCalifornia)
- Set a watch on any campground for a date range → get emailed (or texted) when a site opens
- Automatically scans every 2 minutes; accelerates to every 30 seconds during booking drop windows
- "Today's Releases" page shows which campgrounds become bookable today and at what time

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, SQLAlchemy (async), Alembic |
| Queue | Redis + ARQ |
| Database | PostgreSQL 16 |
| Email | SendGrid |
| SMS | Twilio |
| Monitoring | Sentry |
| Hosting | Vercel (frontend) + Railway (backend + DB + Redis) |

## Docs

- [Architecture](docs/ARCHITECTURE.md) — system design, data models, scan worker flow
- [Setup](docs/SETUP.md) — local development + production deployment
- [User Guide](docs/USER_GUIDE.md) — end-user documentation

## Quick start (local)

```bash
git clone https://github.com/whicter/kestrel.camp.git
cd kestrel

# Infrastructure
docker compose up -d

# Backend
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python import_recreation_gov.py      # ~1126 campgrounds
python import_reserve_california.py  # 115 CA state parks

# Start backend + worker + frontend (3 terminals)
uvicorn app.main:app --port 8000 --reload
python run_worker.py
cd .. && pnpm dev
```

See [docs/SETUP.md](docs/SETUP.md) for full instructions.
