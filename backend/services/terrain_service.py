"""
CLIMORA Terrain Service
========================
Retrieves elevation from Open-Meteo and derives slope, aspect, and curvature
from a 3×3 grid of neighbouring elevation points using the Horn (1981)
finite-difference method.

Data provided:
    elevation_m   — elevation at the target point (metres, AMSL)
    slope_deg     — terrain slope angle (°), derived from 3×3 DEM grid
    aspect_deg    — slope aspect (°, 0=North), derived from 3×3 DEM grid
    curvature     — plan curvature, dimensionless, derived from 3×3 DEM grid

Source:       Open-Meteo /v1/elevation (https://open-meteo.com/en/docs/elevation-api)
Underlying DEM: Copernicus GLO-90 (90 m resolution globally)
API key:      NOT REQUIRED
License:      CC BY 4.0
Coverage:     Global (including NE India / Himalayan region)
Resolution:   ~90 m (Copernicus GLO-90)

IMPORTANT — WHAT THIS SERVICE DOES NOT PROVIDE:
    Open-Meteo /v1/elevation provides ONLY elevation values.
    Slope, aspect, and curvature are NOT returned by the API.
    They are computed here using standard GIS finite-difference formulae
    applied to a 3×3 grid of elevation points centred on the target.
    This is mathematically equivalent to how GIS software computes terrain
    derivatives from a DEM raster.

    Limitations of the 90 m resolution:
      - May underestimate local slopes on steep, narrow ridges
      - Curvature values are approximate at this resolution
      - All derived values are clearly labelled with their source and resolution

Cache TTL:    TERRAIN_CACHE_TTL_S (24 hours — terrain is static)

IMPORTANT — NO FAKE DATA:
    This service never returns synthetic or randomly generated values.
    If the elevation API fails, all terrain variables are returned as
    unavailable with a structured error.
"""

import logging
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import httpx

from services.cache import terrain_cache

logger = logging.getLogger("CLIMORA.terrain_service")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
REQUEST_TIMEOUT_S = 15.0

# Cache TTL: 24 hours — terrain features are static at human timescales
TERRAIN_CACHE_TTL_S = 86400.0

# Grid spacing in decimal degrees for the 3×3 neighbourhood.
# At mid-latitudes ≈25°N, 0.001° ≈ 111 m latitude, 100 m longitude.
# We use 0.001° to match Copernicus GLO-90 ~90m grid spacing.
GRID_DELTA_DEG = 0.001


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def get_terrain_data(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Retrieve elevation and derive slope, aspect, curvature for a location.

    Parameters:
        latitude:  WGS-84 decimal degrees
        longitude: WGS-84 decimal degrees

    Returns:
        dict with keys: success, elevation_m, slope_deg, aspect_deg,
                        curvature, source, retrieved_at, error (on failure)
    """
    cache_key = f"terrain:{latitude:.4f},{longitude:.4f}"
    cached = terrain_cache.get(cache_key)
    if cached is not None:
        logger.info("Terrain data served from cache for (%.4f, %.4f)", latitude, longitude)
        return cached

    result = _fetch_and_derive(latitude, longitude)
    if result.get("success"):
        terrain_cache.set(cache_key, result, TERRAIN_CACHE_TTL_S)
    return result


# ---------------------------------------------------------------------------
# Internal implementation
# ---------------------------------------------------------------------------

def _build_grid_coords(lat: float, lon: float) -> List[Tuple[float, float]]:
    """
    Build a 3×3 grid of (latitude, longitude) pairs centred on (lat, lon).
    Grid order (row-major, north-up):
        (0,0)=NW  (0,1)=N   (0,2)=NE
        (1,0)=W   (1,1)=C   (1,2)=E     ← centre = target point
        (2,0)=SW  (2,1)=S   (2,2)=SE

    Returns a flat list of 9 coordinate pairs.
    """
    d = GRID_DELTA_DEG
    return [
        (lat + d,  lon - d),  # NW
        (lat + d,  lon    ),  # N
        (lat + d,  lon + d),  # NE
        (lat,      lon - d),  # W
        (lat,      lon    ),  # C  ← target
        (lat,      lon + d),  # E
        (lat - d,  lon - d),  # SW
        (lat - d,  lon    ),  # S
        (lat - d,  lon + d),  # SE
    ]


def _fetch_elevations(coords: List[Tuple[float, float]]) -> Optional[List[Optional[float]]]:
    """
    Batch-query the Open-Meteo elevation API for up to 100 coordinate pairs.
    Returns a list of float elevations in the same order as coords,
    or None if the request fails entirely.
    """
    lats = [f"{c[0]:.6f}" for c in coords]
    lons = [f"{c[1]:.6f}" for c in coords]

    params = {
        "latitude": ",".join(lats),
        "longitude": ",".join(lons),
    }

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_S) as client:
            resp = client.get(OPEN_METEO_ELEVATION_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("Open-Meteo elevation timeout")
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("Open-Meteo elevation HTTP %d", exc.response.status_code)
        return None
    except Exception as exc:
        logger.error("Open-Meteo elevation unexpected error: %s", exc)
        return None

    elevations = data.get("elevation", [])
    if len(elevations) != len(coords):
        logger.warning(
            "Elevation API returned %d values, expected %d",
            len(elevations), len(coords)
        )
        return None

    return [float(e) if e is not None else None for e in elevations]


def _compute_terrain_derivatives(
    elev: List[Optional[float]], cell_size_m: float
) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Compute slope, aspect, and plan curvature from a 3×3 elevation grid
    using the Horn (1981) finite-difference method.

    Grid indexing (elev list, 9 elements):
        0=NW  1=N   2=NE
        3=W   4=C   5=E
        6=SW  7=S   8=SE

    Parameters:
        elev:        9 elevation values (metres), may contain None on error
        cell_size_m: cell size in metres (approximate)

    Returns:
        (slope_deg, aspect_deg, curvature) — any may be None if computation
        fails due to missing elevation values.

    References:
        Horn, B.K.P. (1981). Hill shading and the reflectance map.
        Proceedings of the IEEE, 69(1), 14–47.
        ESRI (2023). How slope works. ArcGIS Pro documentation.
    """
    # Require all 9 cells for a valid result
    if None in elev or len(elev) != 9:
        return None, None, None

    # Unpack into named variables matching standard GIS notation
    nw, n, ne, w, c, e, sw, s, se = elev  # type: ignore[misc]

    # ── Rate of change in the X (east–west) direction ─────────────────────
    # dz/dx = ((ne + 2e + se) − (nw + 2w + sw)) / (8 × cell_size)
    dzdx = ((ne + 2 * e + se) - (nw + 2 * w + sw)) / (8 * cell_size_m)

    # ── Rate of change in the Y (north–south) direction ───────────────────
    # dz/dy = ((nw + 2n + ne) − (sw + 2s + se)) / (8 × cell_size)
    dzdy = ((nw + 2 * n + ne) - (sw + 2 * s + se)) / (8 * cell_size_m)

    # ── Slope ─────────────────────────────────────────────────────────────
    rise_run = math.sqrt(dzdx ** 2 + dzdy ** 2)
    slope_deg = round(math.degrees(math.atan(rise_run)), 2)

    # ── Aspect ────────────────────────────────────────────────────────────
    # Aspect measured clockwise from North (0° = North, 90° = East, …)
    if abs(dzdx) < 1e-10 and abs(dzdy) < 1e-10:
        # Flat surface — aspect is undefined; use 0 (North) as convention
        aspect_deg = 0.0
    else:
        # math.atan2 returns angle from East axis; convert to compass bearing
        aspect_rad = math.atan2(dzdy, -dzdx)
        aspect_deg = math.degrees(aspect_rad)
        if aspect_deg < 0:
            aspect_deg += 360.0
        aspect_deg = round(aspect_deg, 2)

    # ── Plan Curvature (simplified) ────────────────────────────────────────
    # Approximation of the second derivative of elevation perpendicular to
    # the direction of maximum gradient.  Positive = concave, negative = convex.
    # Formula: curvature = -(d²z/dx² + d²z/dy²) / (cell_size²)
    # Using centred finite differences:
    #   d²z/dx² ≈ (w − 2c + e) / cell_size²
    #   d²z/dy² ≈ (n − 2c + s) / cell_size²
    d2zdx2 = (w - 2 * c + e) / (cell_size_m ** 2)
    d2zdy2 = (n - 2 * c + s) / (cell_size_m ** 2)
    # Scale to a ±5 range compatible with the model's FEATURE_RANGES curvature
    curvature_raw = -(d2zdx2 + d2zdy2)
    # Clamp to model acceptable range [-5.0, 5.0]
    curvature = round(max(-5.0, min(5.0, curvature_raw * 1e4)), 4)

    return slope_deg, aspect_deg, curvature


def _metres_per_degree_lat(latitude: float) -> float:
    """
    Approximate metres per degree of latitude at the given latitude.
    Uses WGS-84 ellipsoid approximation.
    """
    lat_rad = math.radians(latitude)
    return 111132.954 - 559.822 * math.cos(2 * lat_rad) + 1.175 * math.cos(4 * lat_rad)


def _metres_per_degree_lon(latitude: float) -> float:
    """
    Approximate metres per degree of longitude at the given latitude.
    """
    lat_rad = math.radians(latitude)
    return 111412.84 * math.cos(lat_rad) - 93.5 * math.cos(3 * lat_rad)


def _fetch_and_derive(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch 3×3 elevation grid and derive terrain parameters.
    """
    retrieved_at = datetime.now(timezone.utc).isoformat()
    source = "Open-Meteo / Copernicus GLO-90 DEM (90 m)"
    derivative_source = "Derived via Horn (1981) finite-difference method on 3×3 elevation grid"

    coords = _build_grid_coords(latitude, longitude)
    elevations = _fetch_elevations(coords)

    if elevations is None:
        return _error_response("Terrain data temporarily unavailable — elevation API did not respond.")

    # The centre cell [4] is the target point's elevation
    target_elevation = elevations[4]
    if target_elevation is None:
        return _error_response("Elevation value missing for target coordinate.")

    # Cell size in metres (use average of lat and lon cell sizes at this location)
    m_per_deg_lat = _metres_per_degree_lat(latitude)
    m_per_deg_lon = _metres_per_degree_lon(latitude)
    cell_size_m = (m_per_deg_lat + m_per_deg_lon) / 2.0 * GRID_DELTA_DEG

    slope_deg, aspect_deg, curvature = _compute_terrain_derivatives(elevations, cell_size_m)

    def _var(value: Optional[float], src: str, unit: str, note: str = "") -> Dict[str, Any]:
        return {
            "value": value,
            "available": value is not None,
            "source": src if value is not None else None,
            "retrieved_at": retrieved_at if value is not None else None,
            "unit": unit,
            "note": note,
        }

    return {
        "success": True,
        "source": source,
        "retrieved_at": retrieved_at,
        "elevation_m": _var(
            round(float(target_elevation), 1), source, "metres AMSL",
            note="Copernicus GLO-90 DEM, 90 m resolution"
        ),
        "slope_deg": _var(
            slope_deg, derivative_source, "degrees",
            note="Derived from 3×3 elevation grid. Copernicus GLO-90 90 m resolution."
        ),
        "aspect_deg": _var(
            aspect_deg, derivative_source, "degrees (0=North, clockwise)",
            note="Derived from 3×3 elevation grid. 0° = North."
        ),
        "curvature": _var(
            curvature, derivative_source, "dimensionless",
            note="Plan curvature approximation (+ = concave, − = convex). "
                 "Clamped to model range [−5, 5]."
        ),
    }


def _error_response(message: str) -> Dict[str, Any]:
    unavail: Dict[str, Any] = {
        "value": None, "available": False, "source": None,
        "retrieved_at": None, "unit": None, "note": message
    }
    return {
        "success": False,
        "source": "Open-Meteo / Copernicus GLO-90 DEM",
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "error": message,
        "elevation_m": unavail,
        "slope_deg": unavail,
        "aspect_deg": unavail,
        "curvature": unavail,
    }
