from fastapi import APIRouter, Depends, Query
from fastapi import HTTPException
from sqlalchemy import select, func, cast
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geography

from app.db.database import get_db
from app.models.road_issue import RoadIssue


router = APIRouter(
    prefix="/api/road-issues",
    tags=["Road Issues"]
)


@router.get("/")
async def get_road_issues(
    issue_type: str | None = None,
    severity: str | None = None,

    db: AsyncSession = Depends(get_db)
):
    query = select(RoadIssue)

    # Filter by issue type
    if issue_type:
        query = query.where(
            RoadIssue.issue_type == issue_type
        )

    # Filter by severity
    if severity:
        query = query.where(
            RoadIssue.severity == severity
        )

    query = query.order_by(
        RoadIssue.last_detected_at.desc()
    )

    result = await db.execute(query)

    issues = result.scalars().all()

    return [
        {
            "id": str(issue.id),

            "issue_type": issue.issue_type,

            "location": {
                "latitude": issue.latitude,
                "longitude": issue.longitude
            },

            "detection_count": issue.detection_count,

            "max_confidence": issue.max_confidence,

            "severity": issue.severity,

            "status": issue.status,

            "evidence_url": issue.evidence_url,

            "first_detected_at": issue.first_detected_at,

            "last_detected_at": issue.last_detected_at
        }
        for issue in issues
    ]

@router.get("/nearby")
async def get_nearby_road_issues(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius: float = Query(500, gt=0, le=10000),

    db: AsyncSession = Depends(get_db)
):
    point = cast(
        func.ST_SetSRID(
            func.ST_MakePoint(longitude, latitude),
            4326
        ),
        Geography(geometry_type="POINT", srid=4326)
    )

    distance = func.ST_Distance(
        RoadIssue.location,
        point
    )

    query = (
        select(
            RoadIssue,
            distance.label("distance")
        )
        .where(
            func.ST_DWithin(
                RoadIssue.location,
                point,
                radius
            )
        )
        .order_by(distance)
    )

    result = await db.execute(query)

    rows = result.all()

    return [
        {
            "id": str(issue.id),

            "issue_type": issue.issue_type,

            "location": {
                "latitude": issue.latitude,
                "longitude": issue.longitude
            },

            "distance_meters": round(distance_value, 2),

            "detection_count": issue.detection_count,

            "max_confidence": issue.max_confidence,

            "severity": issue.severity,

            "status": issue.status,

            "evidence_url": issue.evidence_url,

            "first_detected_at": issue.first_detected_at,

            "last_detected_at": issue.last_detected_at
        }
        for issue, distance_value in rows
    ]


@router.patch("/{issue_id}")
async def update_road_issue(
    issue_id: str,
    status: str | None = None,
    evidence_url: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RoadIssue).where(RoadIssue.id == issue_id))
    issue = result.scalar_one_or_none()
    if issue is None:
        raise HTTPException(status_code=404, detail="Road issue not found")

    allowed_statuses = {"PENDING", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "NEW", "INVESTIGATING"}
    if status is not None:
        status = status.upper()
        if status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed values: {sorted(allowed_statuses)}")
        issue.status = status
    if evidence_url is not None:
        issue.evidence_url = evidence_url
    await db.commit()
    await db.refresh(issue)
    return {"message": "Road issue updated", "id": str(issue.id), "status": issue.status, "evidence_url": issue.evidence_url}
