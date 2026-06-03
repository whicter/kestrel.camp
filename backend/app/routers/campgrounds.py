from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from ..database import get_db
from ..models.campground import Campground, Provider
from ..schemas.campground import CampgroundResponse

router = APIRouter(prefix="/api/campgrounds", tags=["campgrounds"])


@router.get("", response_model=list[CampgroundResponse])
async def search_campgrounds(
    q: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
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
