from datetime import timedelta

from sqlalchemy import select, func, cast
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geography

from app.models.traffic import TrafficObservation
from app.models.traffic_hotspot import TrafficHotspot


HOTSPOT_RADIUS_METERS = 100
HOTSPOT_TIME_WINDOW_MINUTES = 5


def get_congestion_level(avg_vehicle_count: float) -> str:
    if avg_vehicle_count < 15:
        return "LOW"

    if avg_vehicle_count <= 30:
        return "MEDIUM"

    return "HIGH"


def make_point(latitude: float, longitude: float):
    return cast(
        func.ST_SetSRID(
            func.ST_MakePoint(longitude, latitude),
            4326
        ),
        Geography(
            geometry_type="POINT",
            srid=4326
        )
    )


async def create_or_update_hotspot(
    db: AsyncSession,
    observation: TrafficObservation
):
    point = make_point(
        observation.latitude,
        observation.longitude
    )

    start_time = (
        observation.timestamp
        - timedelta(minutes=HOTSPOT_TIME_WINDOW_MINUTES)
    )

    # Find an existing hotspot that is:
    # 1. geographically close
    # 2. recently active
    query = select(TrafficHotspot).where(
        func.ST_DWithin(
            TrafficHotspot.location,
            point,
            HOTSPOT_RADIUS_METERS
        ),
        TrafficHotspot.last_detected_at >= start_time
    ).order_by(
        TrafficHotspot.last_detected_at.desc()
    ).limit(1)

    result = await db.execute(query)

    hotspot = result.scalar_one_or_none()

    if hotspot:

        # Recalculate using observations around this observation
        observation_query = select(TrafficObservation).where(
            TrafficObservation.timestamp.between(
                start_time,
                observation.timestamp
            ),
            func.ST_DWithin(
                TrafficObservation.location,
                hotspot.location,
                HOTSPOT_RADIUS_METERS
            )
        )

        result = await db.execute(observation_query)

        observations = result.scalars().all()

        if observation not in observations:
            observations.append(observation)

        vehicle_counts = [
            obs.vehicle_count
            for obs in observations
        ]

        hotspot.avg_vehicle_count = (
            sum(vehicle_counts) / len(vehicle_counts)
        )

        hotspot.peak_vehicle_count = max(vehicle_counts)

        hotspot.observation_count = len(observations)

        hotspot.unique_bus_count = len({
            obs.bus_id
            for obs in observations
        })

        hotspot.congestion_level = get_congestion_level(
            hotspot.avg_vehicle_count
        )

        hotspot.first_detected_at = min(
            obs.timestamp
            for obs in observations
        )

        hotspot.last_detected_at = max(
            obs.timestamp
            for obs in observations
        )

    else:

        hotspot = TrafficHotspot(
            location=point,

            latitude=observation.latitude,
            longitude=observation.longitude,

            avg_vehicle_count=observation.vehicle_count,
            peak_vehicle_count=observation.vehicle_count,

            observation_count=1,
            unique_bus_count=1,

            congestion_level=get_congestion_level(
                observation.vehicle_count
            ),

            first_detected_at=observation.timestamp,
            last_detected_at=observation.timestamp
        )

        db.add(hotspot)

    await db.commit()
    await db.refresh(hotspot)

    return hotspot