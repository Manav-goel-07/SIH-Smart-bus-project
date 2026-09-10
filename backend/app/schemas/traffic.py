from datetime import datetime

from pydantic import BaseModel, Field


class TrafficLocation(BaseModel):
    latitude: float
    longitude: float


class TrafficObservationCreate(BaseModel):

    bus_id: str

    timestamp: datetime

    location: TrafficLocation

    vehicle_count: int = Field(
        ge=0
    )

    cars: int = Field(
        default=0,
        ge=0
    )

    buses: int = Field(
        default=0,
        ge=0
    )

    trucks: int = Field(
        default=0,
        ge=0
    )

    two_wheelers: int = Field(
        default=0,
        ge=0
    )