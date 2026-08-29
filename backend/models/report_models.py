"""
CLIMORA Community Reporting & Remote Village Data Models
========================================================
Pydantic v2 data models for:
- Community incident reports
- Report status updates (Authority workflow)
- Nearby alerts query & response
- Remote village discovery
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class IncidentType(str, Enum):
    ROAD_BLOCKAGE = "ROAD_BLOCKAGE"
    LANDSLIDE = "LANDSLIDE"
    ROCKFALL = "ROCKFALL"
    SLOPE_CRACK = "SLOPE_CRACK"
    SOIL_MOVEMENT = "SOIL_MOVEMENT"
    FLOOD = "FLOOD"
    INFRASTRUCTURE_DAMAGE = "INFRASTRUCTURE_DAMAGE"
    OTHER = "OTHER"


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class VerificationStatus(str, Enum):
    UNVERIFIED = "UNVERIFIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    RESOLVED = "RESOLVED"


class ReporterRole(str, Enum):
    CITIZEN = "CITIZEN"
    LOCAL_RESIDENT = "LOCAL_RESIDENT"
    COMMUTER = "COMMUTER"
    COMMUNITY_VOLUNTEER = "COMMUNITY_VOLUNTEER"
    EMERGENCY_RESPONDER = "EMERGENCY_RESPONDER"
    ANONYMOUS = "ANONYMOUS"


class ReportCreate(BaseModel):
    """
    Payload for creating a new community incident report.
    Reports created by citizens ALWAYS default to UNVERIFIED.
    """
    latitude: float = Field(
        ..., ge=-90.0, le=90.0,
        description="GPS Latitude in decimal degrees (WGS84)",
        examples=[27.3389]
    )
    longitude: float = Field(
        ..., ge=-180.0, le=180.0,
        description="GPS Longitude in decimal degrees (WGS84)",
        examples=[88.6065]
    )
    incident_type: IncidentType = Field(
        ..., description="Categorized incident or hazard type"
    )
    severity: SeverityLevel = Field(
        ..., description="Observed severity of the hazard"
    )
    description: str = Field(
        ..., min_length=5, max_length=2000,
        description="Short description of the situation"
    )
    road_name: Optional[str] = Field(
        None, max_length=255,
        description="Road, highway (e.g. NH-10), or landmark name if known"
    )
    location_name: Optional[str] = Field(
        None, max_length=255,
        description="Village, town, or locality name if known"
    )
    photo_url: Optional[str] = Field(
        None, description="URL or relative path to uploaded photo"
    )
    video_url: Optional[str] = Field(
        None, description="URL or relative path to uploaded video (optional)"
    )
    reporter_name: Optional[str] = Field(
        None, max_length=100,
        description="Name or handle of reporter (optional for privacy)"
    )
    reporter_role: ReporterRole = Field(
        default=ReporterRole.CITIZEN,
        description="Self-identified role of the reporter"
    )
    contact_info: Optional[str] = Field(
        None, max_length=150,
        description="Optional phone/email for emergency coordination"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 27.3389,
                "longitude": 88.6065,
                "incident_type": "ROAD_BLOCKAGE",
                "severity": "HIGH",
                "description": "Mudslide blocking both lanes near Mile 14 on Gangtok-Nathula Highway.",
                "road_name": "Gangtok-Nathula Highway (NH-310)",
                "location_name": "Mile 14, East Sikkim",
                "reporter_name": "Tashi Dorjee",
                "reporter_role": "LOCAL_RESIDENT"
            }
        }
    }


class StatusUpdate(BaseModel):
    """
    Authority payload for updating report verification lifecycle.
    Development note: Requires full RBAC/Auth in production deployment.
    """
    status: VerificationStatus = Field(
        ..., description="Updated verification status"
    )
    authority_notes: Optional[str] = Field(
        None, max_length=2000,
        description="Official assessment or action notes from authorities"
    )
    reviewer_name: Optional[str] = Field(
        None, max_length=100,
        description="Name or ID of reviewing authority (dev audit metadata)"
    )
    action_taken: Optional[str] = Field(
        None, max_length=500,
        description="Action initiated (e.g., PWD crew dispatched, road cleared)"
    )


class ReportResponse(BaseModel):
    """
    Standard community incident report representation.
    """
    id: str = Field(..., description="Unique report identifier")
    created_at: str = Field(..., description="ISO 8601 UTC timestamp of creation")
    updated_at: str = Field(..., description="ISO 8601 UTC timestamp of last update")
    latitude: float
    longitude: float
    incident_type: IncidentType
    severity: SeverityLevel
    description: str
    road_name: Optional[str] = None
    location_name: Optional[str] = None
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    reporter_role: ReporterRole = ReporterRole.CITIZEN
    reporter_name: Optional[str] = None
    
    # Verification details
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    is_verified: bool = False
    verified_at: Optional[str] = None
    verified_by: Optional[str] = None
    authority_notes: Optional[str] = None
    action_taken: Optional[str] = None

    # Proximity helper (computed on nearby queries)
    distance_km: Optional[float] = None


class NearbyReportsQuery(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    radius_km: float = Field(default=25.0, ge=0.5, le=200.0)
    status: Optional[VerificationStatus] = None
    incident_type: Optional[IncidentType] = None


class NearbyAlert(BaseModel):
    """
    Structured alert regarding a nearby hazard for user decision-support.
    """
    alert_id: str
    report_id: str
    incident_type: IncidentType
    severity: SeverityLevel
    verification_status: VerificationStatus
    is_verified: bool
    affected_location: str
    road_name: Optional[str] = None
    latitude: float
    longitude: float
    distance_km: float
    reported_at: str
    headline: str
    advisory: str
    caution_notice: str


class RoadConnectivityStatus(str, Enum):
    NORMAL = "NORMAL"
    POSSIBLE_ISSUE = "POSSIBLE_ISSUE"  # Based on unverified community reports
    BLOCKED = "BLOCKED"                # Confirmed by verified authority report
    UNKNOWN = "UNKNOWN"


class RemoteVillage(BaseModel):
    """
    Remote village / settlement data model.
    Data is obtained from real geospatial indices (e.g. OpenStreetMap Overpass).
    """
    id: str
    name: str
    place_type: str = "village"  # village, hamlet, town, isolated_dwelling
    latitude: float
    longitude: float
    distance_km: float
    district: Optional[str] = None
    state: Optional[str] = None
    population: Optional[int] = None
    road_connectivity_status: RoadConnectivityStatus = RoadConnectivityStatus.NORMAL
    connectivity_notes: str
    nearby_reports_count: int = 0
    data_source: str = "OpenStreetMap (Overpass API)"
