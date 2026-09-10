from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.event import Event
from app.models.incident import Incident
from app.models.road_issue import RoadIssue
from app.models.traffic_hotspot import TrafficHotspot


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


async def count_rows(db: AsyncSession, model, *conditions):
    query = select(func.count()).select_from(model)
    if conditions:
        query = query.where(*conditions)
    result = await db.execute(query)
    return result.scalar_one()


@router.get("/summary")
async def get_dashboard_summary(db: AsyncSession = Depends(get_db)):
    high_road_issues = await count_rows(
        db,
        RoadIssue,
        func.upper(RoadIssue.severity) == "HIGH"
    )
    high_incidents = await count_rows(
        db,
        Incident,
        func.upper(Incident.severity) == "HIGH"
    )

    return {
        "total_events": await count_rows(db, Event),
        "active_road_issues": await count_rows(db, RoadIssue),
        "traffic_hotspots": await count_rows(db, TrafficHotspot),
        "active_incidents": await count_rows(
            db,
            Incident,
            func.upper(Incident.status) != "RESOLVED"
        ),
        "high_severity_issues": high_road_issues + high_incidents,
        "high_congestion_hotspots": await count_rows(
            db,
            TrafficHotspot,
            func.upper(TrafficHotspot.congestion_level) == "HIGH"
        )
    }
