import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, field_serializer


class CampgroundResponse(BaseModel):
    id: uuid.UUID
    name: str
    park_name: str
    state_province: str
    country: str
    provider: str
    lat: Optional[float]
    lng: Optional[float]
    total_sites: Optional[int]
    last_scanned_at: Optional[datetime]

    model_config = {"from_attributes": True}

    @field_serializer("id")
    def serialize_id(self, v: uuid.UUID) -> str:
        return str(v)
