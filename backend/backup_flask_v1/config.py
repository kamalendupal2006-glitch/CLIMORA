"""
CLIMORA Configuration Module
============================
Contains centralized settings for risk thresholds, feature definitions,
recommendation templates, server settings, and file paths.
"""

import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"
REPORTS_DIR = BASE_DIR / "reports"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# File Paths
DATASET_PATH = DATA_DIR / "climora_85000_non_satellite_prototype.csv"
MODEL_VERSION = "2.0-synthetic-calibrated-20260828"
# The original v1 artifact remains in model/climora_landslide_model.pkl as a backup.
MODEL_PATH = MODEL_DIR / "climora_landslide_model_v2_20260828.pkl"
METRICS_PATH = REPORTS_DIR / "model_metrics_v2_20260828.json"
DATASET_AUDIT_PATH = REPORTS_DIR / "dataset_audit_v2_20260828.json"
COMPARISON_PATH = REPORTS_DIR / "model_comparison_v2_20260828.json"
CALIBRATION_COMPARISON_PATH = REPORTS_DIR / "calibration_comparison_v2_20260828.json"
THRESHOLD_PATH = REPORTS_DIR / "threshold_selection_v2_20260828.json"
FEATURE_IMPORTANCE_PATH = REPORTS_DIR / "feature_importance_v2_20260828.csv"
CONFUSION_MATRIX_PATH = REPORTS_DIR / "confusion_matrix_v2_20260828.csv"

# Server Settings
HOST = os.getenv("CLIMORA_HOST", "127.0.0.1")
PORT = int(os.getenv("CLIMORA_PORT", "5000"))
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002"
]

# Model Target & Leakage Columns
TARGET_COLUMN = "landslide"
DROP_COLUMNS = ["landslide", "risk_category_prototype"]

# Feature Definitions (Non-Satellite Version 1.0)
NUMERICAL_FEATURES = [
    "latitude",
    "longitude",
    "elevation_m",
    "slope_deg",
    "aspect_deg",
    "curvature",
    "rainfall_mm",
    "soil_moisture",
    "temperature_c",
    "humidity_pct",
    "historical_landslide_count",
    "days_since_previous_event"
]

CATEGORICAL_FEATURES = [
    "state_region",
    "land_cover"
]

ALL_INPUT_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

# Valid Categories (from dataset)
VALID_STATE_REGIONS = [
    "Maharashtra",
    "Arunachal Pradesh",
    "Karnataka",
    "Uttarakhand",
    "West Bengal",
    "Himachal Pradesh",
    "Jammu and Kashmir",
    "Sikkim",
    "Tamil Nadu",
    "Meghalaya",
    "Kerala"
]

VALID_LAND_COVERS = [
    "Forest",
    "Cropland",
    "Grassland",
    "Shrubland",
    "Barren",
    "Built-up"
]

# Soil class to land cover / risk context mapping helper
SOIL_TYPE_MAP = {
    "clay_loam": {"land_cover": "Cropland", "soil_factor": 1.2},
    "silty_clay": {"land_cover": "Forest", "soil_factor": 1.35},
    "sandy_loam": {"land_cover": "Grassland", "soil_factor": 0.9},
    "weathered_rock": {"land_cover": "Barren", "soil_factor": 1.4},
    "gravelly_soil": {"land_cover": "Shrubland", "soil_factor": 1.15},
    "peat_organic": {"land_cover": "Forest", "soil_factor": 1.25}
}

# Future Satellite-Derived Features (For future modular retraining v2.0)
FUTURE_SATELLITE_FEATURES = [
    "ndvi",
    "ndwi",
    "ndbi",
    "swir_reflectance",
    "satellite_soil_moisture",
    "land_surface_temperature_c"
]

# Risk Classification Thresholds (Strictly defined per prompt)
# 0.00 to 0.15: NO RISK
# > 0.15 to 0.35: LOW
# > 0.35 to 0.60: MODERATE
# > 0.60 to 0.80: HIGH
# > 0.80 to 1.00: CRITICAL
RISK_THRESHOLDS = [
    (0.15, "NO RISK"),
    (0.35, "LOW"),
    (0.60, "MODERATE"),
    (0.80, "HIGH"),
    (1.00, "CRITICAL"),
]

# Standardized Recommendations (Informational only)
RECOMMENDATIONS = {
    "NO RISK": "No significant landslide risk is indicated by the current model prediction. Continue normal monitoring.",
    "LOW": "Risk is currently low. Continue monitoring environmental conditions.",
    "MODERATE": "Risk is moderate. Increase monitoring, particularly during heavy rainfall.",
    "HIGH": "Risk is high. Increase monitoring and prepare appropriate emergency response measures.",
    "CRITICAL": "Risk is critical. Follow official disaster-management and evacuation guidance immediately."
}

# Baseline Feature Ranges for Validation
FEATURE_RANGES = {
    "latitude": (-90.0, 90.0),
    "longitude": (-180.0, 180.0),
    "elevation_m": (0.0, 9000.0),
    "slope_deg": (0.0, 90.0),
    "aspect_deg": (0.0, 360.0),
    "curvature": (-5.0, 5.0),
    "rainfall_mm": (0.0, 2000.0),
    "soil_moisture": (0.0, 1.0),       # Expects 0.0-1.0 (auto-converts if > 1.0)
    "temperature_c": (-50.0, 60.0),
    "humidity_pct": (0.0, 100.0),
    "historical_landslide_count": (0, 500),
    # -1 is the synthetic dataset's sentinel for no previous recorded event.
    "days_since_previous_event": (-1, 20000)
}

# Defaults for optional features
DEFAULT_FEATURE_VALUES = {
    "state_region": "Uttarakhand",
    "land_cover": "Forest",
    "aspect_deg": 180.0,
    "curvature": 0.0,
    "humidity_pct": 65.0,
    "historical_landslide_count": 3,
    "days_since_previous_event": 365
}

DISCLAIMER = (
    "CLIMORA predictions and recommendations are informational early-warning indicators "
    "developed for prototype/demonstration purposes. Official disaster-management authorities "
    "remain solely responsible for emergency decisions and evacuation orders."
)
