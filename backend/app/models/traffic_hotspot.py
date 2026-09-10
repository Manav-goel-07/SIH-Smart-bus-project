import uuid

from sqlalchemy import String, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from geoalchemy2 import Geography

from app.models.event import Base


class TrafficHotspot(Base):
    __tablename__ = "traffic_hotspots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
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

    avg_vehicle_count: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    peak_vehicle_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    observation_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    unique_bus_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    congestion_level: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    first_detected_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    last_detected_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )