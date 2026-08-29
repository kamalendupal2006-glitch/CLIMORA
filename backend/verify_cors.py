import requests
import json

base_url = "http://127.0.0.1:5000"
test_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002"
]

print("=== 1. Testing GET /api/health ===")
for orig in test_origins:
    r = requests.get(f"{base_url}/api/health", headers={"Origin": orig})
    allow_orig = r.headers.get("Access-Control-Allow-Origin")
    print(f"Origin: {orig:<24} -> Status: {r.status_code}, Allow-Origin: {allow_orig}")
    assert r.status_code == 200
    assert allow_orig == orig

print("\n=== 2. Testing OPTIONS Preflight on /api/predict ===")
for orig in test_origins:
    r_opt = requests.options(
        f"{base_url}/api/predict",
        headers={
            "Origin": orig,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        }
    )
    allow_orig = r_opt.headers.get("Access-Control-Allow-Origin")
    print(f"Origin: {orig:<24} -> Preflight Status: {r_opt.status_code}, Allow-Origin: {allow_orig}")
    assert r_opt.status_code == 200
    assert allow_orig == orig

print("\n=== 3. Testing POST /api/predict with 14-feature payload from http://localhost:3002 ===")
payload_14 = {
    "latitude": 30.5,
    "longitude": 78.2,
    "state_region": "Uttarakhand",
    "elevation_m": 1800,
    "slope_deg": 28,
    "aspect_deg": 150,
    "curvature": 0.1,
    "rainfall_mm": 250,
    "soil_moisture": 0.72,
    "temperature_c": 18,
    "humidity_pct": 82,
    "land_cover": "Forest",
    "historical_landslide_count": 3,
    "days_since_previous_event": 420
}

r_post = requests.post(
    f"{base_url}/api/predict",
    json=payload_14,
    headers={"Origin": "http://localhost:3002"}
)

print("POST Status Code:", r_post.status_code)
print("Access-Control-Allow-Origin Header:", r_post.headers.get("Access-Control-Allow-Origin"))
print("Response JSON:")
print(json.dumps(r_post.json(), indent=2))

assert r_post.status_code == 200
assert r_post.json()["success"] is True
assert r_post.headers.get("Access-Control-Allow-Origin") == "http://localhost:3002"

print("\nALL 6 ORIGIN CHECKS AND PREDICTIONS VERIFIED SUCCESSFULLY!")
