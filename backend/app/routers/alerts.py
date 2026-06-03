from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..deps import current_user
from ..models.user import User
from ..schemas.alert import AlertCreate, AlertUpdate, AlertResponse
from ..services import alerts as alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    return await alert_service.get_alerts_for_user(db, str(user.id))


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    body: AlertCreate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await alert_service.create_alert(db, str(user.id), body)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await alert_service.get_alert(db, alert_id, str(user.id))
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    body: AlertUpdate,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await alert_service.update_alert(db, alert_id, str(user.id), body)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await alert_service.delete_alert(db, alert_id, str(user.id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
