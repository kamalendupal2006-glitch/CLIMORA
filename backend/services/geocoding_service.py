"""
CLIMORA Geocoding Service
==========================
Determines the Indian state for a GPS coordinate using two methods:

Method 1 — Nominatim (OpenStreetMap) reverse geocoding:
    Primary method. Queries https://nominatim.openstreetmap.org/reverse
    with proper User-Agent (required by Nominatim usage policy).
    Returns the 'state' field from the OSM address.

Method 2 — Bounding-box fallback:
    If Nominatim fails (timeout, rate limit, etc.), falls back to a set of
    approximate bounding boxes for Northeast India + other states present in
    the V2 model training data. This is always offline and never fails.

State validation:
    CLIMORA currently supports the North Eastern Region + selected high-risk
    states. If the detected state is within the supported region, prediction
    is allowed with an honest limitation label when the state was absent from
    the V2 synthetic training data.

    Supported NER states (all 8):
        Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland,
        Sikkim, Tripura

    Other states present in V2 training data:
        Himachal Pradesh, Jammu and Kashmir, Karnataka, Kerala, Maharashtra,
        Tamil Nadu, Uttarakhand, West Bengal

    Outside India / unsupported territory:
        Returns a clear rejection message.

    States in the NER but absent from V2 training data:
        (Assam, Manipur, Mizoram, Nagaland, Tripura)
        Prediction is still allowed but response includes:
        "Prototype prediction — regional validation pending."
        We never substitute a proxy state.

IMPORTANT — NO FAKE DATA:
    State assignment is always derived from the actual GPS coordinates.
    We never randomly assign or guess a state.

Cache TTL: GEOCODING_CACHE_TTL_S (1 hour)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from services.cache import geocoding_cache

logger = logging.getLogger("CLIMORA.geocoding_service")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
# Nominatim usage policy requires a descriptive User-Agent
NOMINATIM_USER_AGENT = "CLIMORA-LandslideEarlyWarning/2.0 (prototype; contact=dev@climora.local)"
REQUEST_TIMEOUT_S = 8.0
GEOCODING_CACHE_TTL_S = 3600.0  # 1 hour

# ---------------------------------------------------------------------------
# State classification
# ---------------------------------------------------------------------------

# All 8 NER states (CLIMORA's primary deployment region)
NER_STATES = {
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura",
}

# States present in V2 synthetic training data (from config.VALID_STATE_REGIONS)
V2_TRAINED_STATES = {
    "Arunachal Pradesh",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Karnataka",
    "Kerala",
    "Maharashtra",
    "Meghalaya",
    "Sikkim",
    "Tamil Nadu",
    "Uttarakhand",
    "West Bengal",
}

# All states supported for CLIMORA predictions (NER + states in V2 training)
SUPPORTED_STATES = NER_STATES | V2_TRAINED_STATES

# NER states NOT in V2 training data → prediction allowed with limitation note
NER_STATES_PENDING_VALIDATION = NER_STATES - V2_TRAINED_STATES

# ---------------------------------------------------------------------------
# Approximate bounding boxes for supported states (lat_min, lat_max, lon_min, lon_max)
# Source: Survey of India / established geographic boundaries
# Used ONLY as fallback when Nominatim is unreachable
# ---------------------------------------------------------------------------
STATE_BBOXES = [
    # --- Northeast India (NER) — check specific/enclosed states first ---
    ("Sikkim",             27.0, 28.2,  88.0,  88.9),
    ("Tripura",            22.9, 24.5,  91.1,  92.3),
    ("Mizoram",            21.9, 24.5,  92.2,  93.5),
    ("Meghalaya",          24.9, 26.1,  89.8,  92.8),
    ("Nagaland",           25.6, 27.0,  93.3,  95.3),
    ("Manipur",            23.8, 25.6,  93.0,  94.8),
    ("Arunachal Pradesh",  26.5, 29.5,  91.5,  97.5),
    ("Assam",              24.1, 28.2,  89.7,  96.0),
    # --- Other states in V2 training data ---
    ("Himachal Pradesh",   30.4, 33.2,  75.6,  79.0),
    ("Jammu and Kashmir",  32.5, 36.6,  73.7,  80.3),
    ("Uttarakhand",        28.7, 31.5,  77.6,  81.0),
    ("West Bengal",        21.3, 27.3,  85.8,  89.9),
    ("Kerala",              8.1, 12.8,  74.9,  77.4),
    ("Karnataka",          11.6, 18.4,  74.1,  78.6),
    ("Tamil Nadu",          8.1, 13.5,  76.3,  80.3),
    ("Maharashtra",        15.6, 22.0,  72.6,  80.9),
]


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def get_state_for_coordinates(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Determine the Indian state for GPS coordinates.

    Returns a dict with:
        success (bool)
        state_region (str | None) — exact state name compatible with CLIMORA
        in_supported_region (bool)
        validation_note (str | None) — set when state is NER but not in V2 training
        geocoding_source (str) — 'nominatim' | 'bounding_box'
        retrieved_at (str)
        error (str | None)
    """
    cache_key = f"geocode:{latitude:.4f},{longitude:.4f}"
    cached = geocoding_cache.get(cache_key)
    if cached is not None:
        logger.info("Geocoding served from cache for (%.4f, %.4f)", latitude, longitude)
        return cached

    result = _resolve_state(latitude, longitude)
    # Cache both successes and "outside region" results (not transient errors)
    if result.get("success") or not result.get("error"):
        geocoding_cache.set(cache_key, result, GEOCODING_CACHE_TTL_S)
    return result


def is_in_india_bbox(latitude: float, longitude: float) -> bool:
    """
    Fast pre-check: is the coordinate roughly within India?
    Approximate bounding box: lat [6, 37], lon [68, 98]
    """
    return 6.0 <= latitude <= 37.5 and 68.0 <= longitude <= 98.0


# ---------------------------------------------------------------------------
# Internal implementation
# ---------------------------------------------------------------------------

def _resolve_state(latitude: float, longitude: float) -> Dict[str, Any]:
    """Try Nominatim first, fall back to bounding-box lookup."""
    retrieved_at = datetime.now(timezone.utc).isoformat()

    # Fast reject: clearly outside India
    if not is_in_india_bbox(latitude, longitude):
        return {
            "success": False,
            "state_region": None,
            "in_supported_region": False,
            "validation_note": None,
            "geocoding_source": "coordinate_bounds_check",
            "retrieved_at": retrieved_at,
            "error": (
                "CLIMORA currently focuses on India's North Eastern Region. "
                "The provided coordinates appear to be outside India."
            ),
        }

    # --- Method 1: Nominatim ---
    nominatim_state = _query_nominatim(latitude, longitude)

    if nominatim_state:
        state = _normalise_state_name(nominatim_state)
        return _build_result(state, "nominatim", retrieved_at)

    # --- Method 2: Bounding-box fallback ---
    logger.info("Nominatim unavailable, using bounding-box fallback for (%.4f, %.4f)", latitude, longitude)
    bbox_state = _bbox_lookup(latitude, longitude)
    if bbox_state:
        return _build_result(bbox_state, "bounding_box_fallback", retrieved_at)

    # Coordinate is within India but doesn't match any known box
    return {
        "success": False,
        "state_region": None,
        "in_supported_region": False,
        "validation_note": None,
        "geocoding_source": "none",
        "retrieved_at": retrieved_at,
        "error": (
            "Could not determine state for the provided coordinates. "
            "Please select your state manually."
        ),
    }


def _build_result(
    state: Optional[str],
    source: str,
    retrieved_at: str,
) -> Dict[str, Any]:
    """
    Build the standardised geocoding result dict.
    State may be an exact CLIMORA match, a known non-supported state, or None.
    """
    if state is None:
        return {
            "success": False,
            "state_region": None,
            "in_supported_region": False,
            "validation_note": None,
            "geocoding_source": source,
            "retrieved_at": retrieved_at,
            "error": "State could not be determined. Please select manually.",
        }

    in_supported = state in SUPPORTED_STATES
    pending_validation = state in NER_STATES_PENDING_VALIDATION

    validation_note: Optional[str] = None
    if pending_validation:
        validation_note = (
            f"'{state}' is within CLIMORA's North Eastern Region deployment area "
            f"but was not represented in the V2 synthetic prototype training data. "
            f"Prototype prediction — regional validation pending."
        )

    not_supported_msg: Optional[str] = None
    if not in_supported and state:
        not_supported_msg = (
            f"'{state}' is not within CLIMORA's current supported region. "
            f"CLIMORA currently focuses on India's North Eastern Region and "
            f"selected high-risk states."
        )

    return {
        "success": in_supported,
        "state_region": state if in_supported else None,
        "detected_state": state,  # always expose the detected state for transparency
        "in_supported_region": in_supported,
        "validation_note": validation_note,
        "geocoding_source": source,
        "retrieved_at": retrieved_at,
        "error": not_supported_msg if not in_supported else None,
    }


def _query_nominatim(latitude: float, longitude: float) -> Optional[str]:
    """
    Query Nominatim reverse geocoding. Returns the raw state name or None.
    """
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "json",
        "addressdetails": 1,
        "zoom": 5,  # State-level zoom
    }
    headers = {"User-Agent": NOMINATIM_USER_AGENT}

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT_S) as client:
            resp = client.get(NOMINATIM_URL, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        address = data.get("address", {})
        state = address.get("state") or address.get("county") or address.get("region")
        if state:
            logger.info("Nominatim resolved: '%s' for (%.4f, %.4f)", state, latitude, longitude)
        return state
    except httpx.TimeoutException:
        logger.warning("Nominatim timeout for (%.4f, %.4f)", latitude, longitude)
        return None
    except httpx.HTTPStatusError as exc:
        logger.warning("Nominatim HTTP %d for (%.4f, %.4f)", exc.response.status_code, latitude, longitude)
        return None
    except Exception as exc:
        logger.warning("Nominatim error: %s", exc)
        return None


def _bbox_lookup(latitude: float, longitude: float) -> Optional[str]:
    """
    Match coordinates against the state bounding boxes.
    Returns the first matching state name, or None.
    """
    for state_name, lat_min, lat_max, lon_min, lon_max in STATE_BBOXES:
        if lat_min <= latitude <= lat_max and lon_min <= longitude <= lon_max:
            logger.info("Bbox matched: '%s' for (%.4f, %.4f)", state_name, latitude, longitude)
            return state_name
    return None


def _normalise_state_name(raw: str) -> Optional[str]:
    """
    Map a Nominatim state string to a CLIMORA-recognised state name.
    Handles common variations returned by OSM data.
    """
    # Strip whitespace and normalise
    s = raw.strip()

    # Direct match
    if s in SUPPORTED_STATES:
        return s

    # Common OSM name variations
    aliases: Dict[str, str] = {
        # NER variants
        "Arunāchal Pradesh": "Arunachal Pradesh",
        "Arunachal": "Arunachal Pradesh",
        "Meghalaya State": "Meghalaya",
        "Assam State": "Assam",
        "Manipur State": "Manipur",
        "Mizoram State": "Mizoram",
        "Nagaland State": "Nagaland",
        "Sikkim State": "Sikkim",
        "Tripura State": "Tripura",
        # Other supported states
        "Jammu & Kashmir": "Jammu and Kashmir",
        "J&K": "Jammu and Kashmir",
        "Himachal": "Himachal Pradesh",
        "HP": "Himachal Pradesh",
        "UK": "Uttarakhand",
        "Uttaranchal": "Uttarakhand",
        "West Bengal State": "West Bengal",
        "WB": "West Bengal",
    }
    if s in aliases:
        return aliases[s]

    # Case-insensitive scan across all supported states
    s_lower = s.lower()
    for known in SUPPORTED_STATES:
        if known.lower() == s_lower:
            return known

    # Partial match (e.g. OSM returns "State of Meghalaya")
    for known in SUPPORTED_STATES:
        if known.lower() in s_lower:
            return known

    # Unknown — return as-is so _build_result can flag it as unsupported
    logger.info("State '%s' not in CLIMORA supported list", s)
    return s
