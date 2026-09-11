from fastapi import APIRouter, Depends, Query
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, func

from geoalchemy2 import Geography

from app.db.database import get_db
from app.models.incident import Incident
from app.schemas.incident import IncidentCreate
from app.services.realtime import manager


router = APIRouter(
    prefix="/api/incidents",
    tags=["Incidents"]
)


@router.post("/")
async def create_incident(
    incident: IncidentCreate,
    db: AsyncSession = Depends(get_db)
):
    lat = incident.location.latitude
    lon = incident.location.longitude

    location_expr = cast(
        func.ST_SetSRID(
            func.ST_MakePoint(lon, lat),
            4326
        ),
        Geography(
            geometry_type="POINT",
            srid=4326
        )
    )

    new_incident = Incident(
        incident_type=incident.incident_type,
        bus_id=incident.bus_id,
        timestamp=incident.timestamp,

        latitude=lat,
        longitude=lon,
        location=location_expr,

        confidence=incident.confidence,
        vehicle_number=incident.vehicle_number,
        evidence_url=incident.evidence_url,
        severity=incident.severity,
        status=incident.status,
        event_metadata=incident.metadata
    )

    db.add(new_incident)

    await db.commit()
    await db.refresh(new_incident)

    await manager.broadcast({
        "type": "NEW_INCIDENT",
        "incident": {
            "id": str(new_incident.id),
            "incident_type": new_incident.incident_type,
            "bus_id": new_incident.bus_id,
            "timestamp": new_incident.timestamp.isoformat(),
            "location": {
                "latitude": new_incident.latitude,
                "longitude": new_incident.longitude
            },
            "confidence": new_incident.confidence,
            "vehicle_number": new_incident.vehicle_number,
            "severity": new_incident.severity,
            "status": new_incident.status
        }
    })

    return {
        "message": "Incident created",
        "id": str(new_incident.id),
        "incident_type": new_incident.incident_type,
        "bus_id": new_incident.bus_id,
        "timestamp": new_incident.timestamp,
        "location": {
            "latitude": new_incident.latitude,
            "longitude": new_incident.longitude
        },
        "vehicle_number": new_incident.vehicle_number,
        "confidence": new_incident.confidence,
        "severity": new_incident.severity,
        "status": new_incident.status
    }


@router.get("/")
async def get_incidents(
    incident_type: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    bus_id: str | None = None,

    limit: int = Query(
        50,
        ge=1,
        le=200
    ),

    db: AsyncSession = Depends(get_db)
):
    query = select(Incident)

    if incident_type:
        query = query.where(
            Incident.incident_type == incident_type
        )

    if status:
        query = query.where(
            Incident.status == status
        )

    if severity:
        query = query.where(
            Incident.severity == severity
        )

    if bus_id:
        query = query.where(
            Incident.bus_id == bus_id
        )

    query = (
        query
        .order_by(Incident.timestamp.desc())
        .limit(limit)
    )

    result = await db.execute(query)

    incidents = result.scalars().all()

    return [
        {
            "id": str(incident.id),
            "incident_type": incident.incident_type,
            "bus_id": incident.bus_id,
            "timestamp": incident.timestamp,

            "location": {
                "latitude": incident.latitude,
                "longitude": incident.longitude
            },

            "confidence": incident.confidence,
            "vehicle_number": incident.vehicle_number,
            "evidence_url": incident.evidence_url,
            "severity": incident.severity,
            "status": incident.status
        }
        for incident in incidents
    ]

@router.patch("/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status: str,
    evidence_url: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).where(
        Incident.id == incident_id
    )

    result = await db.execute(query)

    incident = result.scalar_one_or_none()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    allowed_statuses = {
        "NEW",
        "PENDING",
        "ACKNOWLEDGED",
        "IN_PROGRESS",
        "INVESTIGATING",
        "RESOLVED"
    }

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed values: {allowed_statuses}"
        )

    incident.status = status
    if evidence_url is not None:
        incident.evidence_url = evidence_url

    await db.commit()
    await db.refresh(incident)

    return {
        "message": "Incident status updated",
        "id": str(incident.id),
        "status": incident.status,
        "evidence_url": incident.evidence_url
    }
