"""
ReserveCalifornia availability adapter.

ReserveCalifornia is powered by Tyler Technologies (formerly ActiveNetwork/UseDirect).
The API uses a two-level hierarchy:
  - Place (park) — identified by PlaceId (what we store as provider_id)
  - Facility (campground loop/section within a park) — identified by FacilityId

Flow:
  1. Fetch all facilities for the PlaceId
  2. POST /rdr/search/grid for each facility, covering the full date range
  3. For each unit (site) in the response, collect dates where IsFree=true
  4. Merge across all facilities into a single CampgroundAvailability

API base: https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com
Date format: MM-DD-YYYY
"""

import asyncio
import logging
from datetime import date, timedelta
from typing import Any
import httpx

from .base import BaseProvider, CampgroundAvailability, SiteAvailability

logger = logging.getLogger(__name__)

BASE_URL = "https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com"
FACILITIES_PATH = "/rdr/fd/facilities"
GRID_PATH = "/rdr/search/grid"

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

DATE_FORMAT = "%m-%d-%Y"

# Max 14-day window per grid request (API limitation)
CHUNK_DAYS = 14


def _date_chunks(date_from: date, date_to: date) -> list[tuple[date, date]]:
    """Split a date range into 14-day chunks."""
    chunks = []
    current = date_from
    while current <= date_to:
        end = min(current + timedelta(days=CHUNK_DAYS - 1), date_to)
        chunks.append((current, end))
        current = end + timedelta(days=1)
    return chunks


def _parse_date(dt_str: str) -> date | None:
    """Parse 'YYYY-MM-DDTHH:MM:SS' → date."""
    try:
        return date.fromisoformat(dt_str[:10])
    except (ValueError, TypeError):
        return None


class ReserveCaliforniaProvider(BaseProvider):

    @property
    def name(self) -> str:
        return "reservecalifornia"

    async def _get_facility_ids(self, client: httpx.AsyncClient, place_id: str) -> list[int]:
        """Fetch all campable facility IDs for a place."""
        try:
            resp = await client.get(
                f"{BASE_URL}{FACILITIES_PATH}",
                params={"PlaceId": place_id, "IsActive": "true", "IsWebViewable": "true"},
                timeout=15,
            )
            if resp.status_code != 200:
                logger.warning("Facilities fetch failed for place %s: HTTP %s", place_id, resp.status_code)
                return []
            facilities = resp.json()
            # FacilityType=2 means camping (not day use, etc.)
            return [
                f["FacilityId"]
                for f in facilities
                if f.get("PlaceId") == int(place_id)
                and f.get("FacilityType") == 2
                and f.get("AllowWebBooking", False)
            ]
        except Exception as e:
            logger.warning("Error fetching facilities for place %s: %s", place_id, e)
            return []

    async def _fetch_grid(
        self,
        client: httpx.AsyncClient,
        facility_id: int,
        start: date,
        end: date,
    ) -> dict[str, Any]:
        """POST /rdr/search/grid for one facility and date chunk."""
        body = {
            "FacilityId": facility_id,
            "StartDate": start.strftime(DATE_FORMAT),
            "EndDate": end.strftime(DATE_FORMAT),
            "WebOnly": True,
            "InSeasonOnly": True,
            "UnitSort": "orderby",
            "UnitTypesGroupIds": [],
        }
        try:
            resp = await client.post(
                f"{BASE_URL}{GRID_PATH}",
                json=body,
                timeout=20,
            )
            if resp.status_code != 200:
                return {}
            return resp.json()
        except Exception as e:
            logger.debug("Grid fetch error facility=%s chunk=%s-%s: %s", facility_id, start, end, e)
            return {}

    async def get_availability(
        self,
        provider_id: str,
        date_from: date,
        date_to: date,
    ) -> CampgroundAvailability:
        chunks = _date_chunks(date_from, date_to)

        async with httpx.AsyncClient(headers=HEADERS) as client:
            facility_ids = await self._get_facility_ids(client, provider_id)

            if not facility_ids:
                logger.warning("No camping facilities found for ReserveCalifornia place %s", provider_id)
                return CampgroundAvailability(
                    campground_id="",
                    provider_id=provider_id,
                    sites=[],
                )

            logger.info(
                "ReserveCalifornia place %s: %d facilities, %d date chunks",
                provider_id, len(facility_ids), len(chunks),
            )

            # Fetch all (facility × chunk) combinations concurrently
            tasks = [
                self._fetch_grid(client, fid, start, end)
                for fid in facility_ids
                for start, end in chunks
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge: site_id → set of available dates
        site_dates: dict[str, list[date]] = {}
        site_names: dict[str, str] = {}

        for result in results:
            if isinstance(result, Exception) or not result:
                continue
            facility = result.get("Facility") or {}
            units = facility.get("Units") or {}
            for unit_id, unit in units.items():
                slices = unit.get("Slices") or {}
                for date_str, slc in slices.items():
                    if not slc.get("IsFree"):
                        continue
                    d = _parse_date(date_str)
                    if d is None or not (date_from <= d <= date_to):
                        continue
                    if unit_id not in site_dates:
                        site_dates[unit_id] = []
                        site_names[unit_id] = unit.get("Name", unit_id)
                    site_dates[unit_id].append(d)

        sites = [
            SiteAvailability(
                site_id=uid,
                site_name=site_names[uid],
                available_dates=sorted(set(dates)),
            )
            for uid, dates in site_dates.items()
            if dates
        ]

        return CampgroundAvailability(
            campground_id="",
            provider_id=provider_id,
            sites=sites,
        )
