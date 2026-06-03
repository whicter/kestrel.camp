"""
BC Parks availability adapter.

BC Parks (camping.bcparks.ca) uses the GoingToCamp platform, which is
protected by Azure WAF / CAPTCHA that blocks server-side HTTP clients.
Reliable scraping requires a headless browser (Playwright).

This stub returns empty availability so the system degrades gracefully.
Sites with bc-parks provider will be scanned but won't trigger notifications
until a real session-based scraper is wired in.
"""
import logging
from datetime import date

from .base import BaseProvider, CampgroundAvailability

logger = logging.getLogger(__name__)


class BCParksProvider(BaseProvider):

    @property
    def name(self) -> str:
        return "bc-parks"

    async def get_availability(
        self,
        provider_id: str,
        date_from: date,
        date_to: date,
    ) -> CampgroundAvailability:
        logger.info(
            "BCParks provider stub: %s %s→%s (WAF blocks direct API access)",
            provider_id, date_from, date_to,
        )
        return CampgroundAvailability(
            campground_id="",
            provider_id=provider_id,
            sites=[],
        )
