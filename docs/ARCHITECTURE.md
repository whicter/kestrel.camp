# Kestrel Architecture

Kestrel is a campsite availability alert service. Users set watches on campgrounds for specific date ranges; a background worker continuously scans reservation APIs and notifies users the moment a site opens up.

---

## System Overview

```
┌─────────────────────┐        ┌──────────────────────────────────────┐
│   Next.js Frontend  │        │           FastAPI Backend            │
│   (port 3000/3001)  │◄──────►│           (port 8000)                │
│                     │        │                                      │
│  /             landing       │  /api/auth          JWT auth + settings
│  /search       campgrounds   │  /api/campgrounds   search + release │
│  /alerts       dashboard     │  /api/alerts        CRUD             │
│  /releasing    drop windows  │  /debug/*           dev tools        │
│  /settings     user prefs    │                                      │
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
                               │  drop window boost: 30s TTL ±30min  │
                               └──────────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │                         │                      │
          ┌─────────▼────────┐   ┌────────────▼──────┐   ┌──────────▼───────┐
          │ Recreation.gov   │   │ ReserveCalifornia │   │ BC Parks /       │
          │ (live)           │   │ (live)            │   │ GoingToCamp      │
          │ ~1126 campgrounds│   │                   │   │ (stub — WAF)     │
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
│   ├── releasing/page.tsx    # Today's drop windows
│   └── settings/page.tsx     # User notification preferences
├── components/
│   ├── Navbar.tsx            # Auth-aware sticky nav (Settings link)
│   ├── AuthModal.tsx         # Login / register modal
│   ├── WatchModal.tsx        # Create alert modal
│   ├── CampgroundMap.tsx     # Mapbox GL JS map
│   ├── ProviderBadge.tsx     # Provider color chips
│   ├── AvailabilityDot.tsx   # Status indicator dots
│   └── ui/switch.tsx         # Toggle switch component
├── lib/
│   ├── api.ts                # Typed API client (auth.updateSettings)
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
│   │   ├── workers/          # ARQ scan worker + drop window logic
│   │   └── notifications/    # Email (SendGrid) + SMS (Twilio)
│   ├── alembic/              # DB migrations
│   ├── seed.py               # Dev seed data (8 campgrounds)
│   ├── import_recreation_gov.py  # Bulk import ~1126 campgrounds from RIDB
│   └── run_worker.py         # Python 3.14 compatible worker entry point
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
| phone | text nullable | E.164 format e.g. +19256836712 |

### `campgrounds`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | text | e.g. "Upper Pines Campground" |
| park_name | text | e.g. "Yosemite National Park" |
| state_province | text | |
| country | text | |
| provider | enum | recreation.gov / reservecalifornia / bc-parks / goingtoccamp / parks-canada |
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
  ├── Query DB: SELECT DISTINCT campground_id, provider FROM alerts WHERE status='watching'
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

**Key design**: N users watching the same campground → **1 HTTP request** to the provider. The lock + snapshot are per-campground, not per-alert.

---

## Drop Window Acceleration

During the ±30 minutes around a provider's booking drop time, the scan lock TTL is reduced from 90s to 30s, effectively increasing scan frequency from ~2min to ~30s with zero extra infrastructure.

| Provider | Drop Time (UTC) | Local Time |
|---|---|---|
| recreation.gov | 20:00 | 4:00 PM ET |
| reservecalifornia | 15:00 | 8:00 AM PT |
| bc-parks | 14:00 | 7:00 AM PT |
| goingtoccamp | 12:00 | 8:00 AM ET |

---

## Notifications

### Email (SendGrid)
- Sends whenever `SENDGRID_API_KEY` is set (dev or production)
- From: `whicter.han@gmail.com` (verified single sender in SendGrid)
- Falls back to console log if no API key

### SMS (Twilio)
- Sends if `user.notify_sms=true` and `user.phone` is set
- From: toll-free `+18449484478` (pending toll-free verification)
- Falls back to console log if no Twilio credentials
- Users set phone number in `/settings`

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

### Recreation.gov (live)
- **API**: `GET https://www.recreation.gov/api/camps/availability/campground/{id}/month?start_date=...`
- **Data**: ~1126 campgrounds bulk-imported from RIDB public CSV export (no API key needed)
- **Strategy**: fetch all months in date range concurrently with `asyncio.gather`
- **Available**: `site.availabilities[date] == "Available"`

### ReserveCalifornia (live)
- **Platform**: Tyler Technologies (UseDirect)
- **API**: `POST https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com/rdr/search/grid`
- **Strategy**: discover facility IDs for PlaceId via `/rdr/fd/facilities`, scan each in 14-day chunks
- **IDs**: `provider_id` is the PlaceId (park), e.g. Pfeiffer Big Sur = `690`

### BC Parks / GoingToCamp (stubs)
- Both behind Azure WAF with CAPTCHA — direct HTTP requests are blocked
- Return empty availability gracefully; no notifications fired
- Path to fix: Playwright headless browser scraping

---

## Campground Data

Recreation.gov campgrounds are imported via `backend/import_recreation_gov.py`:
- Downloads `RIDBFullExport_V1_CSV.zip` (~244MB) from `ridb.recreation.gov/download`
- No API key required
- Joins `Facilities_API_v1.csv` + `FacilityAddresses_API_v1.csv` + `RecAreas_API_v1.csv`
- Filters: reservable + US state + has lat/lng coordinates
- Result: ~1126 campgrounds
- Safe to re-run (upserts by provider_id)

---

## Authentication

- Registration: bcrypt hash stored, JWT returned
- Login: verify bcrypt → JWT
- All alert endpoints: `Authorization: Bearer <token>` → `current_user` FastAPI dependency
- Frontend: token stored in `localStorage`, sent in every API call via `lib/api.ts`
- JWT expiry: 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- Settings update: `PATCH /api/auth/me` — updates phone, notify_email, notify_sms

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
DATABASE_URL=postgresql+asyncpg://kestrel:secret@localhost:5433/kestrel
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=change-me-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3001

# Email (SendGrid) — sends when set, regardless of ENVIRONMENT
SENDGRID_API_KEY=SG.xxx

# SMS (Twilio) — sends when set and user has phone + notify_sms=true
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxxxxxxxxx
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # get from mapbox.com
```
