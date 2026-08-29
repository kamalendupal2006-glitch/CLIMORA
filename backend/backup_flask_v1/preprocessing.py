"""
CLIMORA Preprocessing Module
============================
Provides scikit-learn ColumnTransformer pipelines and input validation / normalization
utilities for the CLIMORA ML prediction system.
"""

from typing import Dict, Any, Tuple, List, Optional
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

from config import (
    NUMERICAL_FEATURES,
    CATEGORICAL_FEATURES,
    ALL_INPUT_FEATURES,
    VALID_STATE_REGIONS,
    VALID_LAND_COVERS,
    SOIL_TYPE_MAP,
    FEATURE_RANGES,
    DEFAULT_FEATURE_VALUES,
)


def build_preprocessor(
    numerical_cols: Optional[List[str]] = None,
    categorical_cols: Optional[List[str]] = None
) -> ColumnTransformer:
    """
    Builds a reproducible scikit-learn ColumnTransformer for preprocessing.
    Modular design allows passing expanded feature sets (e.g., future satellite indices).

    Parameters:
        numerical_cols: List of numerical column names. Defaults to config.NUMERICAL_FEATURES.
        categorical_cols: List of categorical column names. Defaults to config.CATEGORICAL_FEATURES.

    Returns:
        ColumnTransformer: Preprocessing transformer.
    """
    if numerical_cols is None:
        numerical_cols = NUMERICAL_FEATURES
    if categorical_cols is None:
        categorical_cols = CATEGORICAL_FEATURES

    # Numerical pipeline: impute median if missing, then passthrough
    num_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
    ])

    # Categorical pipeline: impute most frequent, then OneHotEncode with unknown handling
    cat_pipeline = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False))
    ])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_pipeline, numerical_cols),
            ("cat", cat_pipeline, categorical_cols)
        ],
        remainder="drop"
    )

    return preprocessor


def validate_and_format_input(data: Dict[str, Any]) -> Tuple[bool, Optional[str], Optional[pd.DataFrame]]:
    """
    Validates and standardizes raw input data into a single-row DataFrame compatible
    with the trained CLIMORA model pipeline. Supports frontend aliases and handles
    field defaults seamlessly.

    Parameters:
        data: Dict received from API request or frontend form.

    Returns:
        Tuple: (is_valid: bool, error_message: Optional[str], df: Optional[pd.DataFrame])
    """
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object.", None

    formatted = {}

    # Alias mappings for compatibility with various frontend naming conventions
    field_aliases = {
        "latitude": ["latitude", "lat"],
        "longitude": ["longitude", "lon", "lng"],
        "elevation_m": ["elevation_m", "elevation", "elev", "altitude"],
        "slope_deg": ["slope_deg", "slope", "slope_angle", "gradient"],
        "aspect_deg": ["aspect_deg", "aspect"],
        "curvature": ["curvature", "terrain_curvature"],
        "rainfall_mm": ["rainfall_mm", "rainfall", "rain", "precip_mm", "precipitation"],
        "soil_moisture": ["soil_moisture", "moisture", "soil_moisture_pct"],
        "temperature_c": ["temperature_c", "temperature", "temp", "temp_c"],
        "humidity_pct": ["humidity_pct", "humidity", "rh"],
        "historical_landslide_count": ["historical_landslide_count", "historicalEvents", "history_count", "past_events"],
        "days_since_previous_event": ["days_since_previous_event", "days_since_event", "days_since_last"]
    }

    # Resolve numerical features
    for target_col, aliases in field_aliases.items():
        val = None
        for alias in aliases:
            if alias in data and data[alias] is not None and data[alias] != "":
                val = data[alias]
                break

        if val is None:
            if target_col in DEFAULT_FEATURE_VALUES:
                val = DEFAULT_FEATURE_VALUES[target_col]
            else:
                return False, f"Missing required numerical parameter: '{target_col}'", None

        try:
            val_float = float(val)
        except (ValueError, TypeError):
            return False, f"Invalid value for '{target_col}': expected numeric, got '{val}'", None

        # Special conversion: if soil moisture provided as 0-100%, convert to 0.0-1.0 ratio
        if target_col == "soil_moisture" and val_float > 1.0:
            val_float = val_float / 100.0

        # Range validation
        if target_col in FEATURE_RANGES:
            min_v, max_v = FEATURE_RANGES[target_col]
            if not (min_v <= val_float <= max_v):
                return False, (
                    f"Value for '{target_col}' ({val_float}) is out of allowable range [{min_v}, {max_v}]."
                ), None

        formatted[target_col] = val_float

    # Resolve state_region
    state = data.get("state_region") or data.get("state") or data.get("region")
    if not state or state == "":
        state = DEFAULT_FEATURE_VALUES["state_region"]
    formatted["state_region"] = str(state).strip()

    # Resolve land_cover
    land_cover = data.get("land_cover") or data.get("landcover")
    if not land_cover or land_cover == "":
        soil_type = data.get("soil_type") or data.get("soilType")
        if soil_type and soil_type in SOIL_TYPE_MAP:
            land_cover = SOIL_TYPE_MAP[soil_type]["land_cover"]
        else:
            land_cover = DEFAULT_FEATURE_VALUES["land_cover"]
    formatted["land_cover"] = str(land_cover).strip()

    # Create single-row DataFrame in the exact expected column order
    df = pd.DataFrame([formatted])[ALL_INPUT_FEATURES]
    return True, None, df


def generate_contributing_factors(
    input_data: Dict[str, Any],
    probability: float
) -> List[Dict[str, Any]]:
    """
    Computes rule-based contributing environmental risk indicators based on input parameters
    without making unsupported causal claims.

    Returns:
        List[Dict[str, Any]]: List of risk indicator cards with name, value, impact, severity, and description.
    """
    rainfall = float(input_data.get("rainfall_mm", 0))
    slope = float(input_data.get("slope_deg", 0))
    moisture = float(input_data.get("soil_moisture", 0))
    if moisture <= 1.0:
        moisture_pct = moisture * 100.0
    else:
        moisture_pct = moisture
    elevation = float(input_data.get("elevation_m", 0))
    hist_count = int(input_data.get("historical_landslide_count", 0))
    land_cover = str(input_data.get("land_cover", "Forest"))
    state = str(input_data.get("state_region", "Uttarakhand"))

    # Compute normalized impact metrics (0 - 100 scale)
    # Rainfall indicator
    rain_score = min(100, max(5, int((rainfall / 200.0) * 100)))
    rain_severity = "high" if rainfall >= 120 else ("moderate" if rainfall >= 50 else "low")
    rain_desc = (
        f"Precipitation of {rainfall:.1f} mm is an elevated rainfall input indicator."
        if rainfall >= 120 else
        (f"Precipitation of {rainfall:.1f} mm is a moderate rainfall input indicator."
         if rainfall >= 50 else f"Precipitation of {rainfall:.1f} mm is a baseline rainfall input indicator.")
    )

    # Slope indicator
    slope_score = min(100, max(5, int((slope / 45.0) * 100)))
    slope_severity = "high" if slope >= 35 else ("moderate" if slope >= 22 else "low")
    slope_desc = (
        f"Slope gradient of {slope:.1f}° is an elevated inclination indicator."
        if slope >= 35 else
        (f"Slope gradient of {slope:.1f}° is a moderate inclination indicator."
         if slope >= 22 else f"Slope gradient of {slope:.1f}° is a baseline inclination indicator.")
    )

    # Soil moisture saturation indicator
    moisture_score = min(100, max(5, int((moisture_pct / 90.0) * 100)))
    moisture_severity = "high" if moisture_pct >= 75 else ("moderate" if moisture_pct >= 50 else "low")
    moisture_desc = (
        f"Soil moisture saturation of {moisture_pct:.1f}% is an elevated moisture indicator."
        if moisture_pct >= 75 else
        (f"Soil moisture saturation of {moisture_pct:.1f}% is a moderate moisture indicator."
         if moisture_pct >= 50 else f"Soil moisture saturation of {moisture_pct:.1f}% is a baseline moisture indicator.")
    )

    # Elevation relief indicator
    elev_score = min(100, max(5, int((elevation / 3000.0) * 100)))
    elev_severity = "high" if elevation >= 2000 else ("moderate" if elevation >= 1000 else "low")
    elev_desc = f"Elevation of {elevation:.0f} m AMSL is included as a topographical relief feature."

    # Historical event indicator (synthetic prototype dataset)
    hist_score = min(100, max(5, int((hist_count / 10.0) * 100)))
    hist_severity = "high" if hist_count >= 5 else ("moderate" if hist_count >= 2 else "low")
    hist_desc = f"The supplied historical-event indicator is {hist_count} events from the prototype dataset."

    # Land cover context feature
    cover_severity = "high" if land_cover in ["Barren", "Built-up"] else ("moderate" if land_cover in ["Shrubland", "Cropland"] else "low")
    cover_score = 80 if land_cover == "Barren" else (65 if land_cover == "Built-up" else (45 if land_cover in ["Cropland", "Shrubland"] else 25))
    cover_desc = f"Land-cover classification '{land_cover}' in {state} is included as an environmental context feature."

    factors = [
        {
            "name": "Rainfall Intensity",
            "value": f"{rainfall:.1f} mm",
            "impact": rain_score,
            "severity": rain_severity,
            "description": rain_desc
        },
        {
            "name": "Slope Gradient",
            "value": f"{slope:.1f}°",
            "impact": slope_score,
            "severity": slope_severity,
            "description": slope_desc
        },
        {
            "name": "Soil Moisture Saturation",
            "value": f"{moisture_pct:.1f}%",
            "impact": moisture_score,
            "severity": moisture_severity,
            "description": moisture_desc
        },
        {
            "name": "Elevation Relief",
            "value": f"{elevation:.0f} m",
            "impact": elev_score,
            "severity": elev_severity,
            "description": elev_desc
        },
        {
            "name": "Historical Landslide Events",
            "value": f"{hist_count} events",
            "impact": hist_score,
            "severity": hist_severity,
            "description": hist_desc
        },
        {
            "name": "Land Cover Classification",
            "value": land_cover,
            "impact": cover_score,
            "severity": cover_severity,
            "description": cover_desc
        }
    ]

    # Sort factors by impact descending
    factors.sort(key=lambda x: x["impact"], reverse=True)
    return factors
