"""Smoke-test the versioned CLIMORA Flask API without starting a network server."""

import json

from app import app
from config import MODEL_VERSION


VALID_PAYLOAD = {
    "latitude": 25.5788,
    "longitude": 91.8933,
    "state_region": "Meghalaya",
    "elevation_m": 1496,
    "slope_deg": 34.2,
    "aspect_deg": 145,
    "curvature": 0.1,
    "rainfall_mm": 172.4,
    "soil_moisture": 0.79,
    "temperature_c": 20.0,
    "humidity_pct": 88.0,
    "land_cover": "Forest",
    "historical_landslide_count": 4,
    "days_since_previous_event": 420,
}


def main() -> None:
    client = app.test_client()
    headers = {"Origin": "http://localhost:3000"}
    health = client.get("/api/health", headers=headers)
    metrics = client.get("/api/metrics")
    prediction = client.post("/api/predict", json=VALID_PAYLOAD, headers=headers)
    invalid = client.post("/api/predict", json={"latitude": 999, "longitude": 91.8})

    assert health.status_code == 200 and health.json["model_loaded"] is True
    assert metrics.status_code == 200 and metrics.json["model_version"] == MODEL_VERSION
    assert prediction.status_code == 200 and prediction.json["success"] is True
    assert prediction.json["model_version"] == MODEL_VERSION
    assert isinstance(prediction.json["binary_prediction_at_operating_threshold"], bool)
    assert prediction.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert invalid.status_code == 400

    print(
        json.dumps(
            {
                "health_status": health.status_code,
                "metrics_status": metrics.status_code,
                "predict_status": prediction.status_code,
                "invalid_input_status": invalid.status_code,
                "model_version": prediction.json["model_version"],
                "operating_threshold": prediction.json["operating_threshold"],
            },
            indent=2,
        )
    )
    print("CLIMORA v2 API smoke test passed.")


if __name__ == "__main__":
    main()
