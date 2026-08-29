"""
CLIMORA Weather Service
========================
Retrieves real-time meteorological data from Open-Meteo (open-meteo.com).

Data provided:
    temperature_c         — current 2-metre air temperature (°C)
    humidity_pct          — current relative humidity at 2 m (%)
    rainfall_mm           — today's accumulated precipitation sum (mm, daily)
    soil_moisture         — latest hourly volumetric soil moisture 0–1 cm (m³/m³)

Source:       Open-Meteo  (https://open-meteo.com)
API key:      NOT REQUIRED
License:      CC BY 4.0
Coverage:     Global (including NE India / Himalayan region)
Resolution:   ~11 km (ERA5 / ECMWF-IFS hybrid), 15-minute update cycle
Soil model:   ERA5-Land (Copernicus Climate Change Service)

Cache TTL:    WEATHER_CACHE_TTL_S (15 minutes by default)

IMPORTANT — NO FAKE DATA:
    This service never returns synthetic values.
    If the API is unreachable or returns an incomplete payload, the affected
    variables are reported as unavailable with a structured error.
    The caller (environmental_service.py) decides how to surface this to the
    frontend.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from services.cache import weather_cache

logger = logging.getLogger("CLIMORA.weather_service")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Open-Meteo forecast endpoint — no authentication
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Timeout in seconds for external HTTP requests
REQUEST_TIMEOUT_S = 10.0

# Cache TTL: 15 minutes — matches Open-Meteo's data update cycle
WEATHER_CACHE_TTL_S = 900.0


# ---------------------------------------------------------------------------
# Weather data retrieval
# ---------------------------------------------------------------------------

def _build_cache_key(latitude: float, longitude: float) -> str:
    """Cache key rounded to ~1 km precision (3 decimal places ≈ 111 m)."""
    return f"weather:{latitude:.3f},{longitude:.3f}"


def get_weather_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Retrieve current weather and soil moisture data from Open-Meteo.

    Parameters:
        latitude:  WGS-84 decimal degrees
        longitude: WGS-84 decimal degrees

    Returns:
        dict with keys:
            success (bool)
            temperature_c, humidity_pct, rainfall_mm, soil_moisture (if success)
            source, retrieved_at, error (always present)

    The return dict uses a consistent 'available' flag per variable so that
    partial failures can be surfaced transparently.
    """
    cache_key = _build_cache_key(latitude, longitude)
    cached = weather_cache.get(cache_key)
    if cached is not None:
        logger.info("Weather data served from cache for (%.3f, %.3f)", latitude, longitude)
        return cached

    result = _fetch_from_open_meteo(latitude, longitude)
    if result.get("success"):
        weather_cache.set(cache_key, result, WEATHER_CACHE_TTL_S)
    return result


def _fetch_from_open_meteo(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Perform the actual HTTP request to Open-Meteo.
    Returns a structured response dict.
    """
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,rain",
        # Daily accumulated precipitation for the current day (since midnight)
        "daily": "precipitation_sum",
        # Hourly volumetric soil moisture in the top 1 cm (m³/m³, ERA5-Land)
        "hourly": "soil_moisture_0_to_1cm",
        "timezone": "auto",
        "past_days": 0,
        "forecast_days": 1,
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_S) as client:
            resp = client.get(OPEN_METEO_FORECAST_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("Open-Meteo timeout for (%.4f, %.4f)", latitude, longitude)
        return _error_response("Weather data temporarily unavailable — request timed out.")
    except httpx.HTTPStatusError as exc:
        logger.warning("Open-Meteo HTTP %d for (%.4f, %.4f)", exc.response.status_code, latitude, longitude)
        return _error_response(f"Weather service returned HTTP {exc.response.status_code}.")
    except Exception as exc:
        logger.error("Open-Meteo unexpected error: %s", exc)
        return _error_response("Weather data temporarily unavailable — unexpected error.")

    return _parse_response(data)


def _parse_response(data: dict) -> Dict[str, Any]:
    """
    Extract the required fields from an Open-Meteo forecast response.
    Each variable is individually validated so partial data is still useful.
    """
    retrieved_at = datetime.now(timezone.utc).isoformat()
    source = "Open-Meteo (ERA5-Land / ECMWF-IFS)"

    current = data.get("current", {})
    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    # ── Temperature ──────────────────────────────────────────────────────────
    temperature_c = _safe_float(current.get("temperature_2m"))

    # ── Relative Humidity ────────────────────────────────────────────────────
    humidity_pct = _safe_float(current.get("relative_humidity_2m"))

    # ── Rainfall ─────────────────────────────────────────────────────────────
    # Use today's daily precipitation_sum — the accumulated total since midnight.
    # This is more meaningful for landslide risk than the 15-minute current value.
    rainfall_mm: Optional[float] = None
    daily_precip_list = daily.get("precipitation_sum", [])
    if daily_precip_list:
        # Index 0 = today (forecast_days=1, past_days=0)
        rainfall_mm = _safe_float(daily_precip_list[0])

    # ── Soil Moisture ─────────────────────────────────────────────────────────
    # Open-Meteo returns hourly soil_moisture_0_to_1cm as m³/m³ (volumetric).
    # The CLIMORA model expects a 0.0–1.0 ratio.  m³/m³ is already in that range.
    # We use the most recent available hourly value.
    soil_moisture: Optional[float] = None
    sm_times = hourly.get("time", [])
    sm_values = hourly.get("soil_moisture_0_to_1cm", [])
    if sm_times and sm_values:
        # Find the most recent non-None value (values at future hours may be None)
        for i in range(len(sm_values) - 1, -1, -1):
            v = _safe_float(sm_values[i])
            if v is not None:
                soil_moisture = v
                break

    # ── Open-Meteo also returns model-grid elevation in the response ──────────
    # We do NOT use it here — terrain_service handles elevation separately via
    # the dedicated /v1/elevation endpoint for higher precision.

    result: Dict[str, Any] = {
        "success": True,
        "source": source,
        "retrieved_at": retrieved_at,
        "temperature_c": _var(temperature_c, source, retrieved_at, "°C"),
        "humidity_pct": _var(humidity_pct, source, retrieved_at, "%"),
        "rainfall_mm": _var(
            rainfall_mm, source, retrieved_at, "mm",
            note="Daily accumulated precipitation sum (since local midnight)"
        ),
        "soil_moisture": _var(
            soil_moisture, source, retrieved_at, "m³/m³",
            note="Volumetric soil moisture 0–1 cm depth (ERA5-Land). "
                 "Range 0.0–1.0 compatible with model input."
        ),
    }
    return result


def _safe_float(val: Any) -> Optional[float]:
    """Return float or None — never raises."""
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _var(
    value: Optional[float],
    source: str,
    retrieved_at: str,
    unit: str,
    note: str = "",
) -> Dict[str, Any]:
    """Build a consistent variable provenance dict."""
    return {
        "value": value,
        "available": value is not None,
        "source": source if value is not None else None,
        "retrieved_at": retrieved_at if value is not None else None,
        "unit": unit,
        "note": note,
    }


def _error_response(message: str) -> Dict[str, Any]:
    """Return a structured failure response that never crashes the caller."""
    unavail = {"value": None, "available": False, "source": None,
               "retrieved_at": None, "unit": None, "note": message}
    return {
        "success": False,
        "source": "Open-Meteo",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "error": message,
        "temperature_c": unavail,
        "humidity_pct": unavail,
        "rainfall_mm": unavail,
        "soil_moisture": unavail,
    }
