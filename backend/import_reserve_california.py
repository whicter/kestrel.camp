"""
Bulk import ReserveCalifornia (California State Parks) campgrounds.

Uses the Tyler Technologies / UseDirect public API:
  GET /rdr/fd/places  — all parks
  GET /rdr/fd/facilities?PlaceId=...  — camping facilities per park

Only parks with at least one camping facility (FacilityType=2, AllowWebBooking=True)
are imported. provider_id = PlaceId (integer as string).

Usage:
  cd backend
  python import_reserve_california.py

Safe to re-run — upserts by provider_id.
"""
import asyncio
import logging
import uuid

import httpx

from app.database import AsyncSessionLocal
from app.models.campground import Campground, Provider
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.reservecalifornia.com/",
    "Origin": "https://www.reservecalifornia.com",
    "Accept": "application/json, text/plain, */*",
}

CONCURRENCY = 10  # parallel facility-check requests


async def fetch_all_places(client: httpx.AsyncClient) -> list[dict]:
    resp = await client.get(
        f"{BASE_URL}/rdr/fd/places",
        params={"IsActive": "true", "IsWebViewable": "true"},
        timeout=30,
    )
    resp.raise_for_status()
    places = resp.json()
    logger.info("Fetched %d places from ReserveCalifornia", len(places))
    return places


async def has_camping_facilities(client: httpx.AsyncClient, place_id: int) -> bool:
    """Return True if the park has at least one bookable camping facility."""
    try:
        resp = await client.get(
            f"{BASE_URL}/rdr/fd/facilities",
            params={"PlaceId": place_id, "IsActive": "true", "IsWebViewable": "true"},
            timeout=15,
        )
        if resp.status_code != 200:
            return False
        facilities = resp.json()
        return any(
            f.get("FacilityType") == 2 and f.get("AllowWebBooking", False)
            for f in facilities
            if f.get("PlaceId") == place_id
        )
    except Exception as e:
        logger.debug("Facility check failed for PlaceId=%s: %s", place_id, e)
        return False


async def discover_campgrounds() -> list[dict]:
    """Fetch all places, check facilities concurrently, return campable parks."""
    async with httpx.AsyncClient(headers=HEADERS) as client:
        places = await fetch_all_places(client)

        # Filter: must have valid coordinates
        candidates = [
            p for p in places
            if p.get("Latitude") and p.get("Longitude")
            and float(p.get("Latitude", 0)) != 0
            and float(p.get("Longitude", 0)) != 0
        ]
        logger.info("%d places have coordinates, checking camping facilities...", len(candidates))

        # Check facilities with bounded concurrency
        sem = asyncio.Semaphore(CONCURRENCY)

        async def check(place: dict) -> dict | None:
            async with sem:
                place_id = place["PlaceId"]
                if await has_camping_facilities(client, place_id):
                    return place
                return None

        results = await asyncio.gather(*[check(p) for p in candidates])

    campgrounds = [r for r in results if r is not None]
    logger.info("%d parks have bookable camping facilities", len(campgrounds))
    return campgrounds


async def import_campgrounds():
    campgrounds = await discover_campgrounds()

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Campground.provider_id).where(
                Campground.provider == Provider.reserve_california
            )
        )
        existing_ids = {row[0] for row in result.all()}
        logger.info("%d ReserveCalifornia campgrounds already in DB", len(existing_ids))

        new_count = update_count = 0
        for place in campgrounds:
            provider_id = str(place["PlaceId"])
            name = place.get("Name", "").strip()
            if not name:
                continue

            try:
                lat = float(place.get("Latitude", 0))
                lng = float(place.get("Longitude", 0))
            except (ValueError, TypeError):
                lat = lng = None

            data = dict(
                name=name,
                park_name=name,
                state_province="CA",
                country="US",
                provider=Provider.reserve_california,
                provider_id=provider_id,
                lat=lat if lat else None,
                lng=lng if lng else None,
                total_sites=None,
                timezone="America/Los_Angeles",
            )

            if provider_id in existing_ids:
                r2 = await db.execute(
                    select(Campground).where(
                        Campground.provider == Provider.reserve_california,
                        Campground.provider_id == provider_id,
                    )
                )
                cg = r2.scalar_one_or_none()
                if cg:
                    for k, v in data.items():
                        setattr(cg, k, v)
                    db.add(cg)
                    update_count += 1
            else:
                db.add(Campground(id=uuid.uuid4(), **data))
                existing_ids.add(provider_id)
                new_count += 1

        await db.commit()
        logger.info(
            "Done: %d new + %d updated = %d total ReserveCalifornia campgrounds",
            new_count, update_count, new_count + update_count,
        )


if __name__ == "__main__":
    asyncio.run(import_campgrounds())
