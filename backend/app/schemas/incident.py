from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class IncidentLocation(BaseModel):
    latitude: float
    longitude: float


class IncidentCreate(BaseModel):
    bus_id: str

    incident_type: str

    timestamp: datetime

    location: IncidentLocation

    confidence: float | None = Field(
        default=None,
        ge=0,
        le=1
    )

    vehicle_number: str | None = None

    evidence_url: str | None = None

    severity: str | None = None

    status: str = "NEW"

    metadata: dict[str, Any] | None = None