from __future__ import annotations

from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import cast, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.event import Event
from app.models.traffic_hotspot import TrafficHotspot


def _point(latitude: float, longitude: float):
    return cast(func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326), Geography(geometry_type="POINT", srid=4326))


def _severity_points(value: str | None) -> int:
    return {"HIGH": 20, "MEDIUM": 12, "LOW": 6}.get(str(value or "").upper(), 4)


async def priority_for(
    db: AsyncSession,
    *,
    latitude: float,
    longitude: float,
    severity: str | None,
    confidence: float | None,
    issue_id: Any = None,
    event_type: str | None = None,
    fallback_confirmations: int = 1,
) -> dict[str, Any]:
    point = _point(latitude, longitude)
    traffic_query = select(TrafficHotspot).where(func.ST_DWithin(TrafficHotspot.location, point, 500)).order_by(func.ST_Distance(TrafficHotspot.location, point)).limit(1)
    traffic = (await db.execute(traffic_query)).scalar_one_or_none()

    if issue_id:
        confirmation_query = select(func.count(distinct(Event.bus_id))).where(Event.road_issue_id == issue_id)
    else:
        confirmation_query = select(func.count(distinct(Event.bus_id))).where(
            Event.location.is_not(None),
            func.ST_DWithin(Event.location, point, 100),
            *( [Event.event_type == event_type] if event_type else [] )
        )
    confirmations = int((await db.execute(confirmation_query)).scalar_one() or 0)
    confirmations = max(confirmations, fallback_confirmations)

    traffic_count = float(traffic.avg_vehicle_count or 0) if traffic else 0
    traffic_component = min(40, round((traffic_count / 100) * 30) + (10 if traffic and str(traffic.congestion_level).upper() == "HIGH" else 6 if traffic and str(traffic.congestion_level).upper() == "MEDIUM" else 0))
    confirmation_component = min(30, confirmations * 6)
    severity_component = _severity_points(severity)
    confidence_component = min(10, round(float(confidence or 0) * 10))
    score = max(1, min(100, traffic_component + confirmation_component + severity_component + confidence_component))

    reasons = [f"{confirmations} confirming bus{'es' if confirmations != 1 else ''}"]
    if traffic:
        reasons.append(f"nearby traffic averages {traffic_count:.0f} vehicles with {str(traffic.congestion_level).lower()} congestion")
    else:
        reasons.append("no nearby traffic observation available")
    if severity:
        reasons.append(f"{str(severity).lower()} severity")
    if confidence is not None:
        reasons.append(f"AI confidence {float(confidence) * 100:.0f}%")

    return {
        "priority_score": score,
        "priority_reasons": reasons,
        "priority_evidence": {
            "confirming_buses": confirmations,
            "nearby_traffic": {
                "hotspot_id": str(traffic.id) if traffic else None,
                "avg_vehicle_count": traffic.avg_vehicle_count if traffic else None,
                "peak_vehicle_count": traffic.peak_vehicle_count if traffic else None,
                "congestion_level": traffic.congestion_level if traffic else None,
                "distance_meters": round(float((await db.execute(select(func.ST_Distance(TrafficHotspot.location, point)).where(TrafficHotspot.id == traffic.id))).scalar_one() or 0), 1) if traffic else None,
            },
            "score_breakdown": {
                "traffic": traffic_component,
                "confirmations": confirmation_component,
                "severity": severity_component,
                "confidence": confidence_component,
            },
        },
    }
