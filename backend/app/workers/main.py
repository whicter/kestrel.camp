"""
ARQ worker entry point.

Run:
  python run_worker.py

Drop window boosting:
  During each provider's drop window (±30 min), the scan lock TTL drops from
  90s → 30s, effectively increasing scan frequency from every 2 min to every 30s.

  Provider drop windows (UTC):
    recreation.gov    — 20:00 UTC  (4 PM ET / 3 PM ET DST)
    reservecalifornia — 15:00 UTC  (8 AM PT / 7 AM PT DST)
    bc-parks          — 14:00 UTC  (7 AM PT / 6 AM PT DST)
    goingtoccamp      — 12:00 UTC  (8 AM ET / 7 AM ET DST)
"""
import logging
from datetime import datetime, timezone

from arq import cron
from arq.connections import RedisSettings

from ..config import settings
from .scan import scan_campground

logger = logging.getLogger(__name__)

# (provider_value, drop_hour_utc, drop_minute_utc)
DROP_WINDOWS = [
    ("recreation.gov",    20, 0),
    ("reservecalifornia", 15, 0),
    ("bc-parks",          14, 0),
    ("goingtoccamp",      12, 0),
]
BOOST_WINDOW_MINUTES = 30   # scan every 30s within ±30 min of drop
NORMAL_LOCK_TTL     = 90    # seconds — normal cadence (~2 min)
BOOST_LOCK_TTL      = 30    # seconds — boosted cadence (~30s)


def _in_drop_window(provider: str, now: datetime) -> bool:
    """Return True if provider is currently in its drop window."""
    for prov, hour, minute in DROP_WINDOWS:
        if prov != provider:
            continue
        drop_minutes = hour * 60 + minute
        now_minutes  = now.hour * 60 + now.minute
        if abs(now_minutes - drop_minutes) <= BOOST_WINDOW_MINUTES:
            return True
    return False


async def schedule_scans(ctx: dict) -> None:
    """
    Called every 2 minutes by ARQ's cron scheduler.
    Enqueues a scan job for each campground that has active alerts.
    During drop windows the lock TTL is shortened to 30s so scans
    run approximately every 30 seconds.
    """
    from sqlalchemy import select, distinct
    from ..database import AsyncSessionLocal
    from ..models.alert import Alert, AlertStatus
    from ..models.campground import Campground

    redis = ctx["redis"]
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        # Get campground_id + provider for all campgrounds with watching alerts
        result = await db.execute(
            select(Campground.id, Campground.provider)
            .join(Alert, Alert.campground_id == Campground.id)
            .where(Alert.status == AlertStatus.watching)
            .distinct()
        )
        rows = result.all()

    if not rows:
        return

    logger.info("📅 Scheduling scans for %d campgrounds", len(rows))

    for cg_id, provider in rows:
        cg_id_str = str(cg_id)
        lock_key = f"scan:lock:{cg_id_str}"
        locked = await redis.get(lock_key)
        if locked:
            continue

        boosted = _in_drop_window(provider.value, now)
        ttl = BOOST_LOCK_TTL if boosted else NORMAL_LOCK_TTL

        if boosted:
            logger.info("⚡ Drop window boost active for %s (%s)", cg_id_str, provider.value)

        await redis.set(lock_key, "1", ex=ttl)
        await ctx["redis"].enqueue_job("scan_campground", cg_id_str)
        logger.debug("Queued scan for %s (ttl=%ds)", cg_id_str, ttl)


async def startup(ctx: dict) -> None:
    logger.info("🪶 Kestrel worker starting up")


async def shutdown(ctx: dict) -> None:
    logger.info("🛑 Kestrel worker shutting down")


class WorkerSettings:
    functions = [scan_campground]
    cron_jobs = [
        cron(schedule_scans, minute={0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
                                     32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58}),
    ]
    redis_settings = RedisSettings.from_dsn(settings.redis_url)
    on_startup = startup
    on_shutdown = shutdown
    max_jobs = 20
    job_timeout = 60
    keep_result = 300
    log_results = True
