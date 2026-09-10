from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Location(BaseModel):
    latitude: float
    longitude: float


class EventCreate(BaseModel):
    event_id: str | None = None

    bus_id: str

    event_type: str

    timestamp: datetime

    location: Location

    confidence: float | None = Field(
        default=None,
        ge=0,
        le=1
    )

    severity: str | None = None

    metadata: dict[str, Any] | None = None

    evidence_url: str | None = None