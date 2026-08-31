"""
CLIMORA Prediction Service
==========================
Handles model loading, single-instance inference, probability calibration,
risk category classification, dynamic contributing factor generation, and
recommendation assignment.
"""

import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import joblib
import pandas as pd
import numpy as np

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from config import (
    MODEL_PATH,
    METRICS_PATH,
    MODEL_VERSION,
    RISK_THRESHOLDS,
    RECOMMENDATIONS,
    DISCLAIMER,
    ALL_INPUT_FEATURES,
    NER_STATES_PENDING_VALIDATION,
)
from preprocessing import validate_and_format_input, generate_contributing_factors

logger = logging.getLogger("CLIMORA_PREDICT")

# Global pipeline instance — loaded once at startup, cached in RAM
_MODEL_PIPELINE = None
_MODEL_METADATA = None


def load_model():
    """
    Loads the trained scikit-learn + XGBoost pipeline from disk.
    Cached globally so inference requests execute immediately without reloading.
    """
    global _MODEL_PIPELINE
    if _MODEL_PIPELINE is None:
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        logger.info("📦 MODEL LOAD — first request, loading from disk")
        logger.info(f"   Path : {MODEL_PATH}")

        if not MODEL_PATH.exists():
            logger.error(f"   ✗ File not found: {MODEL_PATH}")
            raise FileNotFoundError(
                f"Trained model file not found at: {MODEL_PATH}. "
                "Please run 'python train_model.py' to generate the model artifact."
            )

        t0 = time.perf_counter()
        _MODEL_PIPELINE = joblib.load(MODEL_PATH)
        elapsed = (time.perf_counter() - t0) * 1000
        logger.info(f"   Type : {type(_MODEL_PIPELINE).__name__}")
        logger.info(f"   Time : {elapsed:.1f} ms")
        logger.info("   ✓ Model cached in RAM — future requests skip disk I/O")
        logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    else:
        logger.debug("📦 MODEL — already in RAM, skipping disk read")
    return _MODEL_PIPELINE


def load_model_metadata() -> Dict[str, Any]:
    """Load the selected prototype operating threshold once, with a safe fallback."""
    global _MODEL_METADATA
    if _MODEL_METADATA is None:
        _MODEL_METADATA = {
            "operating_threshold": {"selected_threshold": 0.50},
            "model_version": MODEL_VERSION,
        }
        if METRICS_PATH.exists():
            try:
                with open(METRICS_PATH, "r", encoding="utf-8") as metrics_file:
                    _MODEL_METADATA = json.load(metrics_file)
                logger.debug(f"📊 Metadata loaded from {METRICS_PATH}")
            except (OSError, json.JSONDecodeError) as e:
                logger.warning(f"⚠️  Could not read metrics file, using defaults: {e}")
    return _MODEL_METADATA


def get_risk_category(probability: float) -> str:
    """
    Maps prediction probability [0.0, 1.0] to one of 5 CLIMORA risk categories
    based on centralized configuration thresholds.
    """
    prob = max(0.0, min(1.0, float(probability)))
    for threshold, category in RISK_THRESHOLDS:
        if prob <= threshold:
            return category
    return "CRITICAL"


def get_recommendation(risk_category: str) -> str:
    """Returns the standard informational recommendation for the given risk tier."""
    return RECOMMENDATIONS.get(risk_category, RECOMMENDATIONS["LOW"])


def predict(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes end-to-end landslide risk prediction for a single data payload.
    """
    request_start = time.perf_counter()

    logger.info("")
    logger.info("╔══════════════════════════════════════════════╗")
    logger.info("║        CLIMORA PREDICTION PIPELINE START     ║")
    logger.info("╚══════════════════════════════════════════════╝")

    # ── STEP 1: Model availability check ──────────────────────────────────────
    logger.info("")
    logger.info("┌─ STEP 1: Model Availability Check")
    t1 = time.perf_counter()
    pipeline = load_model()
    step1_ms = (time.perf_counter() - t1) * 1000
    logger.info(f"│  ✓ Pipeline type  : {type(pipeline).__name__}")
    logger.info(f"│  ✓ Duration       : {step1_ms:.2f} ms")
    logger.info("└─────────────────────────────────────────────")

    # ── STEP 2: Input Validation & Preprocessing ───────────────────────────────
    logger.info("")
    logger.info("┌─ STEP 2: Input Validation & Preprocessing")
    logger.info(f"│  state_region     : {input_data.get('state_region', 'N/A')}")
    logger.info(f"│  land_cover       : {input_data.get('land_cover', 'N/A')}")
    logger.info(f"│  latitude         : {input_data.get('latitude', 'N/A')}")
    logger.info(f"│  longitude        : {input_data.get('longitude', 'N/A')}")
    logger.info(f"│  elevation_m      : {input_data.get('elevation_m', 'N/A')}")
    logger.info(f"│  slope_deg        : {input_data.get('slope_deg', 'N/A')}")
    logger.info(f"│  rainfall_mm      : {input_data.get('rainfall_mm', 'N/A')}")
    logger.info(f"│  soil_moisture    : {input_data.get('soil_moisture', 'N/A')}")
    logger.info(f"│  temperature_c    : {input_data.get('temperature_c', 'N/A')}")
    logger.info(f"│  humidity_pct     : {input_data.get('humidity_pct', 'N/A')}")
    logger.info(f"│  historical_count : {input_data.get('historical_landslide_count', 'N/A')}")
    logger.info(f"│  days_since_event : {input_data.get('days_since_previous_event', 'N/A')}")

    t2 = time.perf_counter()
    is_valid, error_msg, input_df = validate_and_format_input(input_data)
    step2_ms = (time.perf_counter() - t2) * 1000

    if not is_valid or input_df is None:
        logger.error(f"│  ✗ Validation FAILED: {error_msg}")
        logger.info("└─────────────────────────────────────────────")
        raise ValueError(error_msg or "Invalid input data format.")

    logger.info(f"│  ✓ Validation passed")
    logger.info(f"│  ✓ DataFrame shape : {input_df.shape}  (rows × features)")
    logger.info(f"│  ✓ Feature columns : {list(input_df.columns)}")
    logger.info(f"│  ✓ Duration        : {step2_ms:.2f} ms")
    logger.info("└─────────────────────────────────────────────")

    # ── STEP 3: XGBoost Model Inference ───────────────────────────────────────
    logger.info("")
    logger.info("┌─ STEP 3: XGBoost Model Inference")
    pipeline_repr = (
        [s[0] for s in pipeline.steps]
        if hasattr(pipeline, "steps")
        else type(pipeline).__name__
    )
    logger.info(f"│  Pipeline steps   : {pipeline_repr}")

    t3 = time.perf_counter()
    try:
        prob_arr = pipeline.predict_proba(input_df)
        landslide_prob = float(prob_arr[0, 1])
    except Exception as e:
        logger.error(f"│  ✗ Inference FAILED: {type(e).__name__}: {e}")
        logger.info("└─────────────────────────────────────────────")
        raise RuntimeError(f"Error during model inference: {str(e)}")
    step3_ms = (time.perf_counter() - t3) * 1000

    logger.info(f"│  Raw probabilities : class_0={prob_arr[0,0]:.4f}  class_1={prob_arr[0,1]:.4f}")
    logger.info(f"│  Landslide prob    : {landslide_prob:.6f}  ({landslide_prob * 100:.2f}%)")
    logger.info(f"│  ✓ Duration        : {step3_ms:.2f} ms")
    logger.info("└─────────────────────────────────────────────")

    # ── STEP 4: Risk Categorization ────────────────────────────────────────────
    logger.info("")
    logger.info("┌─ STEP 4: Risk Categorization")
    probability = round(landslide_prob, 4)
    probability_percent = round(landslide_prob * 100.0, 1)
    risk_category = get_risk_category(landslide_prob)
    metadata = load_model_metadata()
    operating_threshold = float(
        metadata.get("operating_threshold", {}).get("selected_threshold", 0.50)
    )
    binary_prediction = landslide_prob >= operating_threshold

    logger.info(f"│  Probability       : {probability}  ({probability_percent}%)")
    logger.info(f"│  Operating thresh  : {operating_threshold}")
    logger.info(f"│  Risk category     : ⚠️  {risk_category}")
    logger.info(f"│  Binary prediction : {'LANDSLIDE RISK' if binary_prediction else 'NO LANDSLIDE RISK'}")
    logger.info("└─────────────────────────────────────────────")

    # ── STEP 5: Contributing Factors ───────────────────────────────────────────
    logger.info("")
    logger.info("┌─ STEP 5: Contributing Factor Analysis")
    t5 = time.perf_counter()
    formatted_dict = input_df.iloc[0].to_dict()
    contributing_factors = generate_contributing_factors(formatted_dict, landslide_prob)
    step5_ms = (time.perf_counter() - t5) * 1000

    for f in contributing_factors:
        filled = f["impact"] // 10
        bar = "█" * filled + "░" * (10 - filled)
        logger.info(f"│  [{bar}] {f['impact']:3d}%  [{f['severity'].upper():<8}]  {f['name']}")
    logger.info(f"│  ✓ Duration : {step5_ms:.2f} ms")
    logger.info("└─────────────────────────────────────────────")

    # ── STEP 6: Recommendation & Regional Validation ───────────────────────────
    logger.info("")
    logger.info("┌─ STEP 6: Recommendation & Regional Status")
    recommendation = get_recommendation(risk_category)
    state_region = formatted_dict.get("state_region", "")
    is_pending_validation = state_region in NER_STATES_PENDING_VALIDATION
    validation_note = (
        "Prototype prediction — regional validation pending."
        if is_pending_validation
        else None
    )
    logger.info(f"│  State              : {state_region}")
    logger.info(f"│  Validation pending : {is_pending_validation}")
    logger.info(f"│  Recommendation     : {recommendation[:80]}...")
    logger.info("└─────────────────────────────────────────────")

    # ── PIPELINE SUMMARY ───────────────────────────────────────────────────────
    total_ms = (time.perf_counter() - request_start) * 1000
    logger.info("")
    logger.info("╔══════════════════════════════════════════════╗")
    logger.info("║         PREDICTION PIPELINE COMPLETE         ║")
    logger.info("╠══════════════════════════════════════════════╣")
    logger.info(f"║  Result      : {risk_category:<30}║")
    logger.info(f"║  Probability : {probability_percent:>5.1f}%  ({probability})          ║")
    logger.info(f"║  Total time  : {total_ms:>6.2f} ms                       ║")
    logger.info(f"║    Step 1 (model check) : {step1_ms:>6.2f} ms             ║")
    logger.info(f"║    Step 2 (preprocess)  : {step2_ms:>6.2f} ms             ║")
    logger.info(f"║    Step 3 (XGBoost)     : {step3_ms:>6.2f} ms             ║")
    logger.info(f"║    Step 5 (factors)     : {step5_ms:>6.2f} ms             ║")
    logger.info("╚══════════════════════════════════════════════╝")
    logger.info("")

    return {
        "success": True,
        "probability": probability,
        "probability_percent": probability_percent,
        "risk_category": risk_category,
        "binary_prediction_at_operating_threshold": binary_prediction,
        "operating_threshold": round(operating_threshold, 4),
        "contributing_factors": contributing_factors,
        "factors": contributing_factors,  # Aliased for frontend compatibility
        "recommendation": recommendation,
        "disclaimer": DISCLAIMER,
        "model_version": MODEL_VERSION,
        "regional_validation_pending": is_pending_validation,
        "validation_note": validation_note,
    }


# Warm up model on module import
try:
    load_model()
except Exception:
    pass
