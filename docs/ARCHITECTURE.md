# Kestrel Architecture

Kestrel is a campsite availability alert service. Users set watches on campgrounds for specific date ranges; a background worker continuously scans reservation APIs and notifies users the moment a site opens up.

---

## System Overview

```
┌─────────────────────┐        ┌──────────────────────────────────────┐
│   Next.js Frontend  │        │           FastAPI Backend            │
│   (port 3000/3001)  │◄──────►│           (port 8000)                │
│                     │        │                                      │
│  /             landing       │  /api/auth          JWT auth         │
│  /search       campgrounds   │  /api/campgrounds   search + release │
│  /alerts       dashboard     │  /api/alerts        CRUD             │
│  /releasing    drop windows  │  /debug/*           dev tools        │
└─────────────────────┘        └──────────────┬───────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │         PostgreSQL 16                │
                               │         (port 5433 in Docker)        │
                               │                                      │
                               │  users              campgrounds      │
                               │  alerts             availability_    │
                               │  notification_logs    snapshots      │
                               └──────────────────────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │          Redis 7 (port 6379)         │
                               │                                      │
                               │  ARQ job queue      scan snapshots   │
                               │  scan locks         notif dedup      │
                               └──────────────┬───────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │          ARQ Worker                  │
                               │                                      │
                               │  schedule_scans  cron every 2 min   │
                               │  scan_campground  per-campground job │
                               └──────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │                         │                      │
          ┌─────────▼────────┐   ┌────────────▼──────┐   ┌──────────▼───────┐
          │ Recreation.gov   │   │ ReserveCalifornia │   │ BC Parks /       │
          │ (live)           │   │ (live)            │   │ GoingToCamp      │
          │                  │   │                   │   │ (stub — WAF)     │
          └──────────────────┘   └───────────────────┘   └──────────────────┘
```

---

## Directory Structure

```
kestrel/
├── app/                      # Next.js App Router pages
│   ├── page.tsx              # Landing page
│   ├── search/page.tsx       # Campground search + map
│   ├── alerts/page.tsx       # User alerts dashboard
│   └── releasing/page.tsx    # Today's drop windows
├── components/
│   ├── Navbar.tsx            # Auth-aware sticky nav
│   ├── AuthModal.tsx         # Login / register modal
│   ├── WatchModal.tsx        # Create alert modal
│   ├── CampgroundMap.tsx     # Mapbox GL JS map
│   ├── ProviderBadge.tsx     # Provider color chips
│   └── AvailabilityDot.tsx   # Status indicator dots
├── lib/
│   ├── api.ts                # Typed API client
│   └── auth-store.ts         # JWT localStorage helpers
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── config.py         # pydantic-settings (.env)
│   │   ├── database.py       # async SQLAlchemy engine
│   │   ├── deps.py           # current_user dependency
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic response schemas
│   │   ├── routers/          # FastAPI route handlers
│   │   ├── services/         # Auth + alert business logic
│   │   ├── providers/        # Reservation system adapters
│   │   ├── workers/          # ARQ scan worker
│   │   └── notifications/    # Email (SendGrid in prod)
│   ├── alembic/              # DB migrations
│   ├── seed.py               # Dev seed data
│   └── run_worker.py         # Python 3.12+ worker entry point
└── docker-compose.yml        # Postgres + Redis
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
| notify_email | bool | default true |
| notify_sms | bool | default false |
| phone | text nullable | |

### `campgrounds`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | text | e.g. "Upper Pines Campground" |
| park_name | text | e.g. "Yosemite National Park" |
| state_province | text | |
| country | text | |
| provider | enum | recreation.gov / reservecalifornia / bc-parks / goingtoccamp / parks-canada / usedirect / reserveamerica |
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
| scan_priority | enum | normal / high |
| triggered_at | timestamptz | set when first match found |
| expires_at | timestamptz | optional auto-expiry |

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
        Check Redis lock: scan:lock:{id}  (90s TTL)
        If locked → skip (scan already running)
        Else → set lock + enqueue scan_campground job


scan_campground(campground_id)
  │
  ├── 1. Load Campground from DB
  ├── 2. Load all watching Alerts for this campground
  ├── 3. Union date range across all alerts (min date_from → max date_to)
  ├── 4. Call provider adapter → CampgroundAvailability
  ├── 5. Compare with Redis snapshot (scan:snapshot:{id})
  │       curr_available - prev_available = newly_available
  ├── 6. For each alert:
  │       Find sites where available_dates overlap alert window
  │         AND consecutive nights >= alert.nights_min
  │       Check notif dedup key (notif:dedup:{alert_id}:{sites}, 30min TTL)
  │       If match + not deduped:
  │         → mark alert status=triggered
  │         → send_alert_notification(email)
  │         → write NotificationLog
  │         → set dedup key
  ├── 7. Update Redis snapshot (1h TTL)
  ├── 8. Write AvailabilitySnapshot to DB
  └── 9. Update campground.last_scanned_at
```

**Key design**: N users watching the same campground → **1 HTTP request** to the provider. The lock + snapshot are per-campground, not per-alert.

---

## Provider Adapters

All adapters implement `BaseProvider`:

```python
class BaseProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    async def get_availability(
        self, provider_id: str, date_from: date, date_to: date
    ) -> CampgroundAvailability: ...
```

### Recreation.gov (live)
- **API**: `GET https://www.recreation.gov/api/camps/availability/campground/{id}/month?start_date=...`
- **Strategy**: fetch all months in date range concurrently with `asyncio.gather`
- **Available**: `site.availabilities[date] == "Available"`

### ReserveCalifornia (live)
- **Platform**: Tyler Technologies (formerly ActiveNetwork/UseDirect)
- **API**: `POST https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com/rdr/search/grid`
- **Strategy**: discover facility IDs for the PlaceId via `/rdr/fd/facilities`, then scan each facility in 14-day chunks concurrently
- **Available**: `unit.Slices[date].IsFree == true`
- **IDs**: `provider_id` is the PlaceId (park), not the FacilityId (loop) — e.g. Pfeiffer Big Sur = `690`

### BC Parks / GoingToCamp (stubs)
- Both platforms are behind Azure WAF with CAPTCHA — direct HTTP requests are blocked
- Adapters return empty availability gracefully; system skips notification
- Path to fix: replace with Playwright headless browser scraping

---

## Authentication

- Registration: bcrypt hash stored, JWT returned
- Login: verify bcrypt → JWT
- All alert endpoints: `Authorization: Bearer <token>` → `current_user` FastAPI dependency
- Frontend: token stored in `localStorage`, sent in every API call via `lib/api.ts`
- JWT expiry: 7 days (configurable via `JWT_EXPIRE_DAYS`)

---

## Frontend Map

`CampgroundMap.tsx` uses `react-map-gl` + `mapbox-gl`:
- Lazy-loaded on client only (no SSR import)
- Requires `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local`
- Markers: forest-green pins for all campgrounds with lat/lng
- Click marker → opens WatchModal to set an alert
- `fitBounds` automatically zooms to show all results
- Falls back to a placeholder card if token is not configured

---

## Booking Windows (Today's Releases)

| Provider | Window | Drop Time |
|---|---|---|
| recreation.gov | 180 days | 4:00 PM ET |
| reservecalifornia | 6 months (~182 days) | 8:00 AM PT |
| bc-parks | 4 months (~122 days) | 7:00 AM PT |
| goingtoccamp | 5 months (~152 days) | 8:00 AM ET |

`GET /api/campgrounds/releasing-today` returns every tracked campground annotated with:
- `release_campsite_date`: the campsite date becoming bookable today (`today + window`)
- `drop_time`: human-readable drop time
- `booking_window_days`: numeric window

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://kestrel:kestrel@localhost:5433/kestrel
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_EXPIRE_DAYS=7
IS_PRODUCTION=false
FRONTEND_URL=http://localhost:3000
SENDGRID_API_KEY=           # required in production
FROM_EMAIL=alerts@kestrel.camp
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=   # get from mapbox.com
```
