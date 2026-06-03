import uuid
from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, field_serializer
from ..models.alert import AlertStatus, ScanPriority, SiteType


class AlertCreate(BaseModel):
    campground_id: str
    date_from: date
    date_to: date
    nights_min: int = 1
    site_type: SiteType = SiteType.any


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    nights_min: Optional[int] = None
    site_type: Optional[SiteType] = None


class CampgroundSummary(BaseModel):
    id: uuid.UUID
    name: str
    park_name: str
    state_province: str
    provider: str

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, v: uuid.UUID) -> str:
        return str(v)


class AlertResponse(BaseModel):
    id: uuid.UUID
    campground_id: uuid.UUID
    campground: CampgroundSummary
    date_from: date
    date_to: date
    nights_min: int
    site_type: str
    status: str
    scan_priority: str
    triggered_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "campground_id")
    def serialize_uuids(self, v: uuid.UUID) -> str:
        return str(v)
