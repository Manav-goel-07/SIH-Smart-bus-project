from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, cast, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geography

from app.db.database import get_db
from app.schemas.event import EventCreate
from app.models.event import Event
from app.models.road_issue import RoadIssue

from fastapi import HTTPException
from uuid import UUID


router = APIRouter(
    prefix="/api/events",
    tags=["Events"]
)


@router.post("/")
async def create_event(
    event_data: EventCreate,
    db: AsyncSession = Depends(get_db)
):
    lat = event_data.location.latitude
    lon = event_data.location.longitude

    # Create PostGIS point
    location_expr = cast(
        func.ST_SetSRID(
            func.ST_MakePoint(lon, lat),
            4326
        ),
        Geography(geometry_type="POINT", srid=4326)
    )

    road_issue_id = None
    is_new_issue = False

    # Currently cluster potholes.
    # Later we can add other issue types.
    clusterable_types = {
        "pothole"
    }

    if event_data.event_type in clusterable_types:

        issue_query = select(RoadIssue).where(
            RoadIssue.issue_type == event_data.event_type,
            func.ST_DWithin(
                RoadIssue.location,
                location_expr,
                20
            )
        ).limit(1)

        result = await db.execute(issue_query)
        road_issue = result.scalar_one_or_none()

        if road_issue:

            # Existing road issue found
            road_issue.detection_count += 1

            if (
                event_data.confidence is not None
                and (
                    road_issue.max_confidence is None
                    or event_data.confidence > road_issue.max_confidence
                )
            ):
                road_issue.max_confidence = event_data.confidence

            road_issue.last_detected_at = event_data.timestamp

            if event_data.severity is not None:
                road_issue.severity = event_data.severity

            road_issue_id = road_issue.id

        else:

            # New road issue
            road_issue = RoadIssue(
                issue_type=event_data.event_type,
                location=location_expr,
                latitude=lat,
                longitude=lon,
                detection_count=1,
                max_confidence=event_data.confidence,
                severity=event_data.severity,
                first_detected_at=event_data.timestamp,
                last_detected_at=event_data.timestamp
            )

            db.add(road_issue)

            # Flush gives us the generated UUID
            await db.flush()

            road_issue_id = road_issue.id
            is_new_issue = True

    # ALWAYS store the raw event
    event = Event(
        event_type=event_data.event_type,
        bus_id=event_data.bus_id,
        timestamp=event_data.timestamp,
        latitude=lat,
        longitude=lon,
        confidence=event_data.confidence,
        severity=event_data.severity,
        event_metadata=event_data.metadata,
        evidence_url=event_data.evidence_url,
        location=location_expr,
        road_issue_id=road_issue_id
    )

    db.add(event)

    await db.commit()
    await db.refresh(event)

    return {
        "message": "Event created and linked to road issue",
        "event_id": str(event.id),
        "road_issue_id": (
            str(road_issue_id)
            if road_issue_id
            else None
        ),
        "is_new_issue": is_new_issue
    }

@router.get("/")
async def get_events(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),

    event_type: str | None = None,
    bus_id: str | None = None,
    severity: str | None = None,

    db: AsyncSession = Depends(get_db)
):
    query = select(Event)

    # Filters
    if event_type:
        query = query.where(
            Event.event_type == event_type
        )

    if bus_id:
        query = query.where(
            Event.bus_id == bus_id
        )

    if severity:
        query = query.where(
            Event.severity == severity
        )

    # Newest events first
    query = query.order_by(
        Event.timestamp.desc()
    )

    # Pagination
    offset = (page - 1) * limit

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)

    events = result.scalars().all()

    return {
        "page": page,
        "limit": limit,
        "count": len(events),
        "events": [
            {
                "id": str(event.id),
                "event_type": event.event_type,
                "bus_id": event.bus_id,
                "timestamp": event.timestamp,
                "location": {
                    "latitude": event.latitude,
                    "longitude": event.longitude
                },
                "confidence": event.confidence,
                "severity": event.severity,
                "metadata": event.event_metadata,
                "evidence_url": event.evidence_url,
                "road_issue_id": (
                    str(event.road_issue_id)
                    if event.road_issue_id
                    else None
                )
            }
            for event in events
        ]
    }

@router.get("/{event_id}")
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    query = select(Event).where(
        Event.id == event_id
    )

    result = await db.execute(query)

    event = result.scalar_one_or_none()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return {
        "id": str(event.id),
        "event_type": event.event_type,
        "bus_id": event.bus_id,
        "timestamp": event.timestamp,
        "location": {
            "latitude": event.latitude,
            "longitude": event.longitude
        },
        "confidence": event.confidence,
        "severity": event.severity,
        "metadata": event.event_metadata,
        "evidence_url": event.evidence_url,
        "road_issue_id": (
            str(event.road_issue_id)
            if event.road_issue_id
            else None
        )
    }