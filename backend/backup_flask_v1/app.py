"""
CLIMORA Flask REST API
======================
Exposes the Machine Learning inference pipeline for the CLIMORA Landslide
Risk Prediction and Early-Warning Platform.
"""

import sys
import json
import logging
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS

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
    DISCLAIMER
)
from predict import load_model, predict

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("CLIMORA_API")

# Initialize Flask application
app = Flask(__name__)

# Configure CORS for React frontend origins
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": CORS_ORIGINS,
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    }
)

# Pre-load model pipeline on server boot
try:
    load_model()
    logger.info("CLIMORA ML model pipeline successfully loaded into memory.")
except Exception as e:
    logger.error(f"Failed to load model on startup: {str(e)}")


@app.route("/", methods=["GET"])
def root():
    """Root metadata endpoint."""
    return jsonify({
        "service": "CLIMORA Landslide Risk Prediction API",
        "version": MODEL_VERSION,
        "status": "online",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict",
            "metrics": "/api/metrics"
        }
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint returning service status and model readiness.
    """
    is_loaded = False
    try:
        pipeline = load_model()
        is_loaded = pipeline is not None
    except Exception:
        is_loaded = False

    return jsonify({
        "status": "ok" if is_loaded else "degraded",
        "service": "CLIMORA ML API",
        "model_loaded": is_loaded
    }), (200 if is_loaded else 503)


@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """
    Returns the prototype model evaluation metrics generated during training.
    """
    if not METRICS_PATH.exists():
        return jsonify({
            "error": "Model metrics report not found. Please train the model first."
        }), 404

    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error reading metrics report: {str(e)}")
        return jsonify({"error": "Failed to read metrics report."}), 500


@app.route("/api/predict", methods=["POST"])
def predict_endpoint():
    """
    Landslide Risk Prediction Endpoint.
    Accepts JSON payload of topographic, environmental, and geological parameters.
    """
    # 1. Verify Content-Type
    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Invalid Content-Type. Expected application/json."
        }), 400

    # 2. Parse JSON payload
    try:
        payload = request.get_json(silent=True)
    except Exception:
        return jsonify({
            "success": False,
            "error": "Malformed JSON payload in request body."
        }), 400

    if payload is None:
        return jsonify({
            "success": False,
            "error": "Empty or unparseable JSON payload."
        }), 400

    # 3. Perform ML Inference
    try:
        result = predict(payload)
        return jsonify(result), 200

    except ValueError as val_err:
        logger.warning(f"Validation error: {str(val_err)}")
        return jsonify({
            "success": False,
            "error": str(val_err)
        }), 400

    except Exception as exc:
        logger.error(f"Unexpected server error during prediction: {str(exc)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": "An internal server error occurred while processing the prediction."
        }), 500


@app.errorhandler(404)
def not_found_handler(e):
    return jsonify({"error": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed_handler(e):
    return jsonify({"error": "Method not allowed for requested endpoint."}), 405


@app.errorhandler(500)
def internal_server_error_handler(e):
    return jsonify({"error": "Internal server error."}), 500


if __name__ == "__main__":
    logger.info(f"Starting CLIMORA Flask REST API server on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False)
