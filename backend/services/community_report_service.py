"""
CLIMORA Community Report Service
=================================
Handles persistence, proximity filtering, verification lifecycle, and alert
generation for citizen incident reports.

Design:
- Repository pattern: In-memory thread-safe JSON store for development.
- Abstract contract (IReportRepository) ready for PostgreSQL/PostGIS migration.
- Strict verification integrity: All new citizen reports default to UNVERIFIED.
- Zero fake reports: Stores and queries real reports submitted through the platform.
"""

import json
import math
import os
import threading
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from models.report_models import (
    IncidentType,
    NearbyAlert,
    ReportCreate,
    ReportResponse,
    ReporterRole,
    RoadConnectivityStatus,
    SeverityLevel,
    StatusUpdate,
    VerificationStatus,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
REPORTS_FILE = DATA_DIR / "community_reports.json"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points in kilometres
    using the Haversine formula.
    """
    R = 6371.0  # Earth's mean radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


class IReportRepository(ABC):
    """Abstract repository interface for report persistence."""

    @abstractmethod
    def save(self, report: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    def get_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def list_all(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def update(self, report_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def delete(self, report_id: str) -> bool:
        pass


class JsonFileReportRepository(IReportRepository):
    """
    Development-safe file-backed repository.
    Persists data to backend/data/community_reports.json with thread-safety.
    """

    def __init__(self, file_path: Path):
        self.file_path = file_path
        self._lock = threading.Lock()
        self._ensure_file()

    def _ensure_file(self):
        with self._lock:
            if not self.file_path.exists():
                self.file_path.write_text("[]", encoding="utf-8")

    def _read_all(self) -> List[Dict[str, Any]]:
        try:
            if not self.file_path.exists():
                return []
            content = self.file_path.read_text(encoding="utf-8")
            return json.loads(content) if content.strip() else []
        except Exception:
            return []

    def _write_all(self, data: List[Dict[str, Any]]):
        temp_file = self.file_path.with_suffix(".tmp")
        temp_file.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        temp_file.replace(self.file_path)

    def save(self, report: Dict[str, Any]) -> Dict[str, Any]:
        with self._lock:
            data = self._read_all()
            data.insert(0, report)  # Prepend latest
            self._write_all(data)
            return report

    def get_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read_all()
            for r in data:
                if r.get("id") == report_id:
                    return r
            return None

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            return self._read_all()

    def update(self, report_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        with self._lock:
            data = self._read_all()
            updated_report = None
            for idx, r in enumerate(data):
                if r.get("id") == report_id:
                    data[idx].update(updates)
                    updated_report = data[idx]
                    break
            if updated_report:
                self._write_all(data)
            return updated_report

    def delete(self, report_id: str) -> bool:
        with self._lock:
            data = self._read_all()
            initial_len = len(data)
            data = [r for r in data if r.get("id") != report_id]
            if len(data) < initial_len:
                self._write_all(data)
                return True
            return False


# Global repository instance
_repo: IReportRepository = JsonFileReportRepository(REPORTS_FILE)


class CommunityReportService:
    """Service layer managing community hazard reports and nearby alerts."""

    def __init__(self, repository: IReportRepository = _repo):
        self.repo = repository

    def create_report(self, payload: ReportCreate) -> ReportResponse:
        """
        Create a new community incident report.
        Rule: Every citizen report starts as UNVERIFIED.
        """
        now = datetime.now(timezone.utc).isoformat()
        report_id = f"rep_{uuid.uuid4().hex[:12]}"

        report_dict: Dict[str, Any] = {
            "id": report_id,
            "created_at": now,
            "updated_at": now,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "incident_type": payload.incident_type.value,
            "severity": payload.severity.value,
            "description": payload.description.strip(),
            "road_name": payload.road_name.strip() if payload.road_name else None,
            "location_name": payload.location_name.strip() if payload.location_name else None,
            "photo_url": payload.photo_url,
            "video_url": payload.video_url,
            "reporter_role": payload.reporter_role.value,
            "reporter_name": payload.reporter_name.strip() if payload.reporter_name else "Anonymous Reporter",
            "contact_info": payload.contact_info.strip() if payload.contact_info else None,
            # Strict verification state
            "verification_status": VerificationStatus.UNVERIFIED.value,
            "is_verified": False,
            "verified_at": None,
            "verified_by": None,
            "authority_notes": None,
            "action_taken": None,
        }

        saved = self.repo.save(report_dict)
        return ReportResponse(**saved)

    def get_report(self, report_id: str) -> Optional[ReportResponse]:
        """Fetch single report by ID."""
        data = self.repo.get_by_id(report_id)
        if not data:
            return None
        return ReportResponse(**data)

    def list_reports(
        self,
        status: Optional[VerificationStatus] = None,
        incident_type: Optional[IncidentType] = None,
        severity: Optional[SeverityLevel] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[ReportResponse], int]:
        """
        List reports with optional filters and search query.
        Returns (list_of_reports, total_count).
        """
        all_reports = self.repo.list_all()
        filtered = []

        for r in all_reports:
            if status and r.get("verification_status") != status.value:
                continue
            if incident_type and r.get("incident_type") != incident_type.value:
                continue
            if severity and r.get("severity") != severity.value:
                continue
            if search:
                q = search.lower()
                text = f"{r.get('description', '')} {r.get('road_name', '')} {r.get('location_name', '')} {r.get('incident_type', '')}".lower()
                if q not in text:
                    continue
            filtered.append(r)

        total_count = len(filtered)
        paged = filtered[offset : offset + limit]
        return [ReportResponse(**item) for item in paged], total_count

    def get_nearby_reports(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        status: Optional[VerificationStatus] = None,
        incident_type: Optional[IncidentType] = None,
    ) -> List[ReportResponse]:
        """
        Retrieve reports within radius_km of given coordinates, sorted by distance.
        """
        all_reports = self.repo.list_all()
        nearby = []

        for r in all_reports:
            if status and r.get("verification_status") != status.value:
                continue
            if incident_type and r.get("incident_type") != incident_type.value:
                continue

            r_lat = r.get("latitude")
            r_lon = r.get("longitude")
            if r_lat is None or r_lon is None:
                continue

            dist = haversine_distance(latitude, longitude, r_lat, r_lon)
            if dist <= radius_km:
                item = dict(r)
                item["distance_km"] = dist
                nearby.append(item)

        nearby.sort(key=lambda x: x["distance_km"])
        return [ReportResponse(**item) for item in nearby]

    def update_report_status(
        self, report_id: str, update_payload: StatusUpdate
    ) -> Optional[ReportResponse]:
        """
        Update verification status (Authority workflow).
        Development implementation: Records review metadata.
        """
        now = datetime.now(timezone.utc).isoformat()
        is_verified = update_payload.status == VerificationStatus.VERIFIED

        updates: Dict[str, Any] = {
            "verification_status": update_payload.status.value,
            "is_verified": is_verified,
            "updated_at": now,
        }

        if update_payload.authority_notes:
            updates["authority_notes"] = update_payload.authority_notes.strip()
        if update_payload.action_taken:
            updates["action_taken"] = update_payload.action_taken.strip()

        if is_verified:
            updates["verified_at"] = now
            updates["verified_by"] = update_payload.reviewer_name or "District Disaster Management Cell"
        elif update_payload.status == VerificationStatus.RESOLVED:
            updates["verified_by"] = update_payload.reviewer_name or "Clearance Team / Public Works"

        updated = self.repo.update(report_id, updates)
        if not updated:
            return None
        return ReportResponse(**updated)

    def get_nearby_alerts(
        self, latitude: float, longitude: float, radius_km: float = 30.0
    ) -> List[NearbyAlert]:
        """
        Generate structured user decision-support alerts for active/unresolved reports
        within radius_km of user location.
        """
        nearby_reports = self.get_nearby_reports(
            latitude=latitude, longitude=longitude, radius_km=radius_km
        )

        alerts = []
        for r in nearby_reports:
            # Skip resolved reports for active alerts
            if r.verification_status == VerificationStatus.RESOLVED:
                continue

            loc_str = r.location_name or r.road_name or f"Coords ({r.latitude:.3f}, {r.longitude:.3f})"
            type_label = r.incident_type.value.replace("_", " ").title()

            is_verified = r.verification_status == VerificationStatus.VERIFIED

            if is_verified:
                headline = f"[OFFICIAL HAZARD CONFIRMED] {type_label} on {r.road_name or loc_str}"
                advisory = (
                    f"Official notice: {type_label} confirmed {r.distance_km} km from your current location. "
                    f"Action: {r.action_taken or 'Avoid travel on this stretch and follow local traffic diversions.'}"
                )
                caution_notice = (
                    "This hazard has been verified by disaster management authorities. "
                    "Emergency clearance / response teams are coordinating at this site."
                )
            else:
                headline = f"[UNVERIFIED CITIZEN REPORT] {type_label} reported near {loc_str}"
                advisory = (
                    f"A citizen observation of {type_label.lower()} was submitted {r.distance_km} km away. "
                    f"Status: UNVERIFIED. Description: \"{r.description}\""
                )
                caution_notice = (
                    "This is an unverified community report and has not yet been independently verified by "
                    "authorities. Do not assume road conditions are fully blocked or clear. Exercise caution."
                )

            alert = NearbyAlert(
                alert_id=f"alt_{r.id}",
                report_id=r.id,
                incident_type=r.incident_type,
                severity=r.severity,
                verification_status=r.verification_status,
                is_verified=is_verified,
                affected_location=loc_str,
                road_name=r.road_name,
                latitude=r.latitude,
                longitude=r.longitude,
                distance_km=r.distance_km or 0.0,
                reported_at=r.created_at,
                headline=headline,
                advisory=advisory,
                caution_notice=caution_notice,
            )
            alerts.append(alert)

        return alerts


# Singleton service instance
report_service = CommunityReportService()
