import uuid
from typing import Optional
from datetime import date, datetime
from sqlalchemy import String, Boolean, Date, DateTime, ForeignKey, Enum as SAEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from .base import Base, TimestampMixin
import enum


class AlertStatus(str, enum.Enum):
    watching = "watching"
    triggered = "triggered"
    paused = "paused"
    expired = "expired"


class ScanPriority(str, enum.Enum):
    fast = "fast"      # every 2 min — drop windows + high-demand parks
    normal = "normal"  # every 10 min
    slow = "slow"      # every 30 min — low-demand / far-out dates


class SiteType(str, enum.Enum):
    any = "any"
    tent = "tent"
    rv = "rv"
    cabin = "cabin"


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campground_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campgrounds.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Date window user wants to camp
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    nights_min: Mapped[int] = mapped_column(Integer, default=1)

    site_type: Mapped[SiteType] = mapped_column(SAEnum(SiteType), default=SiteType.any)
    status: Mapped[AlertStatus] = mapped_column(
        SAEnum(AlertStatus), default=AlertStatus.watching, nullable=False, index=True
    )
    scan_priority: Mapped[ScanPriority] = mapped_column(
        SAEnum(ScanPriority), default=ScanPriority.normal, nullable=False
    )

    triggered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="alerts")  # noqa: F821
    campground: Mapped["Campground"] = relationship(back_populates="alerts")  # noqa: F821
    notification_logs: Mapped[list["NotificationLog"]] = relationship(back_populates="alert", cascade="all, delete-orphan")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Alert {self.campground_id} {self.date_from}→{self.date_to} [{self.status}]>"
