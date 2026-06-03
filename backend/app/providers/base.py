from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date


@dataclass
class SiteAvailability:
    site_id: str
    site_name: str
    available_dates: list[date] = field(default_factory=list)


@dataclass
class CampgroundAvailability:
    campground_id: str      # our internal UUID
    provider_id: str        # ID in the external system
    sites: list[SiteAvailability] = field(default_factory=list)

    @property
    def available_site_ids(self) -> list[str]:
        return [s.site_id for s in self.sites if s.available_dates]

    @property
    def available_count(self) -> int:
        return len(self.available_site_ids)


class BaseProvider(ABC):
    """
    All reservation system adapters implement this interface.
    Each provider fetches availability for one campground and returns
    a CampgroundAvailability object.
    """

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    async def get_availability(
        self,
        provider_id: str,
        date_from: date,
        date_to: date,
    ) -> CampgroundAvailability: ...
