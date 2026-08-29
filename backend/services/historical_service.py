"""
CLIMORA Historical Landslide Service — Interface Stub
======================================================
Service interface for automated historical landslide inventory lookups.

CURRENT STATUS: UNAVAILABLE
    No open, queryable REST API for historical landslide events exists for
    Northeast India that supports real-time point queries (as of August 2026):

    - NASA COOLR / Global Landslide Catalog (GLC):
        Data available as bulk CSV / Shapefile download from NASA Earthdata.
        No real-time point-query REST API.
        Coverage: Global, but sparse for NE India specifically.
        URL: https://landslides.nasa.gov/

    - USGS ScienceBase landslide inventory:
        Primarily US-focused. Not applicable for NER India.

    - GSI (Geological Survey of India):
        Has a National Landslide Susceptibility Mapping programme.
        Data is not currently available via an open programmatic API.

    - NESAC (North Eastern Space Applications Centre):
        Maintains NER-specific landslide inventories.
        Not publicly accessible via open REST API.

CRITICAL — DO NOT FABRICATE HISTORICAL DATA:
    historical_landslide_count and days_since_previous_event must NEVER be
    derived from the synthetic training CSV (that data is not a real event log).
    They must NEVER be randomly generated.
    These fields require manual entry until a real historical inventory API is
    integrated.

Future integration path:
    Option 1: Download NASA GLC CSV → load into a PostGIS/SQLite database →
              query by spatial proximity at runtime.
    Option 2: When GSI/NESAC open APIs become available, integrate directly.
    Option 3: CLIMORA community reporting module (future task).
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

logger = logging.getLogger("CLIMORA.historical_service")

UNAVAILABILITY_REASON_COUNT = (
    "Historical landslide count requires a queryable landslide inventory for Northeast India. "
    "No open point-query API is currently available. NASA GLC data exists as bulk downloads only. "
    "Please enter a value manually. "
    "Future integration: NASA COOLR/GLC spatial database or GSI/NESAC inventory."
)

UNAVAILABILITY_REASON_DAYS = (
    "Days since previous landslide event requires a queryable event inventory. "
    "No real-time point-query API is currently available for NE India. "
    "Please enter a value manually (use -1 if no previous event is known). "
    "Future integration: NASA COOLR/GLC spatial database or GSI/NESAC inventory."
)


def get_historical_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Retrieve historical landslide statistics for the given coordinates.

    CURRENTLY RETURNS UNAVAILABLE — no real inventory API is connected.

    Parameters:
        latitude:  WGS-84 decimal degrees
        longitude: WGS-84 decimal degrees

    Returns:
        dict with historical_landslide_count and days_since_previous_event,
        both marked as unavailable.
    """
    logger.debug(
        "Historical data requested for (%.4f, %.4f) — returning UNAVAILABLE (no real source connected)",
        latitude, longitude
    )
    retrieved_at = datetime.now(timezone.utc).isoformat()

    def _unavail(reason: str) -> Dict[str, Any]:
        return {
            "value": None,
            "available": False,
            "source": None,
            "retrieved_at": None,
            "unit": None,
            "note": reason,
        }

    return {
        "success": False,
        "retrieved_at": retrieved_at,
        "historical_landslide_count": _unavail(UNAVAILABILITY_REASON_COUNT),
        "days_since_previous_event": _unavail(UNAVAILABILITY_REASON_DAYS),
        "future_sources": [
            "NASA Cooperative Open Online Landslide Repository (COOLR) — https://landslides.nasa.gov/",
            "GSI National Landslide Susceptibility Mapping programme",
            "NESAC Northeast India landslide inventory",
        ],
    }
