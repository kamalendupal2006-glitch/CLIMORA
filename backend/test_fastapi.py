"""
CLIMORA FastAPI Migration -- Test Suite
=======================================
Tests 1-9 as specified in the migration requirements.
Run: python test_fastapi.py
"""
import sys
import json
import re
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:5000"
PASS = "[PASS]"
FAIL = "[FAIL]"
results = []


def http_get(path):
    resp = urllib.request.urlopen(BASE + path, timeout=10)
    return resp.status, json.loads(resp.read())


def http_post(path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path, data=data,
        headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def http_options(path, origin):
    req = urllib.request.Request(
        BASE + path, method="OPTIONS",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
    )
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return resp.status, dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers)


def section(title):
    print(f"\n{'='*60}\n  {title}\n{'='*60}")


def record(name, passed):
    label = PASS if passed else FAIL
    print(f"\n{label}  {name}")
    results.append((name, passed))
    return passed


# -----------------------------------------------------------------------
# Valid Kerala payload (from specification)
# -----------------------------------------------------------------------
VALID_PAYLOAD = {
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

# -----------------------------------------------------------------------
# TEST 1: Server is reachable
# -----------------------------------------------------------------------
section("TEST 1: FastAPI server is running at http://127.0.0.1:5000")
try:
    status, body = http_get("/")
    t1 = status == 200
    print(json.dumps(body, indent=2))
except Exception as e:
    print(f"Connection error: {e}")
    t1 = False
record("Server reachable at http://127.0.0.1:5000", t1)

# -----------------------------------------------------------------------
# TEST 2: GET /api/health
# -----------------------------------------------------------------------
section("TEST 2: GET /api/health -- model_loaded must be true")
status, body = http_get("/api/health")
print(json.dumps(body, indent=2))
t2 = (
    status == 200
    and body.get("status") == "ok"
    and body.get("service") == "CLIMORA ML API"
    and body.get("model_loaded") is True
)
record("GET /api/health  HTTP 200, model_loaded=true", t2)

# -----------------------------------------------------------------------
# TEST 3: /docs and /redoc load
# -----------------------------------------------------------------------
section("TEST 3: FastAPI docs at /docs and /redoc")
try:
    r_docs = urllib.request.urlopen(BASE + "/docs", timeout=10)
    docs_ok = r_docs.status == 200 and b"swagger" in r_docs.read().lower()
except Exception as e:
    print(f"/docs error: {e}")
    docs_ok = False

try:
    r_redoc = urllib.request.urlopen(BASE + "/redoc", timeout=10)
    redoc_ok = r_redoc.status == 200 and b"redoc" in r_redoc.read().lower()
except Exception as e:
    print(f"/redoc error: {e}")
    redoc_ok = False

print(f"  /docs  accessible: {docs_ok}")
print(f"  /redoc accessible: {redoc_ok}")
t3 = docs_ok and redoc_ok
record("/docs and /redoc return HTTP 200 with expected content", t3)

# -----------------------------------------------------------------------
# TEST 4: POST /api/predict -- valid Kerala payload
# -----------------------------------------------------------------------
section("TEST 4: POST /api/predict -- valid Kerala payload (V2 CalibratedClassifierCV)")
status, body = http_post("/api/predict", VALID_PAYLOAD)
print(json.dumps(body, indent=2))
t4 = (
    status == 200
    and body.get("success") is True
    and isinstance(body.get("probability"), (int, float))
    and 0.0 <= body["probability"] <= 1.0
    and body.get("risk_category") in ["NO RISK", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    and isinstance(body.get("contributing_factors"), list)
    and isinstance(body.get("recommendation"), str)
    and "model_version" in body
)
print(f"\n  probability      : {body.get('probability')}")
print(f"  probability_pct  : {body.get('probability_percent')}%")
print(f"  risk_category    : {body.get('risk_category')}")
print(f"  model_version    : {body.get('model_version')}")
record("POST /api/predict valid payload -> HTTP 200 with V2 probability", t4)

# -----------------------------------------------------------------------
# TEST 5: slope_deg = 999 rejected
# -----------------------------------------------------------------------
section("TEST 5: slope_deg=999 -- must be rejected (HTTP 422)")
bad_slope = {**VALID_PAYLOAD, "slope_deg": 999}
status, body = http_post("/api/predict", bad_slope)
print(json.dumps(body, indent=2))
t5 = status == 422
record("Invalid slope_deg=999 -> HTTP 422", t5)

# -----------------------------------------------------------------------
# TEST 6: invalid land_cover rejected
# -----------------------------------------------------------------------
section("TEST 6: invalid land_cover -- must be rejected (HTTP 422)")
bad_cover = {**VALID_PAYLOAD, "land_cover": "SATELLITE_BIOMASS"}
status, body = http_post("/api/predict", bad_cover)
print(json.dumps(body, indent=2))
t6 = status == 422
record("Invalid land_cover -> HTTP 422", t6)

# -----------------------------------------------------------------------
# TEST 7: rainfall_mm missing
# -----------------------------------------------------------------------
section("TEST 7: rainfall_mm omitted -- must be rejected (HTTP 422)")
missing_rain = {k: v for k, v in VALID_PAYLOAD.items() if k != "rainfall_mm"}
status, body = http_post("/api/predict", missing_rain)
print(json.dumps(body, indent=2))
t7 = status == 422
record("Missing rainfall_mm -> HTTP 422", t7)

# -----------------------------------------------------------------------
# TEST 8: No traceback / filesystem paths in error responses
# -----------------------------------------------------------------------
section("TEST 8: Error responses must NOT expose tracebacks or paths")
_, err_body = http_post("/api/predict", bad_slope)
body_str = json.dumps(err_body)
has_traceback = bool(re.search(
    r"Traceback|File \"|\.py.*line \d+|C:\\\\Users|\\\\scratch|\\\\climora",
    body_str
))
print(f"  Error body: {body_str[:300]}")
t8 = not has_traceback
record("No traceback or filesystem paths in error response", t8)

# -----------------------------------------------------------------------
# TEST 9: CORS -- frontend origins accepted
# -----------------------------------------------------------------------
section("TEST 9: CORS preflight for frontend origins")
cors_results = []
for origin in [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]:
    try:
        s, hdrs = http_options("/api/predict", origin)
        allow_origin = hdrs.get("access-control-allow-origin", "")
        ok = allow_origin == origin
        cors_results.append(ok)
        status_label = "OK" if ok else "FAIL"
        print(f"  [{status_label}] Origin: {origin}  -> Allow-Origin: '{allow_origin}'")
    except Exception as e:
        print(f"  [FAIL] Origin: {origin}  -> Error: {e}")
        cors_results.append(False)

# Also verify wildcard is NOT used
_, hdrs_any = http_options("/api/predict", "http://evil.example.com")
wildcard_used = hdrs_any.get("access-control-allow-origin", "") == "*"
print(f"\n  Wildcard CORS used: {wildcard_used}  (expected: False)")
t9 = all(cors_results) and not wildcard_used
record("CORS: known frontend origins accepted, wildcard NOT used", t9)

# -----------------------------------------------------------------------
# BONUS: leakage field 'landslide' ignored
# -----------------------------------------------------------------------
section("BONUS: 'landslide' and 'risk_category_prototype' leakage fields ignored")
leakage_payload = {**VALID_PAYLOAD, "landslide": 1, "risk_category_prototype": "HIGH"}
status, body = http_post("/api/predict", leakage_payload)
t_bonus = status == 200 and body.get("success") is True
print(f"  Status: {status}, success: {body.get('success')}")
record("Leakage fields silently ignored, prediction succeeds", t_bonus)

# -----------------------------------------------------------------------
# GET /api/metrics
# -----------------------------------------------------------------------
section("BONUS: GET /api/metrics -- V2 metrics report")
try:
    status, body = http_get("/api/metrics")
    metrics_ok = status == 200 and "model_version" in body
    print(f"  Status: {status}")
    print(f"  model_version: {body.get('model_version')}")
    print(f"  operating_threshold.selected_threshold: "
          f"{body.get('operating_threshold', {}).get('selected_threshold')}")
except Exception as e:
    print(f"  Error: {e}")
    metrics_ok = False
record("GET /api/metrics returns V2 metrics JSON", metrics_ok)

# -----------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------
section("RESULTS SUMMARY")
all_passed = True
for name, passed in results:
    label = PASS if passed else FAIL
    print(f"  {label}  {name}")
    if not passed:
        all_passed = False

print(f"\n{'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
sys.exit(0 if all_passed else 1)
