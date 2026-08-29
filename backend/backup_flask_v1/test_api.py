import requests
import json

base_url = "http://127.0.0.1:5000"

print("==================================================")
print(" CLIMORA BACKEND REST API END-TO-END TEST SUITE ")
print("==================================================")

# 1. Root & Health Check
r_health = requests.get(f"{base_url}/api/health")
print("\n[TEST 1] GET /api/health")
print("Status:", r_health.status_code)
print("Payload:", json.dumps(r_health.json(), indent=2))
assert r_health.status_code == 200
assert r_health.json()["model_loaded"] is True

# 2. CORS Preflight Check
r_cors = requests.options(
    f"{base_url}/api/predict",
    headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
)
print("\n[TEST 2] OPTIONS /api/predict (CORS Preflight)")
print("Status:", r_cors.status_code)
print("Allow-Origin:", r_cors.headers.get("Access-Control-Allow-Origin"))
assert r_cors.headers.get("Access-Control-Allow-Origin") in ["http://localhost:3000", "http://127.0.0.1:3000"]

# 3. Valid Predictions Across All Risk Categories
scenarios = [
    {
        "name": "Wayanad Disaster (Critical / High Scenario)",
        "payload": {
            "latitude": 11.5332,
            "longitude": 76.1284,
            "rainfall": 188.5,
            "temperature": 21.0,
            "soil_moisture": 89.0,
            "slope": 42.5,
            "elevation": 1180,
            "soil_type": "weathered_rock",
            "state_region": "Kerala"
        }
    },
    {
        "name": "Shimla Cloudburst (High / Moderate Scenario)",
        "payload": {
            "latitude": 31.1048,
            "longitude": 77.1734,
            "rainfall": 115.0,
            "temperature": 16.0,
            "soil_moisture": 75.0,
            "slope": 37.0,
            "elevation": 2200,
            "soil_type": "silty_clay",
            "state_region": "Himachal Pradesh"
        }
    },
    {
        "name": "Munnar Moderate Slope (Moderate Scenario)",
        "payload": {
            "latitude": 10.0889,
            "longitude": 77.0595,
            "rainfall": 45.0,
            "temperature": 19.5,
            "soil_moisture": 56.0,
            "slope": 28.0,
            "elevation": 1540,
            "soil_type": "clay_loam",
            "state_region": "Kerala"
        }
    },
    {
        "name": "Dehradun Valley (Low / No Risk Scenario)",
        "payload": {
            "latitude": 30.3165,
            "longitude": 78.0322,
            "rainfall": 10.0,
            "temperature": 25.0,
            "soil_moisture": 30.0,
            "slope": 14.0,
            "elevation": 640,
            "soil_type": "sandy_loam",
            "state_region": "Uttarakhand"
        }
    }
]

print("\n[TEST 3] Testing Real Scenarios via POST /api/predict:")
for sc in scenarios:
    res = requests.post(f"{base_url}/api/predict", json=sc["payload"])
    assert res.status_code == 200
    data = res.json()
    print(f"\n--- Scenario: {sc['name']} ---")
    print(f"  Probability:          {data['probability']} ({data['probability_percent']}%)")
    print(f"  Risk Category:        {data['risk_category']}")
    print(f"  Recommendation:       {data['recommendation']}")
    print(f"  Top Contributing:     {data['contributing_factors'][0]['name']} ({data['contributing_factors'][0]['value']}) - impact {data['contributing_factors'][0]['impact']}%")

# 4. Error validation tests
print("\n[TEST 4] Error Handling Tests (HTTP 400 Verification):")
bad_requests = [
    ({"latitude": 999, "longitude": 78.0}, "Out of range latitude"),
    ({"latitude": "invalid_num", "longitude": 78.0}, "Non-numeric latitude"),
    ({"slope": -10}, "Negative slope"),
]

for bad_payload, label in bad_requests:
    r_err = requests.post(f"{base_url}/api/predict", json=bad_payload)
    print(f"  {label:<25} -> Status: {r_err.status_code}, Error: {r_err.json().get('error')}")
    assert r_err.status_code == 400

print("\n==================================================")
print(" ALL AUTOMATED TESTS PASSED WITH 100% SUCCESS! ")
print("==================================================")
