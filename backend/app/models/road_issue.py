import uuid

from sqlalchemy import String, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography

from app.models.event import Base


class RoadIssue(Base):
    __tablename__ = "road_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    issue_type: Mapped[str] = mapped_column(
        String,
        nullable=False
    )

    location: Mapped[object] = mapped_column(
        Geography(geometry_type="POINT", srid=4326),
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

    detection_count: Mapped[int] = mapped_column(
        Integer,
        default=1
    )

    max_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True
    )

    severity: Mapped[str | None] = mapped_column(
        String,
        nullable=True
    )

    first_detected_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    last_detected_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )