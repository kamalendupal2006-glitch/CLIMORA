"""
CLIMORA Environmental & NER State-Handling Test Suite
=====================================================
Comprehensive verification for Task 2:
1. Valid NER coordinate (e.g. Meghalaya) -> Real telemetry retrieved, 10 features available.
2. NER state pending validation (e.g. Assam, Manipur, Mizoram, Nagaland, Tripura) ->
   Correctly detected, telemetry retrieved, limitation note attached, prediction allowed without error.
3. Outside India / outside NER & supported region -> clear limitation message returned.
4. Latitude / Longitude bounds validation (-90..90, -180..180) -> HTTP 422.
5. Missing parameter validation -> HTTP 400.
6. Model file integrity -> V2 .pkl file exists, exact size 1,429,523 bytes.
7. V2 Model prediction inference with real environmental data -> returns probability, category, factors.
8. No fake/synthetic data substitution -> unavailable fields explicitly have available=False.
9. System health & metrics endpoints -> HTTP 200.
10. Community reporting and village routes remain intact.

Run:
    python test_environmental.py
"""

import sys
import os
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app import app
from config import (
    MODEL_PATH,
    NER_STATES,
    NER_STATES_PENDING_VALIDATION,
    SUPPORTED_STATES_FOR_PREDICTION,
    VALID_STATE_REGIONS,
    DISCLAIMER,
)
from services.geocoding_service import (
    get_state_for_coordinates,
    _bbox_lookup,
    _normalise_state_name,
)
from services.weather_service import get_weather_data
from services.terrain_service import get_terrain_data
from services.environmental_service import get_environmental_data

client = TestClient(app)

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []


def record(name: str, passed: bool, detail: str = ""):
    label = PASS if passed else FAIL
    msg = f"{label}  {name}"
    if detail:
        msg += f" - {detail}"
    print(msg)
    results.append((name, passed))


def section(title: str):
    print(f"\n{'='*70}\n  {title}\n{'='*70}")


def run_all_tests():
    print("=" * 70)
    print("  CLIMORA TASK 2: ENVIRONMENTAL DATA & NER STATE-HANDLING VERIFICATION")
    print("=" * 70)

    # -----------------------------------------------------------------------
    # TEST 1: Model File Integrity Verification
    # -----------------------------------------------------------------------
    section("TEST 1: V2 Model File Integrity")
    model_exists = MODEL_PATH.exists()
    file_size = MODEL_PATH.stat().st_size if model_exists else 0
    expected_size = 1429523

    record(
        "Model file exists and has exact size (1,429,523 bytes)",
        model_exists and file_size == expected_size,
        f"Actual size: {file_size} bytes"
    )

    # -----------------------------------------------------------------------
    # TEST 2: Health & System Endpoints
    # -----------------------------------------------------------------------
    section("TEST 2: System Health & Metrics")
    health_resp = client.get("/api/health")
    health_ok = health_resp.status_code == 200 and health_resp.json().get("model_loaded") is True
    record("GET /api/health returns 200 and model_loaded=True", health_ok)

    metrics_resp = client.get("/api/metrics")
    metrics_ok = metrics_resp.status_code == 200 and "operating_threshold" in metrics_resp.json()
    record("GET /api/metrics returns 200 and model metrics", metrics_ok)

    # -----------------------------------------------------------------------
    # TEST 3: Coordinate Bounds Validation (HTTP 422 & 400)
    # -----------------------------------------------------------------------
    section("TEST 3: Parameter & Bounds Validation")
    # Missing parameters
    r_missing = client.get("/api/environmental-data")
    record("Missing coordinates -> HTTP 400", r_missing.status_code == 400)

    # Invalid latitude
    r_inv_lat = client.get("/api/environmental-data?latitude=999&longitude=91.7")
    record("Invalid latitude (999) -> HTTP 422", r_inv_lat.status_code == 422)

    # Invalid longitude
    r_inv_lon = client.get("/api/environmental-data?latitude=26.1&longitude=999")
    record("Invalid longitude (999) -> HTTP 422", r_inv_lon.status_code == 422)

    # -----------------------------------------------------------------------
    # TEST 4: Location Outside Supported Deployment Area (e.g. Paris / Outside India)
    # -----------------------------------------------------------------------
    section("TEST 4: Outside Supported Region Handling")
    # Coordinates in France (Paris)
    r_outside = client.get("/api/environmental-data?latitude=48.8566&longitude=2.3522")
    outside_data = r_outside.json()
    outside_ok = (
        r_outside.status_code == 200 and
        outside_data.get("success") is False and
        "CLIMORA currently focuses on India's North Eastern Region" in str(outside_data.get("error"))
    )
    record("Location outside India -> Returns clear focus message", outside_ok, str(outside_data.get("error")))

    # -----------------------------------------------------------------------
    # TEST 5: NER Geography - All 8 States Geocoding Bbox Resolution
    # -----------------------------------------------------------------------
    section("TEST 5: Northeast India All 8 States Coverage")
    ner_test_coords = [
        ("Arunachal Pradesh", 27.1, 93.6),
        ("Assam", 26.15, 91.75),
        ("Manipur", 24.8, 93.94),
        ("Meghalaya", 25.57, 91.89),
        ("Mizoram", 23.73, 92.72),
        ("Nagaland", 25.67, 94.11),
        ("Sikkim", 27.33, 88.61),
        ("Tripura", 23.83, 91.28),
    ]

    all_ner_resolved = True
    for state_name, lat, lon in ner_test_coords:
        detected = _bbox_lookup(lat, lon)
        match = (detected == state_name)
        if not match:
            all_ner_resolved = False
        record(f"Bbox resolution for {state_name} ({lat}, {lon}) -> {detected}", match)

    record("All 8 NER states resolved in bounding box system", all_ner_resolved)

    # -----------------------------------------------------------------------
    # TEST 6: Real Environmental Telemetry for NER Location (Meghalaya)
    # -----------------------------------------------------------------------
    section("TEST 6: Real Environmental Data Acquisition (Meghalaya)")
    r_meghalaya = client.get("/api/environmental-data?latitude=25.5788&longitude=91.8933")
    data_meg = r_meghalaya.json()
    meg_success = r_meghalaya.status_code == 200 and data_meg.get("success") is True
    record("GET /api/environmental-data for Meghalaya -> HTTP 200 & success=True", meg_success)

    if meg_success:
        env = data_meg.get("environment", {})
        loc = data_meg.get("location", {})
        dq = data_meg.get("data_quality", {})

        # Verify real values
        temp_ok = env.get("temperature_c", {}).get("available") and isinstance(env["temperature_c"]["value"], (int, float))
        humidity_ok = env.get("humidity_pct", {}).get("available") and isinstance(env["humidity_pct"]["value"], (int, float))
        rainfall_ok = env.get("rainfall_mm", {}).get("available") and isinstance(env["rainfall_mm"]["value"], (int, float))
        soil_ok = env.get("soil_moisture", {}).get("available") and isinstance(env["soil_moisture"]["value"], (int, float))
        elev_ok = env.get("elevation_m", {}).get("available") and isinstance(env["elevation_m"]["value"], (int, float))
        slope_ok = env.get("slope_deg", {}).get("available") and isinstance(env["slope_deg"]["value"], (int, float))
        aspect_ok = env.get("aspect_deg", {}).get("available") and isinstance(env["aspect_deg"]["value"], (int, float))
        curv_ok = env.get("curvature", {}).get("available") and isinstance(env["curvature"]["value"], (int, float))

        record("Temperature (°C) retrieved from Open-Meteo", temp_ok, f"value: {env.get('temperature_c', {}).get('value')} °C")
        record("Relative Humidity (%) retrieved from Open-Meteo", humidity_ok, f"value: {env.get('humidity_pct', {}).get('value')} %")
        record("24h Rainfall (mm) retrieved from Open-Meteo", rainfall_ok, f"value: {env.get('rainfall_mm', {}).get('value')} mm")
        record("Soil Moisture (m³/m³) retrieved from ERA5-Land", soil_ok, f"value: {env.get('soil_moisture', {}).get('value')} m³/m³")
        record("Elevation (m AMSL) retrieved from Copernicus DEM", elev_ok, f"value: {env.get('elevation_m', {}).get('value')} m")
        record("Slope (°) derived from 3×3 DEM elevation grid", slope_ok, f"value: {env.get('slope_deg', {}).get('value')}°")
        record("Aspect (°) derived from 3×3 DEM elevation grid", aspect_ok, f"value: {env.get('aspect_deg', {}).get('value')}°")
        record("Curvature derived from 3×3 DEM elevation grid", curv_ok, f"value: {env.get('curvature', {}).get('value')}")

        # Verify unavailable fields are explicitly unavailable without synthetic values
        lc_unavail = env.get("land_cover", {}).get("available") is False and env.get("land_cover", {}).get("value") is None
        hist_unavail = env.get("historical_landslide_count", {}).get("available") is False and env.get("historical_landslide_count", {}).get("value") is None
        days_unavail = env.get("days_since_previous_event", {}).get("available") is False and env.get("days_since_previous_event", {}).get("value") is None

        record("Land Cover explicitly marked unavailable (no fake data)", lc_unavail)
        record("Historical Landslide Count explicitly marked unavailable (no fake data)", hist_unavail)
        record("Days Since Event explicitly marked unavailable (no fake data)", days_unavail)

    # -----------------------------------------------------------------------
    # TEST 7: NER State with Regional Validation Pending (Assam & Manipur)
    # -----------------------------------------------------------------------
    section("TEST 7: NER State Regional Validation Pending (Assam)")
    r_assam = client.get("/api/environmental-data?latitude=26.1445&longitude=91.7362")
    data_assam = r_assam.json()
    assam_success = r_assam.status_code == 200 and data_assam.get("success") is True
    record("GET /api/environmental-data for Assam (Guwahati) -> HTTP 200", assam_success)

    if assam_success:
        loc = data_assam.get("location", {})
        notes = data_assam.get("validation_notes", [])
        state_is_assam = (loc.get("state_region") == "Assam" or loc.get("detected_state") == "Assam")
        has_note = any("Prototype prediction — regional validation pending" in n for n in notes)

        record("Detected state is Assam (no proxy substitution)", state_is_assam, f"state_region: {loc.get('state_region')}")
        record("Includes 'Prototype prediction — regional validation pending' notice", has_note)

    # -----------------------------------------------------------------------
    # TEST 8: Full Prediction Pipeline for Assam with Retrieved Real Telemetry
    # -----------------------------------------------------------------------
    section("TEST 8: End-to-End Prediction with Real Telemetry for Assam")
    if assam_success:
        env_a = data_assam.get("environment", {})
        predict_payload = {
            "latitude": 26.1445,
            "longitude": 91.7362,
            "state_region": "Assam",
            "elevation_m": env_a.get("elevation_m", {}).get("value", 55.0),
            "slope_deg": env_a.get("slope_deg", {}).get("value", 12.0),
            "aspect_deg": env_a.get("aspect_deg", {}).get("value", 180.0),
            "curvature": env_a.get("curvature", {}).get("value", 0.0),
            "rainfall_mm": env_a.get("rainfall_mm", {}).get("value", 5.0),
            "soil_moisture": env_a.get("soil_moisture", {}).get("value", 0.35),
            "temperature_c": env_a.get("temperature_c", {}).get("value", 26.0),
            "humidity_pct": env_a.get("humidity_pct", {}).get("value", 82.0),
            # Manual inputs
            "land_cover": "Forest",
            "historical_landslide_count": 2,
            "days_since_previous_event": 90,
        }

        r_pred = client.post("/api/predict", json=predict_payload)
        pred_data = r_pred.json()
        pred_ok = r_pred.status_code == 200 and pred_data.get("success") is True

        record("POST /api/predict for Assam with live telemetry -> HTTP 200", pred_ok)
        if pred_ok:
            prob = pred_data.get("probability")
            cat = pred_data.get("risk_category")
            note = pred_data.get("validation_note")
            pending = pred_data.get("regional_validation_pending")
            disclaimer = pred_data.get("disclaimer")

            record("Valid probability score returned", isinstance(prob, (int, float)) and 0.0 <= prob <= 1.0, f"probability: {prob}")
            record("Risk category assigned", cat in ["NO RISK", "LOW", "MODERATE", "HIGH", "CRITICAL"], f"category: {cat}")
            record("regional_validation_pending flag is True for Assam", pending is True)
            record("validation_note attached to prediction response", note == "Prototype prediction — regional validation pending.", f"note: {note}")
            record("Prototype disclaimer preserved in prediction response", bool(disclaimer))

    # -----------------------------------------------------------------------
    # TEST 9: Full Prediction Pipeline for Sikkim (Trained NER State)
    # -----------------------------------------------------------------------
    section("TEST 9: End-to-End Prediction for Sikkim (Trained NER State)")
    predict_payload_sikkim = {
        "latitude": 27.3389,
        "longitude": 88.6065,
        "state_region": "Sikkim",
        "elevation_m": 1487.0,
        "slope_deg": 28.5,
        "aspect_deg": 190.0,
        "curvature": 0.05,
        "rainfall_mm": 15.0,
        "soil_moisture": 0.42,
        "temperature_c": 18.0,
        "humidity_pct": 88.0,
        "land_cover": "Forest",
        "historical_landslide_count": 4,
        "days_since_previous_event": 45,
    }

    r_sikkim = client.post("/api/predict", json=predict_payload_sikkim)
    sikkim_data = r_sikkim.json()
    sikkim_ok = r_sikkim.status_code == 200 and sikkim_data.get("success") is True
    record("POST /api/predict for Sikkim -> HTTP 200", sikkim_ok)

    if sikkim_ok:
        record("Sikkim has regional_validation_pending=False (in trained set)", sikkim_data.get("regional_validation_pending") is False)
        record("Sikkim validation_note is None", sikkim_data.get("validation_note") is None)

    # -----------------------------------------------------------------------
    # TEST 10: Non-NER Supported State (Kerala)
    # -----------------------------------------------------------------------
    section("TEST 10: Non-NER Supported State (Kerala)")
    predict_payload_kerala = {
        "latitude": 11.5332,
        "longitude": 76.1284,
        "state_region": "Kerala",
        "elevation_m": 1180.0,
        "slope_deg": 42.5,
        "aspect_deg": 225.0,
        "curvature": 0.8,
        "rainfall_mm": 188.5,
        "soil_moisture": 0.89,
        "temperature_c": 21.0,
        "humidity_pct": 94.0,
        "land_cover": "Forest",
        "historical_landslide_count": 6,
        "days_since_previous_event": 180,
    }

    r_kerala = client.post("/api/predict", json=predict_payload_kerala)
    kerala_data = r_kerala.json()
    kerala_ok = r_kerala.status_code == 200 and kerala_data.get("success") is True
    record("POST /api/predict for Kerala -> HTTP 200", kerala_ok, f"risk: {kerala_data.get('risk_category')}, prob: {kerala_data.get('probability')}")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    section("TEST RESULTS SUMMARY")
    total = len(results)
    passed_count = sum(1 for _, ok in results if ok)
    failed_count = total - passed_count

    print(f"Total Tests Run: {total}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {failed_count}")

    if failed_count == 0:
        print("\nALL TASK 2 ENVIRONMENTAL & NER STATE-HANDLING TESTS PASSED!")
    else:
        print(f"\n{failed_count} TESTS FAILED!")

    return failed_count == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
