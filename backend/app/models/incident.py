import uuid

from sqlalchemy import String, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from geoalchemy2 import Geography

from app.models.event import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    incident_type: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    bus_id: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    timestamp: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    location: Mapped[object] = mapped_column(
        Geography(
            geometry_type="POINT",
            srid=4326
        ),
        nullable=False
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    vehicle_number: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    evidence_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    severity: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String,
        default="NEW"
    )

    event_metadata: Mapped[dict | None] = mapped_column(
        "metadata",
        JSONB,
        nullable=True
    )