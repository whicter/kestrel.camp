from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from ..database import get_db
from ..models.campground import Campground, Provider
from ..schemas.campground import CampgroundResponse

router = APIRouter(prefix="/api/campgrounds", tags=["campgrounds"])


def _haversine_km(lat1: float, lng1: float):
    """Returns a SQLAlchemy expression for distance in km from (lat1, lng1)."""
    R = 6371
    lat1_r = func.radians(lat1)
    lng1_r = func.radians(lng1)
    lat2_r = func.radians(Campground.lat)
    lng2_r = func.radians(Campground.lng)
    dlat = lat2_r - lat1_r
    dlng = lng2_r - lng1_r
    a = (
        func.pow(func.sin(dlat / 2), 2)
        + func.cos(lat1_r) * func.cos(lat2_r) * func.pow(func.sin(dlng / 2), 2)
    )
    return R * 2 * func.asin(func.sqrt(a))


@router.get("", response_model=list[CampgroundResponse])
async def search_campgrounds(
    q: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Campground)

    if q:
        stmt = stmt.where(
            or_(
                Campground.name.ilike(f"%{q}%"),
                Campground.park_name.ilike(f"%{q}%"),
            )
        )
    if provider:
        stmt = stmt.where(Campground.provider == provider)
    if state:
        stmt = stmt.where(Campground.state_province.ilike(f"%{state}%"))

    if lat is not None and lng is not None:
        # Only sort by distance when no text query — proximity is the ranking signal
        stmt = stmt.where(Campground.lat.isnot(None), Campground.lng.isnot(None))
        if not q:
            stmt = stmt.order_by(_haversine_km(lat, lng))

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# Booking window in days per provider (how far in advance sites open)
BOOKING_WINDOWS: dict[str, int] = {
    "recreation.gov":   180,
    "reservecalifornia": 182,  # ~6 months
    "bc-parks":         122,   # ~4 months
    "goingtoccamp":     152,   # ~5 months
    "parks-canada":     180,
    "usedirect":        180,
    "reserveamerica":   180,
}

# Drop times per provider (display only)
DROP_TIMES: dict[str, str] = {
    "recreation.gov":   "4:00 PM ET",
    "reservecalifornia": "8:00 AM PT",
    "bc-parks":         "7:00 AM PT",
    "goingtoccamp":     "8:00 AM ET",
    "parks-canada":     "9:00 AM ET",
    "usedirect":        "8:00 AM ET",
    "reserveamerica":   "8:00 AM ET",
}


@router.get("/releasing-today", response_model=list[dict])
async def releasing_today(db: AsyncSession = Depends(get_db)):
    """
    Returns campgrounds whose booking window opens today (or within ±1 day).
    e.g. Recreation.gov opens 180 days out, so today's 'release date' is
    the campsite date 180 days from now.
    """
    today = date.today()
    result = await db.execute(select(Campground))
    campgrounds = result.scalars().all()

    releasing = []
    for cg in campgrounds:
        prov = cg.provider.value
        window = BOOKING_WINDOWS.get(prov, 180)
        # The campsite date becoming bookable today
        release_campsite_date = today + timedelta(days=window)

        releasing.append({
            "id": str(cg.id),
            "name": cg.name,
            "park_name": cg.park_name,
            "state_province": cg.state_province,
            "provider": prov,
            "provider_id": cg.provider_id,
            "total_sites": cg.total_sites,
            "drop_time": DROP_TIMES.get(prov, "—"),
            "booking_window_days": window,
            "release_campsite_date": release_campsite_date.isoformat(),
            "lat": cg.lat,
            "lng": cg.lng,
        })

    # Sort by provider (recreation.gov first, then others)
    order = ["recreation.gov", "reservecalifornia", "bc-parks", "goingtoccamp"]
    releasing.sort(key=lambda c: (order.index(c["provider"]) if c["provider"] in order else 99, c["name"]))
    return releasing


@router.get("/{campground_id}", response_model=CampgroundResponse)
async def get_campground(campground_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Campground).where(Campground.id == campground_id)
    )
    campground = result.scalar_one_or_none()
    if not campground:
        raise HTTPException(status_code=404, detail="Campground not found")
    return campground
