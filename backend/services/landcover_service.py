"""
CLIMORA Land Cover Service — Interface Stub
============================================
Service interface for automated land cover classification retrieval.

CURRENT STATUS: UNAVAILABLE
    No free, real-time, point-query REST API for land cover classification
    exists without registration/credentials (as of August 2026):

    - Copernicus / Sentinel Hub: Requires registration + API credentials
    - NASA AppEEARS / MODIS MCD12Q1: Requires NASA Earthdata Login
    - Google Earth Engine (GEE): Requires Google account + GEE project

    This module defines the correct interface so that a real integration can
    be plugged in without modifying the orchestrator (environmental_service.py)
    or the API response schema.

IMPORTANT — NO FAKE DATA:
    This service NEVER returns a randomly or synthetically generated land cover.
    The 'value' field is always None until a real data source is connected.
    The frontend MUST require manual selection for this field.

Future integration:
    Preferred source: ESA WorldCover 10 m (freely available via Copernicus CDSE)
    Method: Sentinel Hub Statistics API or STAC pixel-value query
    Expected classes: Tree Cover, Shrubland, Grassland, Cropland, Built-up,
                      Bare/Sparse Vegetation, Permanent Water, Mangroves, …
    Mapping required: ESA WorldCover → CLIMORA VALID_LAND_COVERS:
        Forest, Cropland, Grassland, Shrubland, Barren, Built-up
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger("CLIMORA.landcover_service")

# ESA WorldCover → CLIMORA land cover mapping (for future use)
# ESA class name → CLIMORA class
ESA_WORLDCOVER_MAPPING = {
    "Tree cover":                 "Forest",
    "Shrubland":                  "Shrubland",
    "Grassland":                  "Grassland",
    "Cropland":                   "Cropland",
    "Built-up":                   "Built-up",
    "Bare / sparse vegetation":   "Barren",
    "Snow and ice":               "Barren",
    "Permanent water bodies":     None,       # No CLIMORA equivalent — flag separately
    "Herbaceous wetland":         "Grassland",
    "Mangroves":                  "Forest",
    "Moss and lichen":            "Barren",
}

UNAVAILABILITY_REASON = (
    "Land cover classification requires Copernicus Sentinel Hub or NASA AppEEARS API "
    "credentials (registration required). No unauthenticated point-query API is currently "
    "available. Please select land cover manually. "
    "Future integration: ESA WorldCover 10 m via Copernicus Data Space Ecosystem (CDSE)."
)


def get_land_cover(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Retrieve land cover classification for the given coordinates.

    CURRENTLY RETURNS UNAVAILABLE — integration with a real data source is
    required before this function can return real values.

    Parameters:
        latitude:  WGS-84 decimal degrees
        longitude: WGS-84 decimal degrees

    Returns:
        dict with keys:
            land_cover.value (None — always unavailable until integrated)
            land_cover.available (False)
            land_cover.source (None)
            land_cover.reason (str — human-readable explanation)
    """
    logger.debug(
        "Land cover requested for (%.4f, %.4f) — returning UNAVAILABLE (no real source connected)",
        latitude, longitude
    )
    unavail = {
        "value": None,
        "available": False,
        "source": None,
        "retrieved_at": None,
        "unit": None,
        "note": UNAVAILABILITY_REASON,
    }
    return {
        "success": False,
        "land_cover": unavail,
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "reason": UNAVAILABILITY_REASON,
        "future_source": "ESA WorldCover 10 m via Copernicus CDSE / Sentinel Hub",
        "mapping_ready": ESA_WORLDCOVER_MAPPING,
    }
