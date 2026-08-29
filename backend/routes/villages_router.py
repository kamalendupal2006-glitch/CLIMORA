"""
CLIMORA Remote Villages REST Router
====================================
FastAPI endpoints for:
- Remote village discovery near GPS coordinates
- Correlated road connectivity assessment
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import JSONResponse

from services.village_service import village_service

router = APIRouter(prefix="/api/villages", tags=["Remote Village Discovery"])


@router.get(
    "/nearby",
    summary="Discover remote villages near GPS coordinates",
    description=(
        "Retrieves real village and settlement geospatial data (OpenStreetMap Overpass API) "
        "and evaluates road accessibility based on active hazard reports."
    ),
)
async def get_nearby_villages(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    radius_km: float = Query(25.0, ge=1.0, le=100.0, description="Search radius in km"),
    limit: int = Query(30, ge=1, le=100, description="Maximum settlements to return"),
) -> JSONResponse:
    result = await village_service.get_nearby_villages(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        limit=limit,
    )
    if not result.get("success") and result.get("error"):
        return JSONResponse(
            status_code=status.HTTP_200_OK,  # Return structured response with error message
            content=result,
        )

    # Convert village Pydantic models to dict if needed
    if "villages" in result:
        result["villages"] = [
            v.model_dump() if hasattr(v, "model_dump") else v
            for v in result["villages"]
        ]

    return JSONResponse(content=result)
