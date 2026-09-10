from fastapi import APIRouter, Depends

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import cast, func

from geoalchemy2 import Geography

from app.db.database import get_db

from app.models.traffic import TrafficObservation

from app.schemas.traffic import TrafficObservationCreate

from fastapi import Query
from sqlalchemy import select

from app.services.traffic_service import create_or_update_hotspot

from app.models.traffic_hotspot import TrafficHotspot


router = APIRouter(
    prefix="/api/traffic",
    tags=["Traffic"]
)


@router.post("/observations")
async def create_traffic_observation(
    observation: TrafficObservationCreate,
    db: AsyncSession = Depends(get_db)
):

    lat = observation.location.latitude
    lon = observation.location.longitude

    location_expr = cast(
        func.ST_SetSRID(
            func.ST_MakePoint(
                lon,
                lat
            ),
            4326
        ),
        Geography(
            geometry_type="POINT",
            srid=4326
        )
    )

    traffic_observation = TrafficObservation(
        bus_id=observation.bus_id,
        timestamp=observation.timestamp,

        latitude=lat,
        longitude=lon,

        vehicle_count=observation.vehicle_count,

        cars=observation.cars,
        buses=observation.buses,
        trucks=observation.trucks,
        two_wheelers=observation.two_wheelers,

        location=location_expr
    )

    db.add(traffic_observation)

    await db.commit()

    await db.refresh(traffic_observation)

    await create_or_update_hotspot(
        db,
        traffic_observation
    )

    return {
        "message": "Traffic observation created",

        "id": str(
            traffic_observation.id
        ),

        "bus_id": traffic_observation.bus_id,

        "timestamp": traffic_observation.timestamp,

        "location": {
            "latitude": lat,
            "longitude": lon
        },

        "vehicle_count":
            traffic_observation.vehicle_count
    }

@router.get("/observations")
async def get_traffic_observations(
    bus_id: str | None = None,
    limit: int = Query(50, ge=1, le=200),

    db: AsyncSession = Depends(get_db)
):
    query = select(TrafficObservation)

    if bus_id:
        query = query.where(
            TrafficObservation.bus_id == bus_id
        )

    query = (
        query
        .order_by(TrafficObservation.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(query)

    observations = result.scalars().all()

    return [
        {
            "id": str(observation.id),

            "bus_id": observation.bus_id,

            "timestamp": observation.timestamp,

            "location": {
                "latitude": observation.latitude,
                "longitude": observation.longitude
            },

            "vehicle_count": observation.vehicle_count,

            "cars": observation.cars,
            "buses": observation.buses,
            "trucks": observation.trucks,
            "two_wheelers": observation.two_wheelers
        }
        for observation in observations
    ]

@router.get("/hotspots")
async def get_traffic_hotspots(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    from app.models.traffic_hotspot import TrafficHotspot

    query = (
        select(TrafficHotspot)
        .order_by(
            TrafficHotspot.last_detected_at.desc()
        )
        .limit(limit)
    )

    result = await db.execute(query)

    hotspots = result.scalars().all()

    return [
        {
            "id": str(hotspot.id),

            "location": {
                "latitude": hotspot.latitude,
                "longitude": hotspot.longitude
            },

            "avg_vehicle_count": hotspot.avg_vehicle_count,
            "peak_vehicle_count": hotspot.peak_vehicle_count,

            "observation_count": hotspot.observation_count,
            "unique_bus_count": hotspot.unique_bus_count,

            "congestion_level": hotspot.congestion_level,

            "first_detected_at": hotspot.first_detected_at,
            "last_detected_at": hotspot.last_detected_at
        }
        for hotspot in hotspots
    ]