"""
GoingToCamp availability adapter (Ontario Parks, Manitoba Parks, etc.).

reservations.ontarioparks.ca uses the GoingToCamp platform.
Like BC Parks, the API is protected by WAF / CAPTCHA.

This stub returns empty availability so the system degrades gracefully.
"""
import logging
from datetime import date

from .base import BaseProvider, CampgroundAvailability

logger = logging.getLogger(__name__)


class GoingToCampProvider(BaseProvider):

    @property
    def name(self) -> str:
        return "goingtoccamp"

    async def get_availability(
        self,
        provider_id: str,
        date_from: date,
        date_to: date,
    ) -> CampgroundAvailability:
        logger.info(
            "GoingToCamp provider stub: %s %s→%s (WAF blocks direct API access)",
            provider_id, date_from, date_to,
        )
        return CampgroundAvailability(
            campground_id="",
            provider_id=provider_id,
            sites=[],
        )
