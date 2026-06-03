import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from ..models.alert import Alert, AlertStatus, ScanPriority
from ..models.campground import Campground
from ..schemas.alert import AlertCreate, AlertUpdate


async def get_alerts_for_user(db: AsyncSession, user_id: str) -> list[Alert]:
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == user_id)
        .options(selectinload(Alert.campground))
        .order_by(Alert.created_at.desc())
    )
    return list(result.scalars().all())


async def get_alert(db: AsyncSession, alert_id: str, user_id: str) -> Optional[Alert]:
    result = await db.execute(
        select(Alert)
        .where(Alert.id == alert_id, Alert.user_id == user_id)
        .options(selectinload(Alert.campground))
    )
    return result.scalar_one_or_none()


async def create_alert(db: AsyncSession, user_id: str, data: AlertCreate) -> Alert:
    # Check campground exists
    cg_result = await db.execute(
        select(Campground).where(Campground.id == data.campground_id)
    )
    campground = cg_result.scalar_one_or_none()
    if not campground:
        raise ValueError("Campground not found")

    alert = Alert(
        user_id=uuid.UUID(user_id),
        campground_id=uuid.UUID(data.campground_id),
        date_from=data.date_from,
        date_to=data.date_to,
        nights_min=data.nights_min,
        site_type=data.site_type,
        status=AlertStatus.watching,
        scan_priority=ScanPriority.normal,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert, ["campground"])
    return alert


async def update_alert(db: AsyncSession, alert_id: str, user_id: str, data: AlertUpdate) -> Optional[Alert]:
    alert = await get_alert(db, alert_id, user_id)
    if not alert:
        return None

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(alert, field, value)

    await db.commit()
    await db.refresh(alert, ["campground"])
    return alert


async def delete_alert(db: AsyncSession, alert_id: str, user_id: str) -> bool:
    alert = await get_alert(db, alert_id, user_id)
    if not alert:
        return False
    await db.delete(alert)
    await db.commit()
    return True
