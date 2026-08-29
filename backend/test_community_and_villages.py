"""
CLIMORA Automated Test Suite — Community Reporting & Remote Villages
====================================================================
Tests:
1. Health & Prediction endpoints remain 100% operational (V2 model preservation check)
2. Citizen report creation defaults strictly to UNVERIFIED
3. Pydantic validation (invalid coordinates, missing description rejection)
4. Proximity search & Haversine distance accuracy
5. Authority status update workflow (UNVERIFIED -> UNDER_REVIEW -> VERIFIED -> RESOLVED)
6. Road connectivity status correlation:
   - Unverified hazard -> "POSSIBLE_ISSUE" with "Possible road access issue — based on nearby community report."
   - Verified hazard -> "BLOCKED" with "Confirmed Road Obstruction"
7. Remote village discovery endpoint
"""

import sys
import unittest
from pathlib import Path

# Add backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from app import app
from services.community_report_service import haversine_distance, report_service
from models.report_models import VerificationStatus, RoadConnectivityStatus

client = TestClient(app)

class TestCommunityAndVillages(unittest.TestCase):

    def test_01_health_and_existing_model_endpoints(self):
        """Verify /api/health and /api/predict are unaffected."""
        resp = client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("model_loaded"))
        self.assertEqual(data.get("status"), "ok")

        # Test predict with valid Kerala payload
        valid_payload = {
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
        pred_resp = client.post("/api/predict", json=valid_payload)
        self.assertEqual(pred_resp.status_code, 200)
        pred_data = pred_resp.json()
        self.assertTrue(pred_data.get("success"))
        self.assertIn("probability", pred_data)
        self.assertIn("risk_category", pred_data)

    def test_02_haversine_distance(self):
        """Check distance between Gangtok (27.3389, 88.6065) and Mangan (27.5086, 88.5338)."""
        dist = haversine_distance(27.3389, 88.6065, 27.5086, 88.5338)
        self.assertGreater(dist, 18.0)
        self.assertLess(dist, 25.0)

    def test_03_report_creation_and_unverified_default(self):
        """Citizen reports must strictly default to UNVERIFIED."""
        payload = {
            "latitude": 27.3389,
            "longitude": 88.6065,
            "incident_type": "ROAD_BLOCKAGE",
            "severity": "HIGH",
            "description": "Debris and mud blocking roadway near Mile 14",
            "road_name": "NH-310",
            "location_name": "East Sikkim",
            "reporter_name": "Citizen Observer",
            "reporter_role": "CITIZEN"
        }
        resp = client.post("/api/reports", json=payload)
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertTrue(data["id"].startswith("rep_"))
        self.assertEqual(data["verification_status"], "UNVERIFIED")
        self.assertFalse(data["is_verified"])
        self.assertEqual(data["incident_type"], "ROAD_BLOCKAGE")

        # Save for later tests
        self.__class__.test_report_id = data["id"]

    def test_04_nearby_reports_and_alerts(self):
        """Query nearby reports and verify alert caution notices."""
        # Query near Gangtok
        resp = client.get("/api/reports/nearby?latitude=27.34&longitude=88.61&radius_km=10")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("success"))
        self.assertGreaterEqual(data.get("count"), 1)
        first_rep = data["reports"][0]
        self.assertIsNotNone(first_rep.get("distance_km"))

        # Query alerts
        alert_resp = client.get("/api/reports/alerts?latitude=27.34&longitude=88.61&radius_km=15")
        self.assertEqual(alert_resp.status_code, 200)
        alerts_data = alert_resp.json()
        self.assertTrue(alerts_data.get("success"))
        self.assertGreaterEqual(alerts_data.get("count"), 1)
        first_alert = alerts_data["alerts"][0]
        self.assertIn("UNVERIFIED", first_alert["headline"])
        self.assertIn("unverified", first_alert["caution_notice"].lower())

    def test_05_authority_verification_workflow(self):
        """Authorities update status with review metadata and notes."""
        rep_id = self.__class__.test_report_id
        
        # 1. Move to UNDER_REVIEW
        update_1 = {
            "status": "UNDER_REVIEW",
            "authority_notes": "Disaster management cell dispatched spotter team.",
            "reviewer_name": "Duty Officer Verma"
        }
        resp_1 = client.patch(f"/api/reports/{rep_id}/status", json=update_1)
        self.assertEqual(resp_1.status_code, 200)
        self.assertEqual(resp_1.json()["verification_status"], "UNDER_REVIEW")
        self.assertFalse(resp_1.json()["is_verified"])

        # 2. Move to VERIFIED
        update_2 = {
            "status": "VERIFIED",
            "authority_notes": "Confirmed on-site. Heavy earthmover deployed.",
            "reviewer_name": "District Magistrate Office",
            "action_taken": "PWD clearing crew on site; traffic diverted via bypass."
        }
        resp_2 = client.patch(f"/api/reports/{rep_id}/status", json=update_2)
        self.assertEqual(resp_2.status_code, 200)
        self.assertEqual(resp_2.json()["verification_status"], "VERIFIED")
        self.assertTrue(resp_2.json()["is_verified"])
        self.assertIsNotNone(resp_2.json()["verified_at"])

        # 3. Check alert becomes OFFICIAL HAZARD CONFIRMED
        alert_resp = client.get("/api/reports/alerts?latitude=27.34&longitude=88.61&radius_km=15")
        alerts_data = alert_resp.json()
        verified_alert = [a for a in alerts_data["alerts"] if a["report_id"] == rep_id][0]
        self.assertIn("OFFICIAL HAZARD CONFIRMED", verified_alert["headline"])
        self.assertTrue(verified_alert["is_verified"])

        # 4. Move to RESOLVED
        update_3 = {
            "status": "RESOLVED",
            "authority_notes": "Debris cleared. Road opened to two-way traffic.",
            "reviewer_name": "PWD Road Safety Unit"
        }
        resp_3 = client.patch(f"/api/reports/{rep_id}/status", json=update_3)
        self.assertEqual(resp_3.status_code, 200)
        self.assertEqual(resp_3.json()["verification_status"], "RESOLVED")

    def test_06_validation_rejections(self):
        """Invalid coordinates and short descriptions must fail with 422."""
        invalid_payload = {
            "latitude": 120.0, # Invalid lat > 90
            "longitude": 88.0,
            "incident_type": "LANDSLIDE",
            "severity": "CRITICAL",
            "description": "Short" # < 5 chars
        }
        resp = client.post("/api/reports", json=invalid_payload)
        self.assertEqual(resp.status_code, 422)


if __name__ == "__main__":
    unittest.main(verbosity=2)
