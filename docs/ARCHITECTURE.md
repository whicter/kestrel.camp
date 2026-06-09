# Kestrel Architecture

Kestrel is a campsite availability alert service. Users set watches on campgrounds for specific date ranges; a background worker continuously scans reservation APIs and notifies users the moment a site opens up.

---

## System Overview

```
┌─────────────────────┐        ┌──────────────────────────────────────┐
│   Next.js Frontend  │        │           FastAPI Backend            │
│   (Vercel)          │◄──────►│           (Railway)                  │
│                     │        │                                      │
│  /             landing       │  /api/auth          JWT auth         │
│  /search       campgrounds   │  /api/campgrounds   search + releases│
│  /alerts       dashboard     │  /api/alerts        CRUD             │
│  /releasing    drop windows  │  /api/admin         admin only       │
│  /settings     user prefs    │  /debug/*           dev tools        │
│  /admin        admin panel   │                                      │
└─────────────────────┘        └──────────────┬───────────────────────┘
         │                                    │
         │ Sentry (JS errors)                 │ Sentry (exceptions)
         ▼                                    ▼
  sentry.io                           sentry.io

                               ┌──────────────▼───────────────────────┐
                               │         PostgreSQL 16 (Railway)      │
                               │                                      │
                               │  users              campgrounds      │
                               │  alerts             availability_    │
                               │  notification_logs    snapshots      │
                               └──────────────────────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │          Redis (Railway)             │
                               │                                      │
                               │  ARQ job queue      scan snapshots   │
                               │  scan locks         notif dedup      │
                               └──────────────┬───────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │          ARQ Worker (Railway)        │
                               │                                      │
                               │  schedule_scans  cron every 2 min   │
                               │  scan_campground  per-campground job │
                               │  drop window boost: 30s TTL ±30min  │
                               └──────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │                         │                      │
          ┌─────────▼────────┐   ┌────────────▼──────┐   ┌──────────▼───────┐
          │ Recreation.gov   │   │ ReserveCalifornia │   │ BC Parks /       │
          │ (live)           │   │ (live)            │   │ GoingToCamp      │
          │ ~1126 campgrounds│   │ 115 CA parks      │   │ (stub — WAF)     │
          └──────────────────┘   └───────────────────┘   └──────────────────┘
```

---

## Directory Structure

```
kestrel/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Landing page
│   ├── search/page.tsx         # Campground search + map
│   ├── alerts/page.tsx         # User alerts dashboard
│   ├── releasing/page.tsx      # Today's drop windows
│   ├── settings/page.tsx       # User notification preferences
│   └── admin/page.tsx          # Admin dashboard (is_admin only)
├── components/
│   ├── Navbar.tsx              # Auth-aware sticky nav
│   ├── AuthModal.tsx           # Login / register modal
│   ├── WatchModal.tsx          # Create alert modal
│   ├── CampgroundMap.tsx       # Mapbox GL JS map
│   ├── ProviderBadge.tsx       # Provider color chips
│   └── AvailabilityDot.tsx     # Status indicator dots
├── lib/
│   ├── api.ts                  # Typed API client
│   └── auth-store.ts           # JWT localStorage helpers
├── sentry.client.config.ts     # Sentry browser config
├── sentry.server.config.ts     # Sentry Node.js config
├── sentry.edge.config.ts       # Sentry edge runtime config
├── instrumentation.ts          # Next.js instrumentation hook
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI app + CORS + Sentry init
│   │   ├── config.py           # pydantic-settings (.env)
│   │   ├── database.py         # async SQLAlchemy engine
│   │   ├── deps.py             # current_user + admin_user dependencies
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── schemas/            # Pydantic response schemas
│   │   ├── routers/
│   │   │   ├── auth.py         # register / login / me / settings
│   │   │   ├── campgrounds.py  # search + releasing-today
│   │   │   ├── alerts.py       # CRUD for user alerts
│   │   │   ├── admin.py        # /api/admin/* (admin only)
│   │   │   └── debug.py        # dev-only tools
│   │   ├── services/           # Auth business logic
│   │   ├── providers/          # Reservation system adapters
│   │   ├── workers/            # ARQ scan worker
│   │   └── notifications/      # Email (SendGrid) + SMS (Twilio)
│   ├── alembic/                # DB migrations
│   ├── seed.py                 # Dev seed data (8 campgrounds)
│   ├── import_recreation_gov.py      # Bulk import ~1126 campgrounds
│   ├── import_reserve_california.py  # Import 115 CA state parks
│   ├── make_admin.py           # Grant admin to a user by email
│   └── run_worker.py           # ARQ worker entry point
└── docker-compose.yml          # Local Postgres + Redis
```

---

## Data Models

### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | text unique | |
| password_hash | text | bcrypt |
| tier | enum | free / pro |
| is_admin | bool | default false |
| notify_email | bool | default true |
| notify_sms | bool | default false |
| phone | text nullable | E.164 format e.g. +14155550100 |

### `campgrounds`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | text | e.g. "Upper Pines Campground" |
| park_name | text | e.g. "Yosemite National Park" |
| state_province | text | |
| country | text | |
| provider | enum | recreation.gov / reservecalifornia / bc-parks / ... |
| provider_id | text | ID in the external system |
| lat / lng | float | for map display |
| total_sites | int | |
| last_scanned_at | timestamptz | |

### `alerts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| campground_id | UUID FK | |
| date_from / date_to | date | search window |
| nights_min | int | minimum consecutive nights required |
| site_type | enum | any / tent / rv / cabin |
| status | enum | watching / triggered / paused / expired |
| scan_priority | enum | normal / fast / slow |
| triggered_at | timestamptz | set when first match found |

### `availability_snapshots`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| campground_id | UUID FK | |
| scanned_at | timestamptz | |
| available_count | int | |
| available_site_ids | JSONB | list of site ID strings |

### `notification_logs`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| alert_id | UUID FK | |
| user_id | UUID FK | |
| channel | enum | email / sms |
| sent_at | timestamptz | |
| payload | JSONB | campground_id, available_sites count |

---

## Scan Worker Flow

```
schedule_scans()  ← cron every 2 minutes
  │
  ├── Query DB: SELECT DISTINCT campground_id FROM alerts WHERE status='watching'
  │
  └── For each campground_id:
        _in_drop_window(provider, now)?
          Yes → lock TTL = 30s  (scans every ~30s during drop)
          No  → lock TTL = 90s  (scans every ~2min normally)
        Check Redis lock: scan:lock:{id}
        If locked → skip
        Else → set lock + enqueue scan_campground job


scan_campground(campground_id)
  │
  ├── 1. Load Campground from DB
  ├── 2. Load all watching Alerts for this campground
  ├── 2a. Auto-expire alerts where date_to < today → status=expired
  ├── 3. Union date range across remaining alerts (min date_from → max date_to)
  ├── 4. Call provider adapter → CampgroundAvailability
  ├── 5. Compare with Redis snapshot (scan:snapshot:{id})
  │       curr_available - prev_available = newly_available
  ├── 6. For each alert with matching sites:
  │       Check notif dedup key (notif:dedup:{alert_id}:{sites}, 30min TTL)
  │       If match + not deduped:
  │         → mark alert status=triggered
  │         → send email (if user.notify_email)
  │         → send SMS   (if user.notify_sms and user.phone)
  │         → write NotificationLog for each channel
  │         → set dedup key
  ├── 7. Update Redis snapshot (1h TTL)
  ├── 8. Write AvailabilitySnapshot to DB
  └── 9. Update campground.last_scanned_at
```

**Key design**: N users watching the same campground → **1 HTTP request** to the provider.

---

## Drop Window Acceleration

During the ±30 minutes around a provider's booking drop time, the scan lock TTL drops from 90s to 30s, tripling scan frequency with zero extra infrastructure.

| Provider | Drop Time (UTC) | Local Time |
|---|---|---|
| recreation.gov | 20:00 | 4:00 PM ET |
| reservecalifornia | 15:00 | 8:00 AM PT |
| bc-parks | 14:00 | 7:00 AM PT |
| goingtoccamp | 12:00 | 8:00 AM ET |

---

## Admin

### Dashboard (`/admin`)
Accessible only to users with `is_admin=true`. Shows:
- Total users, campgrounds, active alerts, total alerts
- Campground count by provider
- Full user list with tier, alert count, join date

### API endpoints
- `GET /api/admin/stats` — aggregate counts
- `GET /api/admin/users` — user list with alert counts

Both require the `admin_user` FastAPI dependency (403 if not admin).

### Granting admin
```bash
cd backend
source .venv/bin/activate
python make_admin.py user@example.com
```

---

## Monitoring (Sentry)

**Frontend** — configured in `sentry.client.config.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts`:
- Captures unhandled JS errors and React exceptions
- Session replay: 100% on error, 5% random
- Source maps uploaded at build via `withSentryConfig` in `next.config.ts`
- Initialized via `instrumentation.ts` (Next.js 16 hook)

**Backend** — initialized in `app/main.py` if `SENTRY_DSN` is set:
- Captures unhandled FastAPI exceptions with full stack traces
- 20% trace sampling

---

## Notifications

### Email (SendGrid)
- Sends whenever `SENDGRID_API_KEY` is set
- Falls back to console log in dev

### SMS (Twilio)
- Sends if `user.notify_sms=true` and `user.phone` is set
- From: toll-free `+18449484478` (pending toll-free verification)
- Falls back to console log if no credentials

---

## Provider Adapters

All adapters implement `BaseProvider`:

```python
class BaseProvider(ABC):
    @abstractmethod
    async def get_availability(
        self, provider_id: str, date_from: date, date_to: date
    ) -> CampgroundAvailability: ...
```

### Recreation.gov (live, ~1126 campgrounds)
- **API**: `GET https://www.recreation.gov/api/camps/availability/campground/{id}/month`
- **Data**: bulk-imported from RIDB public CSV (no API key needed)
- **Strategy**: fetch all months in date range concurrently with `asyncio.gather`

### ReserveCalifornia (live, 115 CA state parks)
- **Platform**: Tyler Technologies (UseDirect)
- **API**: `POST .../rdr/search/grid`
- **Strategy**: discover facility IDs via `/rdr/fd/facilities`, scan in 14-day chunks
- **provider_id** = PlaceId (park-level)

### BC Parks / GoingToCamp (stubs)
- Both blocked by Azure WAF — return empty availability gracefully
- Path to fix: Playwright headless browser

---

## Authentication

- Passwords: bcrypt
- Sessions: JWT (7-day expiry, configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Frontend: token in `localStorage`, sent as `Authorization: Bearer`
- Admin check: `is_admin` field on User, enforced via `admin_user` FastAPI dependency

---

## Environment Variables

### Backend
```
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://...
SECRET_KEY=...
ENVIRONMENT=production
FRONTEND_URL=https://kestrel-camp.vercel.app

SENDGRID_API_KEY=SG.xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx

SENTRY_DSN=https://...@sentry.io/...
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://<railway-backend-url>
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...   # for source map uploads at build time
```
