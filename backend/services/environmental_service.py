"""
CLIMORA Environmental Orchestration Service
============================================
Coordinates all data-acquisition services and assembles the complete
environmental feature object for a given GPS coordinate.

Flow:
    latitude + longitude
         ↓
    geocoding_service → state_region (Nominatim / bbox)
    weather_service   → temperature, humidity, rainfall, soil_moisture
    terrain_service   → elevation, slope, aspect, curvature
    landcover_service → land_cover (UNAVAILABLE — manual required)
    historical_service→ historical_landslide_count, days_since_previous_event
                        (UNAVAILABLE — manual required)
         ↓
    Environmental feature object with provenance and data quality summary
         ↓
    FastAPI /api/environmental-data response

All services are called synchronously in this implementation. Each service
handles its own errors and returns a structured result — the orchestrator
never silently discards failures.

IMPORTANT — NO FAKE DATA:
    The orchestrator never substitutes, fills in, or fabricates values for
    unavailable features. If a service returns unavailable, that field is
    reported as unavailable in the response. Period.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from services.weather_service import get_weather_data
from services.terrain_service import get_terrain_data
from services.geocoding_service import get_state_for_coordinates, is_in_india_bbox
from services.landcover_service import get_land_cover
from services.historical_service import get_historical_data

logger = logging.getLogger("CLIMORA.environmental_service")

# Model disclaimer — preserves existing prototype disclaimer from config.py
PROTOTYPE_DISCLAIMER = (
    "CLIMORA predictions and recommendations are informational early-warning indicators "
    "developed for prototype/demonstration purposes. Official disaster-management authorities "
    "remain solely responsible for emergency decisions and evacuation orders."
)

# Features that require manual input in the current implementation
MANUAL_REQUIRED_FEATURES = ["land_cover", "historical_landslide_count", "days_since_previous_event"]


def get_environmental_data(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Retrieve all available real-world environmental data for a coordinate.

    Parameters:
        latitude:  WGS-84 decimal degrees (-90 to 90)
        longitude: WGS-84 decimal degrees (-180 to 180)

    Returns:
        Structured dict with:
            success (bool)
            location (geocoding result + coordinates)
            environment (dict of 14 model features, each with value + provenance)
            data_quality (summary of what is available / missing)
            validation_notes (list of limitation strings)
            disclaimer (prototype disclaimer)
            retrieved_at (ISO 8601 timestamp)
    """
    retrieved_at = datetime.now(timezone.utc).isoformat()

    # ── Fast geographic pre-check ──────────────────────────────────────────
    if not is_in_india_bbox(latitude, longitude):
        return {
            "success": False,
            "retrieved_at": retrieved_at,
            "error": (
                "CLIMORA currently focuses on India's North Eastern Region. "
                "The provided coordinates appear to be outside India."
            ),
        }

    # ── 1. Geocoding ────────────────────────────────────────────────────────
    logger.info("Fetching geocoding for (%.4f, %.4f)", latitude, longitude)
    geocoding = get_state_for_coordinates(latitude, longitude)

    if not geocoding.get("success") and geocoding.get("error"):
        # Outside supported region — return early with a clear message
        return {
            "success": False,
            "retrieved_at": retrieved_at,
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "detected_state": geocoding.get("detected_state"),
                "geocoding_source": geocoding.get("geocoding_source"),
            },
            "error": geocoding.get("error"),
        }

    state_region = geocoding.get("state_region")
    validation_notes: List[str] = []
    if geocoding.get("validation_note"):
        validation_notes.append(geocoding["validation_note"])

    # ── 2. Weather + Soil Moisture ─────────────────────────────────────────
    logger.info("Fetching weather data for (%.4f, %.4f)", latitude, longitude)
    weather = get_weather_data(latitude, longitude)

    # ── 3. Terrain ─────────────────────────────────────────────────────────
    logger.info("Fetching terrain data for (%.4f, %.4f)", latitude, longitude)
    terrain = get_terrain_data(latitude, longitude)

    # ── 4. Land Cover (UNAVAILABLE stub) ───────────────────────────────────
    landcover = get_land_cover(latitude, longitude)

    # ── 5. Historical (UNAVAILABLE stub) ───────────────────────────────────
    historical = get_historical_data(latitude, longitude)

    # ── Assemble the environment feature map ──────────────────────────────
    environment: Dict[str, Any] = {
        "latitude": {
            "value": latitude,
            "available": True,
            "source": "GPS (browser)",
            "retrieved_at": retrieved_at,
            "unit": "decimal degrees",
            "note": "",
        },
        "longitude": {
            "value": longitude,
            "available": True,
            "source": "GPS (browser)",
            "retrieved_at": retrieved_at,
            "unit": "decimal degrees",
            "note": "",
        },
        "state_region": {
            "value": state_region,
            "available": state_region is not None,
            "source": f"Nominatim OSM / bounding-box fallback ({geocoding.get('geocoding_source', 'unknown')})",
            "retrieved_at": geocoding.get("retrieved_at"),
            "unit": None,
            "note": geocoding.get("validation_note") or "",
        },
        # Terrain
        "elevation_m": terrain.get("elevation_m", _unavail("Terrain service unavailable")),
        "slope_deg": terrain.get("slope_deg", _unavail("Terrain service unavailable")),
        "aspect_deg": terrain.get("aspect_deg", _unavail("Terrain service unavailable")),
        "curvature": terrain.get("curvature", _unavail("Terrain service unavailable")),
        # Weather
        "temperature_c": weather.get("temperature_c", _unavail("Weather service unavailable")),
        "humidity_pct": weather.get("humidity_pct", _unavail("Weather service unavailable")),
        "rainfall_mm": weather.get("rainfall_mm", _unavail("Weather service unavailable")),
        "soil_moisture": weather.get("soil_moisture", _unavail("Weather service unavailable")),
        # Manual required
        "land_cover": landcover.get("land_cover", _unavail("Land cover: no API available")),
        "historical_landslide_count": historical.get(
            "historical_landslide_count", _unavail("Historical data: no API available")
        ),
        "days_since_previous_event": historical.get(
            "days_since_previous_event", _unavail("Historical data: no API available")
        ),
    }

    # ── Data quality summary ───────────────────────────────────────────────
    all_features = list(environment.keys())
    available_features = [k for k in all_features if environment[k].get("available")]
    unavailable_features = [k for k in all_features if not environment[k].get("available")]
    manual_required = [k for k in MANUAL_REQUIRED_FEATURES if not environment[k].get("available")]

    # Can the prediction proceed? Requires all 14 model inputs.
    # The 3 manual fields can't be auto-filled; user must provide them.
    auto_fields_ok = all(
        environment[k].get("available")
        for k in all_features
        if k not in MANUAL_REQUIRED_FEATURES
    )

    data_quality = {
        "total_features": len(all_features),
        "auto_retrieved": len(available_features),
        "manual_required": len(manual_required),
        "unavailable_due_to_errors": len(
            [k for k in unavailable_features if k not in MANUAL_REQUIRED_FEATURES]
        ),
        "auto_retrieval_complete": auto_fields_ok,
        "can_predict_with_manual_inputs": auto_fields_ok,
        "manual_required_fields": manual_required,
        "unavailable_fields": [
            k for k in unavailable_features if k not in MANUAL_REQUIRED_FEATURES
        ],
    }

    return {
        "success": True,
        "retrieved_at": retrieved_at,
        "location": {
            "latitude": latitude,
            "longitude": longitude,
            "state_region": state_region,
            "detected_state": geocoding.get("detected_state"),
            "geocoding_source": geocoding.get("geocoding_source"),
        },
        "environment": environment,
        "data_quality": data_quality,
        "validation_notes": validation_notes,
        "disclaimer": PROTOTYPE_DISCLAIMER,
    }


def _unavail(reason: str) -> Dict[str, Any]:
    """Return a consistent unavailable variable placeholder."""
    return {
        "value": None,
        "available": False,
        "source": None,
        "retrieved_at": None,
        "unit": None,
        "note": reason,
    }
