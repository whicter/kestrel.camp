"""
Recreation.gov availability adapter.

Public API (no auth needed for availability reads):
  GET https://www.recreation.gov/api/camps/availability/campground/{facility_id}/month
      ?start_date=YYYY-MM-01T00:00:00.000Z

Response shape (simplified):
  {
    "campsites": {
      "<site_id>": {
        "site_id": "<site_id>",
        "availabilities": {
          "YYYY-MM-DD": "Available" | "Reserved" | "Not Available" | ...
        }
      }
    }
  }
"""

import asyncio
from datetime import date, timedelta
from calendar import monthrange
import httpx

from .base import BaseProvider, CampgroundAvailability, SiteAvailability

# Realistic browser headers — reduces chance of being rate-limited
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.recreation.gov/",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
}

BASE_URL = "https://www.recreation.gov/api/camps/availability/campground"


def _months_in_range(date_from: date, date_to: date) -> list[date]:
    """Return first-day-of-month dates covering the requested range."""
    months = []
    current = date_from.replace(day=1)
    end = date_to.replace(day=1)
    while current <= end:
        months.append(current)
        days_in_month = monthrange(current.year, current.month)[1]
        current = (current + timedelta(days=days_in_month)).replace(day=1)
    return months


class RecreationGovProvider(BaseProvider):

    @property
    def name(self) -> str:
        return "recreation.gov"

    async def get_availability(
        self,
        provider_id: str,
        date_from: date,
        date_to: date,
    ) -> CampgroundAvailability:
        months = _months_in_range(date_from, date_to)

        async with httpx.AsyncClient(headers=HEADERS, timeout=20) as client:
            # Fetch all months concurrently
            tasks = [
                client.get(
                    f"{BASE_URL}/{provider_id}/month",
                    params={"start_date": f"{m.isoformat()}T00:00:00.000Z"},
                )
                for m in months
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Merge all month responses into one sites dict
        merged: dict[str, dict[str, str]] = {}  # site_id → {date → status}

        for resp in responses:
            if isinstance(resp, Exception):
                continue
            if resp.status_code != 200:
                continue
            data = resp.json()
            for site_id, site_data in data.get("campsites", {}).items():
                if site_id not in merged:
                    merged[site_id] = {}
                merged[site_id].update(site_data.get("availabilities", {}))

        # Build SiteAvailability list filtering to requested date range
        sites: list[SiteAvailability] = []
        for site_id, avail in merged.items():
            available_dates: list[date] = []
            for date_str, status in avail.items():
                try:
                    d = date.fromisoformat(date_str[:10])
                except ValueError:
                    continue
                if date_from <= d <= date_to and status == "Available":
                    available_dates.append(d)

            if available_dates:
                sites.append(SiteAvailability(
                    site_id=site_id,
                    site_name=site_id,  # rec.gov returns ID only at this endpoint
                    available_dates=sorted(available_dates),
                ))

        return CampgroundAvailability(
            campground_id="",  # filled in by caller
            provider_id=provider_id,
            sites=sites,
        )
