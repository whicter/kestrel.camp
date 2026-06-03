"""
ARQ worker entry point.

Run:
  arq app.workers.main.WorkerSettings

ARQ uses Redis for the job queue. Each job is a Python coroutine.
The scheduler enqueues scan_campground for every campground that
has active alerts, at the appropriate frequency.
"""
import logging
from datetime import timedelta

from arq import cron
from arq.connections import RedisSettings

from ..config import settings
from .scan import scan_campground

logger = logging.getLogger(__name__)


async def schedule_scans(ctx: dict) -> None:
    """
    Called every minute by ARQ's cron scheduler.
    Enqueues a scan job for each campground that has active alerts.
    Uses a Redis set to deduplicate — if a scan job for a campground
    is already queued/running, skip it.
    """
    from sqlalchemy import select, distinct
    from ..database import AsyncSessionLocal
    from ..models.alert import Alert, AlertStatus
    from ..models.campground import Campground

    redis = ctx["redis"]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(distinct(Alert.campground_id))
            .where(Alert.status == AlertStatus.watching)
        )
        campground_ids = [str(row[0]) for row in result.fetchall()]

    if not campground_ids:
        return

    logger.info("📅 Scheduling scans for %d campgrounds", len(campground_ids))

    for cg_id in campground_ids:
        # Check if a scan is already queued for this campground
        lock_key = f"scan:lock:{cg_id}"
        locked = await redis.get(lock_key)
        if locked:
            continue

        # Set a lock for 90 seconds so we don't queue duplicates
        await redis.set(lock_key, "1", ex=90)
        await ctx["redis"].enqueue_job("scan_campground", cg_id)
        logger.debug("Queued scan for %s", cg_id)


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
    job_timeout = 60  # seconds per scan job
    keep_result = 300  # keep job results for 5 min
    log_results = True
