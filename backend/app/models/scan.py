import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import Integer, DateTime, ForeignKey, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .base import Base
import enum


class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    push = "push"


class AvailabilitySnapshot(Base):
    """
    One row per campground scan. Used to diff against previous snapshot
    to detect newly opened sites without re-notifying for already-known openings.
    """
    __tablename__ = "availability_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    campground_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("campgrounds.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    available_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Array of site IDs that are currently open — stored as JSONB for flexibility
    available_site_ids: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    # Raw provider response for debugging / replay
    raw_response: Mapped[dict] = mapped_column(JSONB, nullable=True)

    campground: Mapped["Campground"] = relationship(back_populates="snapshots")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Snapshot {self.campground_id} {self.scanned_at} ({self.available_count} avail)>"


class NotificationLog(Base):
    """
    Records every notification sent — prevents duplicate alerts for the same opening.
    """
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    alert_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("alerts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    channel: Mapped[NotificationChannel] = mapped_column(SAEnum(NotificationChannel), nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    alert: Mapped["Alert"] = relationship(back_populates="notification_logs")  # noqa: F821

    def __repr__(self) -> str:
        return f"<NotificationLog {self.channel} alert={self.alert_id}>"
