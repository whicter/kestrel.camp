from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..database import get_db
from ..deps import admin_user
from ..models.user import User
from ..models.campground import Campground
from ..models.alert import Alert, AlertStatus

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats")
async def stats(
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    total_campgrounds = (await db.execute(select(func.count()).select_from(Campground))).scalar()
    active_alerts = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.watching)
    )).scalar()
    total_alerts = (await db.execute(select(func.count()).select_from(Alert))).scalar()

    cg_rows = (await db.execute(
        select(Campground.provider, func.count()).group_by(Campground.provider)
    )).all()

    return {
        "total_users": total_users,
        "total_campgrounds": total_campgrounds,
        "active_alerts": active_alerts,
        "total_alerts": total_alerts,
        "campgrounds_by_provider": [
            {"provider": r[0].value, "count": r[1]} for r in cg_rows
        ],
    }


@router.get("/users")
async def list_users(
    _: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(User, func.count(Alert.id).label("alert_count"))
        .outerjoin(Alert, Alert.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )).all()

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "tier": u.tier.value,
            "is_admin": u.is_admin,
            "alert_count": cnt,
            "created_at": u.created_at.isoformat(),
        }
        for u, cnt in rows
    ]
