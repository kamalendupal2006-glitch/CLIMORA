"""
CLIMORA Community Reports REST Router
======================================
FastAPI endpoints for:
- Creating community incident reports (UNVERIFIED default)
- Uploading photos/media attachments
- Querying nearby reports & user alerts
- Authority status updates & verification workflow
- Serving uploaded media files securely
"""

import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse

from models.report_models import (
    IncidentType,
    NearbyAlert,
    ReportCreate,
    ReportResponse,
    ReporterRole,
    SeverityLevel,
    StatusUpdate,
    VerificationStatus,
)
from services.community_report_service import UPLOADS_DIR, report_service

router = APIRouter(tags=["Community Reporting & Alerts"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB


@router.post(
    "/api/reports",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a community incident report",
    description=(
        "Submit a citizen observation for a road blockage, landslide, rockfall, "
        "slope crack, flood, or damaged infrastructure. All citizen submissions "
        "are recorded with status UNVERIFIED until reviewed by authorities."
    ),
)
async def create_report(payload: ReportCreate) -> ReportResponse:
    try:
        report = report_service.create_report(payload)
        return report
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save incident report: {exc}",
        )


@router.post(
    "/api/reports/upload",
    summary="Upload media attachment (photo/video)",
    description="Upload a photo or short video supporting a community report.",
)
async def upload_attachment(file: UploadFile = File(...)) -> JSONResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected for upload.",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {sorted(list(ALLOWED_EXTENSIONS))}",
        )

    # Generate collision-safe filename
    safe_filename = f"{uuid.uuid4().hex[:16]}{ext}"
    dest_path = UPLOADS_DIR / safe_filename

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Check size limit
        file_size = dest_path.stat().st_size
        if file_size > MAX_FILE_SIZE_BYTES:
            dest_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024*1024)} MB.",
            )

        return JSONResponse(
            content={
                "success": True,
                "filename": safe_filename,
                "url": f"/uploads/{safe_filename}",
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded attachment.",
        )


@router.get(
    "/uploads/{filename}",
    summary="Retrieve uploaded media attachment",
    description="Serves uploaded photos and videos.",
)
async def get_uploaded_file(filename: str):
    # Sanitize filename
    clean_filename = Path(filename).name
    file_path = UPLOADS_DIR / clean_filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file not found.",
        )
    return FileResponse(file_path)


@router.get(
    "/api/reports",
    summary="List community reports with filters",
    description="Retrieve reports with optional filters for verification status, incident type, and severity.",
)
async def list_reports(
    status: Optional[VerificationStatus] = Query(None, description="Filter by verification status"),
    incident_type: Optional[IncidentType] = Query(None, description="Filter by incident type"),
    severity: Optional[SeverityLevel] = Query(None, description="Filter by severity level"),
    search: Optional[str] = Query(None, description="Search description, road, or location"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> JSONResponse:
    reports, total = report_service.list_reports(
        status=status,
        incident_type=incident_type,
        severity=severity,
        search=search,
        limit=limit,
        offset=offset,
    )
    return JSONResponse(
        content={
            "success": True,
            "total": total,
            "count": len(reports),
            "reports": [r.model_dump() for r in reports],
        }
    )


@router.get(
    "/api/reports/nearby",
    summary="Retrieve reports near GPS coordinates",
    description="Get incident reports within radius_km of a location, sorted by distance.",
)
async def get_nearby_reports(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(25.0, ge=0.5, le=200.0),
    status: Optional[VerificationStatus] = Query(None),
    incident_type: Optional[IncidentType] = Query(None),
) -> JSONResponse:
    reports = report_service.get_nearby_reports(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        status=status,
        incident_type=incident_type,
    )
    return JSONResponse(
        content={
            "success": True,
            "count": len(reports),
            "radius_km": radius_km,
            "center": {"latitude": latitude, "longitude": longitude},
            "reports": [r.model_dump() for r in reports],
        }
    )


@router.get(
    "/api/reports/alerts",
    summary="Get user decision-support alerts for nearby hazards",
    description=(
        "Identifies active hazards and road blockages near the user. "
        "Unverified reports are clearly tagged as UNVERIFIED with caution advisories."
    ),
)
async def get_nearby_alerts(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_km: float = Query(30.0, ge=1.0, le=150.0),
) -> JSONResponse:
    alerts = report_service.get_nearby_alerts(
        latitude=latitude, longitude=longitude, radius_km=radius_km
    )
    return JSONResponse(
        content={
            "success": True,
            "count": len(alerts),
            "radius_km": radius_km,
            "alerts": [a.model_dump() for a in alerts],
        }
    )


@router.get(
    "/api/reports/{report_id}",
    response_model=ReportResponse,
    summary="Get single report details",
)
async def get_report(report_id: str) -> ReportResponse:
    report = report_service.get_report(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found.",
        )
    return report


@router.patch(
    "/api/reports/{report_id}/status",
    response_model=ReportResponse,
    summary="Update report verification status (Authority workflow)",
    description=(
        "Allows disaster response authorities to update verification status "
        "(UNVERIFIED, UNDER_REVIEW, VERIFIED, RESOLVED) and add official notes. "
        "Development notice: Requires authentication and RBAC in production."
    ),
)
async def update_report_status(
    report_id: str, payload: StatusUpdate
) -> ReportResponse:
    updated = report_service.update_report_status(report_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found.",
        )
    return updated
