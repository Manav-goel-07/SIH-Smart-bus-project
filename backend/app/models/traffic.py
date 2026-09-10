import uuid

from sqlalchemy import String, Integer, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from geoalchemy2 import Geography

from app.models.event import Base


class TrafficObservation(Base):
    __tablename__ = "traffic_observations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    bus_id: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    timestamp: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
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

    vehicle_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    cars: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    buses: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    trucks: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    two_wheelers: Mapped[int] = mapped_column(
        Integer,
        default=0
    )

    location: Mapped[object] = mapped_column(
        Geography(
            geometry_type="POINT",
            srid=4326
        ),
        nullable=False
    )