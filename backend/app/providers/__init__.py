from .base import BaseProvider, CampgroundAvailability, SiteAvailability
from .recreation_gov import RecreationGovProvider
from .reserve_california import ReserveCaliforniaProvider
from .bc_parks import BCParksProvider
from .going_to_camp import GoingToCampProvider

PROVIDER_MAP: dict[str, BaseProvider] = {
    "recreation.gov": RecreationGovProvider(),
    "reservecalifornia": ReserveCaliforniaProvider(),
    "bc-parks": BCParksProvider(),
    "goingtoccamp": GoingToCampProvider(),
}


def get_provider(name: str) -> BaseProvider | None:
    return PROVIDER_MAP.get(name)
