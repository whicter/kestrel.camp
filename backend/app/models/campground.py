import uuid
from typing import Optional
from sqlalchemy import String, Float, Integer, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin
from datetime import datetime
import enum


class Provider(str, enum.Enum):
    recreation_gov = "recreation.gov"
    reserve_california = "reservecalifornia"
    bc_parks = "bc-parks"
    parks_canada = "parks-canada"
    usedirect = "usedirect"
    going_to_camp = "goingtoccamp"
    reserve_america = "reserveamerica"


class Campground(Base, TimestampMixin):
    __tablename__ = "campgrounds"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    park_name: Mapped[str] = mapped_column(String(255), nullable=False)
    state_province: Mapped[str] = mapped_column(String(100), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False, default="US")  # ISO 3166-1

    provider: Mapped[Provider] = mapped_column(SAEnum(Provider), nullable=False, index=True)
    provider_id: Mapped[str] = mapped_column(String(100), nullable=False)  # ID in the external system
    provider_facility_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g. ReserveCalifornia FacilityId for deep links

    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="America/Los_Angeles")
    total_sites: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    last_scanned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    alerts: Mapped[list["Alert"]] = relationship(back_populates="campground")  # noqa: F821
    snapshots: Mapped[list["AvailabilitySnapshot"]] = relationship(back_populates="campground", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Campground {self.name} [{self.provider}]>"
