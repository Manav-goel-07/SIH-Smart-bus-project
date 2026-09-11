from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, cast, func
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geography

from app.db.database import get_db
from app.schemas.event import EventCreate
from app.models.event import Event
from app.models.road_issue import RoadIssue
from app.services.realtime import manager

from fastapi import HTTPException
from uuid import UUID


router = APIRouter(
    prefix="/api/events",
    tags=["Events"]
)


def normalize_road_issue_type(value: str) -> str:
    normalized = value.strip().lower().replace("_", "-")
    if normalized in {"d40", "pothole", "potholes"}:
        return "pothole"
    if normalized in {"d00", "d10", "d20", "crack", "cracks", "road-crack"}:
        return "crack"
    return normalized


def road_issue_payload(issue: RoadIssue) -> dict:
    return {
        "id": str(issue.id),
        "issue_type": issue.issue_type,
        "location": {"latitude": issue.latitude, "longitude": issue.longitude},
        "detection_count": issue.detection_count,
        "max_confidence": issue.max_confidence,
        "severity": issue.severity,
        "evidence_url": issue.evidence_url,
        "first_detected_at": issue.first_detected_at.isoformat(),
        "last_detected_at": issue.last_detected_at.isoformat(),
    }


@router.post("/")
async def create_event(
    event_data: EventCreate,
    db: AsyncSession = Depends(get_db)
):
    lat = event_data.location.latitude
    lon = event_data.location.longitude
    normalized_event_type = normalize_road_issue_type(event_data.event_type)

    # Create PostGIS point
    location_expr = cast(
        func.ST_SetSRID(
            func.ST_MakePoint(lon, lat),
            4326
        ),
        Geography(geometry_type="POINT", srid=4326)
    )

    road_issue = None
    road_issue_id = None
    is_new_issue = False

    # Currently cluster potholes.
    # Later we can add other issue types.
    clusterable_types = {"pothole", "crack"}

    if normalized_event_type in clusterable_types:

        issue_query = select(RoadIssue).where(
            RoadIssue.issue_type == normalized_event_type,
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

            if event_data.evidence_url:
                road_issue.evidence_url = event_data.evidence_url

            if event_data.severity is not None:
                road_issue.severity = event_data.severity

            road_issue_id = road_issue.id

        else:

            # New road issue
            road_issue = RoadIssue(
                issue_type=normalized_event_type,
                location=location_expr,
                latitude=lat,
                longitude=lon,
                detection_count=1,
                max_confidence=event_data.confidence,
                severity=event_data.severity,
                evidence_url=event_data.evidence_url,
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
        event_type=normalized_event_type,
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

    if road_issue:
        await manager.broadcast({
            "type": "ROAD_ISSUE_UPDATE",
            "road_issue": road_issue_payload(road_issue),
        })

    await manager.broadcast({
        "type": "NEW_EVENT",
        "event": {
            "id": str(event.id),
            "event_type": event.event_type,
            "bus_id": event.bus_id,
            "timestamp": event.timestamp.isoformat(),
            "location": {"latitude": event.latitude, "longitude": event.longitude},
            "confidence": event.confidence,
            "severity": event.severity,
            "evidence_url": event.evidence_url,
            "road_issue_id": str(event.road_issue_id) if event.road_issue_id else None,
        },
    })

    return {
        "message": "Complaint created and linked to road issue",
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
