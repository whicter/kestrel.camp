"""
scan_campground — the main ARQ task.

Flow:
  1. Load campground from DB
  2. Find all active alerts for this campground
  3. Determine date range to scan (union of all alert windows)
  4. Call the provider adapter to fetch live availability
  5. Compare with previous Redis snapshot
  6. For each alert whose dates now have availability → notify user
  7. Save new snapshot to DB + update Redis cache
"""
import json
import logging
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import AsyncSessionLocal
from ..models.campground import Campground
from ..models.alert import Alert, AlertStatus
from ..models.scan import AvailabilitySnapshot, NotificationLog, NotificationChannel
from ..models.user import User
from ..providers import get_provider
from ..notifications.email import send_alert_notification
from ..config import settings

logger = logging.getLogger(__name__)

BOOKING_URLS = {
    "recreation.gov":     "https://www.recreation.gov/camping/campgrounds/{provider_id}",
    "reservecalifornia":  "https://www.reservecalifornia.com/Web/Default.aspx",
    "bc-parks":           "https://camping.bcparks.ca/",
    "parks-canada":       "https://reservation.pc.gc.ca/",
    "goingtoccamp":       "https://reservations.ontarioparks.com/",
    "usedirect":          "https://www.reserveamerica.com/",
    "reserveamerica":     "https://www.reserveamerica.com/",
}


async def scan_campground(ctx: dict[str, Any], campground_id: str) -> dict:
    """
    ARQ task: scan one campground, notify matched alerts.
    ctx["redis"] is the ARQ Redis pool.
    """
    redis = ctx["redis"]
    now = datetime.now(timezone.utc)
    logger.info("🔍 Scanning campground %s", campground_id)

    async with AsyncSessionLocal() as db:
        # 1. Load campground
        cg_result = await db.execute(
            select(Campground).where(Campground.id == campground_id)
        )
        campground: Campground | None = cg_result.scalar_one_or_none()
        if not campground:
            logger.warning("Campground %s not found", campground_id)
            return {"status": "not_found"}

        # 2. Load all watching alerts for this campground
        alerts_result = await db.execute(
            select(Alert)
            .where(
                Alert.campground_id == campground_id,
                Alert.status == AlertStatus.watching,
            )
            .options(selectinload(Alert.user))
        )
        active_alerts: list[Alert] = list(alerts_result.scalars().all())

        if not active_alerts:
            logger.info("No active alerts for %s, skipping", campground.name)
            return {"status": "no_alerts"}

        # 3. Determine scan date range = union of all alert windows
        min_date: date = min(a.date_from for a in active_alerts)
        max_date: date = max(a.date_to   for a in active_alerts)

        # 4. Get provider and fetch availability
        provider = get_provider(campground.provider.value)
        if not provider:
            logger.warning("No provider adapter for %s", campground.provider)
            return {"status": "no_provider"}

        try:
            availability = await provider.get_availability(
                campground.provider_id, min_date, max_date
            )
            availability.campground_id = str(campground_id)
        except Exception as e:
            logger.error("Provider error for %s: %s", campground.name, e)
            return {"status": "provider_error", "error": str(e)}

        # 5. Compare with previous Redis snapshot
        snapshot_key = f"scan:snapshot:{campground_id}"
        prev_raw = await redis.get(snapshot_key)
        prev_available: set[str] = set(json.loads(prev_raw)) if prev_raw else set()
        curr_available: set[str] = set(availability.available_site_ids)

        newly_available = curr_available - prev_available  # sites that just opened

        # Update Redis snapshot
        await redis.set(snapshot_key, json.dumps(list(curr_available)), ex=3600)

        # 6. Save snapshot to DB
        snapshot = AvailabilitySnapshot(
            campground_id=campground_id,
            scanned_at=now,
            available_count=len(curr_available),
            available_site_ids=list(curr_available),
        )
        db.add(snapshot)

        # Update campground.last_scanned_at
        campground.last_scanned_at = now

        notified = 0

        if newly_available or curr_available:
            # 7. Check each alert for matching dates
            for alert in active_alerts:
                # Check if any currently available site has dates overlapping this alert
                matching_sites = [
                    s for s in availability.sites
                    if s.site_id in curr_available
                    and any(alert.date_from <= d <= alert.date_to for d in s.available_dates)
                    and len([d for d in s.available_dates if alert.date_from <= d <= alert.date_to]) >= alert.nights_min
                ]

                if not matching_sites:
                    continue

                # Check we haven't already notified for this exact set recently
                dedup_key = f"notif:dedup:{alert.id}:{sorted(curr_available)}"
                already = await redis.get(dedup_key)
                if already:
                    continue

                # Mark alert as triggered
                alert.status = AlertStatus.triggered
                alert.triggered_at = now

                # Send notification
                booking_url = BOOKING_URLS.get(
                    campground.provider.value, "https://www.recreation.gov"
                ).format(provider_id=campground.provider_id)

                await send_alert_notification(
                    user_email=alert.user.email,
                    campground_name=campground.name,
                    park_name=campground.park_name,
                    date_from=str(alert.date_from),
                    date_to=str(alert.date_to),
                    available_count=len(matching_sites),
                    booking_url=booking_url,
                )

                # Log it
                log = NotificationLog(
                    alert_id=alert.id,
                    user_id=alert.user_id,
                    channel=NotificationChannel.email,
                    sent_at=now,
                    payload={
                        "campground_id": str(campground_id),
                        "available_sites": len(matching_sites),
                    },
                )
                db.add(log)

                # Dedup for 30 min so we don't spam
                await redis.set(dedup_key, "1", ex=1800)
                notified += 1

        await db.commit()

        result = {
            "status": "ok",
            "campground": campground.name,
            "available": len(curr_available),
            "newly_available": len(newly_available),
            "alerts_notified": notified,
        }
        logger.info("✅ %s", result)
        return result
