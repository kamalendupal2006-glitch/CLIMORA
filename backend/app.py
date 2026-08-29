"""
CLIMORA FastAPI REST API
========================
Migrated from Flask to FastAPI.
Preserves the existing V2 ML pipeline exactly:

    React + Vite (port 3000)
         |
    FastAPI REST API  ← this file
         |
    predict.py  (unchanged)
         |
    climora_landslide_model_v2_20260828.pkl
         |
    CalibratedClassifierCV (sigmoid, 3-fold)
         |
    Pipeline: ColumnTransformer → XGBClassifier
         |
    calibrated probability → risk category → JSON

Start:
    python -m uvicorn app:app --host 127.0.0.1 --port 5000

Docs:
    http://127.0.0.1:5000/docs   (Swagger UI)
    http://127.0.0.1:5000/redoc  (ReDoc)
"""

import sys
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Ensure backend/ is on sys.path so config / predict / preprocessing resolve
# ---------------------------------------------------------------------------
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import (
    HOST,
    PORT,
    CORS_ORIGINS,
    MODEL_PATH,
    METRICS_PATH,
    MODEL_VERSION,
    DISCLAIMER,
    VALID_STATE_REGIONS,
    VALID_LAND_COVERS,
    FEATURE_RANGES,
    DEFAULT_FEATURE_VALUES,
    SUPPORTED_STATES_FOR_PREDICTION,
)
from predict import load_model, predict as run_predict
from services.environmental_service import get_environmental_data
from routes.reports_router import router as reports_router
from routes.villages_router import router as villages_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("CLIMORA_API")


# ---------------------------------------------------------------------------
# Lifespan — load model ONCE at startup, release on shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load the V2 CalibratedClassifierCV pipeline at startup."""
    logger.info("CLIMORA FastAPI starting up …")
    logger.info(f"Loading model from: {MODEL_PATH}")
    try:
        pipeline = load_model()
        if pipeline is not None:
            logger.info(
                f"V2 model loaded successfully. "
                f"Type: {type(pipeline).__name__}  Version: {MODEL_VERSION}"
            )
        else:
            logger.error("load_model() returned None — model unavailable.")
    except Exception as exc:
        logger.error(f"Failed to load model on startup: {exc}")

    yield  # application handles requests here

    logger.info("CLIMORA FastAPI shutting down.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CLIMORA ML API",
    version=MODEL_VERSION,
    description=(
        "CLIMORA — AI-powered Landslide Early Warning & Monitoring Platform. "
        "Provides landslide risk assessment using a trained, calibrated XGBoost "
        "pipeline (V2 CalibratedClassifierCV). "
        "For the North Eastern Region of India and surrounding high-risk areas."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Routers — Community Reporting, Alerts & Remote Villages
# ---------------------------------------------------------------------------
app.include_router(reports_router)
app.include_router(villages_router)

# ---------------------------------------------------------------------------
# CORS — explicit origins only, never wildcard
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ---------------------------------------------------------------------------
# Global exception handlers — no tracebacks, no filesystem paths to frontend
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        f"Unhandled exception on {request.method} {request.url.path}: "
        f"{type(exc).__name__}: {exc}"
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "An internal server error occurred.",
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    logger.warning(f"ValueError on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": str(exc),
        },
    )


# ---------------------------------------------------------------------------
# Pydantic Request Model
# ---------------------------------------------------------------------------

class PredictionRequest(BaseModel):
    """
    Input features for the CLIMORA V2 landslide risk prediction endpoint.
    Accepts the 14 model input features only.
    'landslide' and 'risk_category_prototype' are target/leakage fields and
    must NOT be submitted.
    """

    # -- Geographic --
    latitude: float = Field(
        ...,
        ge=-90.0,
        le=90.0,
        description="Latitude in decimal degrees (WGS84)",
        examples=[11.5332],
    )
    longitude: float = Field(
        ...,
        ge=-180.0,
        le=180.0,
        description="Longitude in decimal degrees (WGS84)",
        examples=[76.1284],
    )

    # -- Categorical --
    state_region: str = Field(
        ...,
        description=f"State or geographic region. Supported values: {sorted(SUPPORTED_STATES_FOR_PREDICTION)}",
        examples=["Meghalaya", "Assam", "Kerala"],
    )

    # -- Terrain --
    elevation_m: float = Field(
        ...,
        ge=0.0,
        le=9000.0,
        description="Elevation above sea level in metres",
        examples=[1180.0],
    )
    slope_deg: float = Field(
        ...,
        ge=0.0,
        le=90.0,
        description="Slope angle in degrees (0 = flat, 90 = vertical cliff)",
        examples=[42.5],
    )
    aspect_deg: float = Field(
        ...,
        ge=0.0,
        le=360.0,
        description="Slope aspect in degrees (0/360 = North)",
        examples=[225.0],
    )
    curvature: float = Field(
        ...,
        ge=-5.0,
        le=5.0,
        description="Terrain curvature (positive = concave, negative = convex)",
        examples=[0.8],
    )

    # -- Environmental --
    rainfall_mm: float = Field(
        ...,
        ge=0.0,
        le=2000.0,
        description="Rainfall accumulation in millimetres",
        examples=[188.5],
    )
    soil_moisture: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Volumetric soil moisture ratio (0.0 = dry, 1.0 = saturated). "
            "If your UI sends 0–100%, the preprocessing layer auto-converts values > 1.0."
        ),
        examples=[0.89],
    )
    temperature_c: float = Field(
        ...,
        ge=-50.0,
        le=60.0,
        description="Ambient temperature in degrees Celsius",
        examples=[21.0],
    )
    humidity_pct: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Relative humidity as a percentage (0–100)",
        examples=[94.0],
    )

    # -- Land cover --
    land_cover: str = Field(
        ...,
        description=f"Land cover classification. Valid values: {VALID_LAND_COVERS}",
        examples=["Forest"],
    )

    # -- Historical --
    historical_landslide_count: int = Field(
        ...,
        ge=0,
        le=500,
        description="Number of historically recorded landslide events in the area",
        examples=[6],
    )
    days_since_previous_event: int = Field(
        ...,
        ge=-1,           # -1 is the dataset sentinel for "no previous event recorded"
        le=20000,
        description=(
            "Days since last recorded landslide event. "
            "Use -1 if no previous event is on record (dataset sentinel value)."
        ),
        examples=[180],
    )

    # -----------------------------------------------------------------------
    # Categorical validators — use exact values from config.py
    # -----------------------------------------------------------------------
    @field_validator("state_region")
    @classmethod
    def validate_state_region(cls, v: str) -> str:
        if v not in SUPPORTED_STATES_FOR_PREDICTION:
            raise ValueError(
                f"'{v}' is not within CLIMORA's supported region. "
                f"Valid options: {sorted(SUPPORTED_STATES_FOR_PREDICTION)}"
            )
        return v

    @field_validator("land_cover")
    @classmethod
    def validate_land_cover(cls, v: str) -> str:
        if v not in VALID_LAND_COVERS:
            raise ValueError(
                f"'{v}' is not a recognised land cover type. "
                f"Valid options: {VALID_LAND_COVERS}"
            )
        return v

    model_config = {
        # Extra fields (e.g. 'landslide', 'risk_category_prototype') are silently ignored
        "extra": "ignore",
        "json_schema_extra": {
            "examples": [
                {
                    "latitude": 11.5332,
                    "longitude": 76.1284,
                    "state_region": "Kerala",
                    "elevation_m": 1180,
                    "slope_deg": 42.5,
                    "aspect_deg": 225,
                    "curvature": 0.8,
                    "rainfall_mm": 188.5,
                    "soil_moisture": 0.89,
                    "temperature_c": 21.0,
                    "humidity_pct": 94.0,
                    "land_cover": "Forest",
                    "historical_landslide_count": 6,
                    "days_since_previous_event": 180,
                }
            ]
        },
    }


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool


class ErrorResponse(BaseModel):
    success: bool = False
    error: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root() -> JSONResponse:
    """Root metadata — mirrors the original Flask root endpoint."""
    return JSONResponse(
        content={
            "service": "CLIMORA Landslide Risk Prediction API",
            "version": MODEL_VERSION,
            "status": "online",
            "endpoints": {
                "health":  "/api/health",
                "predict": "/api/predict",
                "metrics": "/api/metrics",
                "docs":    "/docs",
                "redoc":   "/redoc",
            },
        }
    )


@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns API status and V2 model load state.",
    tags=["System"],
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.

    Returns:
    - **status**: `"ok"` when the model is loaded, `"degraded"` otherwise.
    - **service**: service identifier string.
    - **model_loaded**: `true` when the V2 pipeline is in memory.
    """
    try:
        pipeline = load_model()
        is_loaded = pipeline is not None
    except Exception:
        is_loaded = False

    return HealthResponse(
        status="ok" if is_loaded else "degraded",
        service="CLIMORA ML API",
        model_loaded=is_loaded,
    )


@app.get(
    "/api/metrics",
    summary="Model evaluation metrics",
    description=(
        "Returns the V2 model evaluation metrics report generated during training. "
        "Returns HTTP 404 if the metrics file is not found."
    ),
    tags=["System"],
)
async def get_metrics() -> JSONResponse:
    """
    Returns prototype model evaluation metrics from the reports directory.
    Mirrors the original Flask /api/metrics endpoint exactly.
    """
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model metrics report not found. Please train the model first.",
        )
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return JSONResponse(content=data)
    except Exception as exc:
        logger.error(f"Error reading metrics report: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to read metrics report.",
        )


# ---------------------------------------------------------------------------
# Environmental Data Endpoint
# ---------------------------------------------------------------------------

@app.get(
    "/api/environmental-data",
    summary="Retrieve real-world environmental data for a GPS coordinate",
    description=(
        "Given a latitude and longitude, retrieves real environmental and "
        "geospatial data from external authoritative sources (Open-Meteo, "
        "Nominatim OSM). Returns weather, terrain, and geocoding data with "
        "full provenance. Land cover and historical landslide data are "
        "currently unavailable via automated sources and must be entered manually. "
        "For coordinates outside India's North Eastern Region and supported states, "
        "returns a clear rejection message."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Invalid coordinates"},
        422: {"description": "Query parameter validation error"},
        503: {"model": ErrorResponse, "description": "External data service unavailable"},
    },
    tags=["Environmental Data"],
)
async def environmental_data_endpoint(
    latitude: float = None,
    longitude: float = None,
) -> JSONResponse:
    """
    Real-world environmental data retrieval endpoint.

    **Data sources:**
    - Temperature, humidity, rainfall (24h sum), soil moisture: Open-Meteo (ERA5-Land)
    - Elevation: Open-Meteo / Copernicus GLO-90 DEM (90 m)
    - Slope, aspect, curvature: Derived from 3×3 DEM grid (Horn 1981 method)
    - State/region: Nominatim OpenStreetMap reverse geocoding + bounding-box fallback

    **Manual input still required:**
    - land_cover (no free point-query API available)
    - historical_landslide_count (no open inventory API for NE India)
    - days_since_previous_event (no open inventory API for NE India)

    **No API keys are exposed in responses.**
    **No synthetic or fake values are returned.**
    """
    # Validate parameters explicitly (FastAPI query params don't auto-validate float ranges)
    if latitude is None or longitude is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both 'latitude' and 'longitude' query parameters are required.",
        )

    if not (-90.0 <= latitude <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid latitude: {latitude}. Must be between -90 and 90.",
        )

    if not (-180.0 <= longitude <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid longitude: {longitude}. Must be between -180 and 180.",
        )

    try:
        result = get_environmental_data(latitude, longitude)
    except Exception as exc:
        logger.error(
            "Unexpected error in environmental_data_endpoint for "
            f"({latitude}, {longitude}): {type(exc).__name__}: {exc}"
        )
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "Environmental data service encountered an unexpected error. Please try again.",
            },
        )

    if not result.get("success") and result.get("error"):
        # Outside region or geocoding failure — not a server error, return 200 with success=false
        return JSONResponse(content=result)

    return JSONResponse(content=result)


@app.post(
    "/api/predict",
    summary="Landslide risk prediction",
    description=(
        "Submit the 14 environmental and terrain features for a location and receive "
        "a calibrated landslide risk probability, risk category (NO RISK / LOW / "
        "MODERATE / HIGH / CRITICAL), contributing risk factors, and recommendation. "
        "The V2 model uses CalibratedClassifierCV (sigmoid) over XGBoost."
    ),
    responses={
        400: {"model": ErrorResponse, "description": "Input validation error"},
        422: {"description": "Pydantic field validation error"},
        503: {"model": ErrorResponse, "description": "Model not available"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
    tags=["Prediction"],
)
async def predict_endpoint(request: PredictionRequest) -> JSONResponse:
    """
    Landslide Risk Prediction — V2 CalibratedClassifierCV pipeline.

    **Risk categories and probability thresholds** (from config.py):

    | Category | Probability |
    |----------|-------------|
    | NO RISK  | 0.00 – 0.15 |
    | LOW      | 0.15 – 0.35 |
    | MODERATE | 0.35 – 0.60 |
    | HIGH     | 0.60 – 0.80 |
    | CRITICAL | 0.80 – 1.00 |

    Contributing factors are environmental indicators — not causal claims.
    """
    # Check model is available
    try:
        pipeline = load_model()
    except Exception:
        pipeline = None

    if pipeline is None:
        logger.error("Prediction requested but V2 model is not loaded.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is not available. Please contact the system administrator.",
        )

    # Convert Pydantic model to plain dict for the existing predict() function
    payload = request.model_dump()

    try:
        result = run_predict(payload)
        return JSONResponse(content=result)

    except ValueError as val_err:
        logger.warning(f"Prediction validation error: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except RuntimeError as rt_err:
        logger.error(f"Runtime error during prediction: {rt_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during risk assessment. Please try again.",
        )
    except Exception as exc:
        logger.error(
            f"Unexpected prediction error: {type(exc).__name__}: {exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred while processing the prediction.",
        )
