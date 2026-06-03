"""
Debug-only endpoints — disabled in production.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..config import settings
from ..database import get_db
from ..models.campground import Campground
from ..workers.scan import scan_campground

router = APIRouter(prefix="/debug", tags=["debug"])


def require_dev():
    if settings.is_production:
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/scan/{campground_id}", dependencies=[Depends(require_dev)])
async def trigger_scan(campground_id: str, db: AsyncSession = Depends(get_db)):
    """Manually trigger a scan job for a specific campground (dev only)."""
    result = await db.execute(select(Campground).where(Campground.id == campground_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Campground not found")

    import redis.asyncio as aioredis
    r = aioredis.from_url(settings.redis_url)
    ctx = {"redis": r}
    scan_result = await scan_campground(ctx, campground_id)
    await r.aclose()
    return scan_result


@router.get("/campgrounds", dependencies=[Depends(require_dev)])
async def list_all_campgrounds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campground))
    return [{"id": str(c.id), "name": c.name, "provider": c.provider.value} for c in result.scalars().all()]
