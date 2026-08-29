"""
CLIMORA Prediction Service
==========================
Handles model loading, single-instance inference, probability calibration,
risk category classification, dynamic contributing factor generation, and
recommendation assignment.
"""

import sys
import json
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

# Global pipeline instance (Loaded once on startup)
_MODEL_PIPELINE = None
_MODEL_METADATA = None


def load_model():
    """
    Loads the trained scikit-learn + XGBoost pipeline from disk.
    Cached globally so inference requests execute immediately without reloading.
    """
    global _MODEL_PIPELINE
    if _MODEL_PIPELINE is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model file not found at: {MODEL_PATH}. "
                "Please run 'python train_model.py' to generate the model artifact."
            )
        _MODEL_PIPELINE = joblib.load(MODEL_PATH)
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
            except (OSError, json.JSONDecodeError):
                pass
    return _MODEL_METADATA


def get_risk_category(probability: float) -> str:
    """
    Maps prediction probability [0.0, 1.0] to one of 5 CLIMORA risk categories
    based on centralized configuration thresholds.
    """
    # Clamp probability to [0.0, 1.0]
    prob = max(0.0, min(1.0, float(probability)))

    for threshold, category in RISK_THRESHOLDS:
        if prob <= threshold:
            return category
    return "CRITICAL"


def get_recommendation(risk_category: str) -> str:
    """
    Returns the standard informational recommendation for the given risk tier.
    """
    return RECOMMENDATIONS.get(
        risk_category,
        RECOMMENDATIONS["LOW"]
    )


def predict(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes end-to-end landslide risk prediction for a single data payload.

    Parameters:
        input_data: Dictionary containing geographic, topographic, and weather parameters.

    Returns:
        Dict[str, Any]: Formatted prediction result including probability, category,
                        contributing factors, recommendation, and metadata.

    Raises:
        ValueError: If input validation fails.
        RuntimeError: If model inference fails.
    """
    # 1. Ensure model is loaded
    pipeline = load_model()

    # 2. Validate and standardize inputs
    is_valid, error_msg, input_df = validate_and_format_input(input_data)
    if not is_valid or input_df is None:
        raise ValueError(error_msg or "Invalid input data format.")

    # 3. Model Inference
    try:
        prob_arr = pipeline.predict_proba(input_df)
        landslide_prob = float(prob_arr[0, 1])
    except Exception as e:
        raise RuntimeError(f"Error during model inference: {str(e)}")

    # 4. Calibration & Risk Categorization
    probability = round(landslide_prob, 4)
    probability_percent = round(landslide_prob * 100.0, 1)
    risk_category = get_risk_category(landslide_prob)
    metadata = load_model_metadata()
    operating_threshold = float(
        metadata.get("operating_threshold", {}).get("selected_threshold", 0.50)
    )

    # 5. Contributing Factors & Explanations
    # Extract flat dict for factor calculation
    formatted_dict = input_df.iloc[0].to_dict()
    contributing_factors = generate_contributing_factors(formatted_dict, landslide_prob)

    # 6. Recommendation Logic
    recommendation = get_recommendation(risk_category)

    # 7. Regional Validation Status for Northeast India
    state_region = formatted_dict.get("state_region", "")
    is_pending_validation = state_region in NER_STATES_PENDING_VALIDATION
    validation_note = (
        "Prototype prediction — regional validation pending."
        if is_pending_validation
        else None
    )

    # 8. Standardized Response Payload
    return {
        "success": True,
        "probability": probability,
        "probability_percent": probability_percent,
        "risk_category": risk_category,
        "binary_prediction_at_operating_threshold": landslide_prob >= operating_threshold,
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
