"""
CLIMORA Remote Village Discovery Service
=========================================
Discovers real-world villages, hamlets, and settlements near user GPS coordinates
using authoritative geospatial data (OpenStreetMap Overpass API).

Integrates dynamic road connectivity analysis:
- Cross-references active hazard and road blockage reports from the Community Report Service.
- Strict wording rules:
  * Unverified reports: "Possible road access issue — based on nearby community report."
  * Verified reports only: "Confirmed Road Obstruction" / "BLOCKED".
  * Never invents village coordinates or fabricated places.

Future integration targets:
- Census of India 2011/2021 Village Directory API
- Pradhan Mantri Gram Sadak Yojana (PMGSY) Rural Road Connectivity Database
- PostGIS Regional Village Geodatabase
"""

import logging
import math
from typing import Any, Dict, List, Optional, Tuple
import httpx

from models.report_models import (
    IncidentType,
    RemoteVillage,
    RoadConnectivityStatus,
    VerificationStatus,
)
from services.cache import TTLCache
from services.community_report_service import haversine_distance, report_service

logger = logging.getLogger("CLIMORA_VILLAGE_SERVICE")

village_cache = TTLCache()

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
OVERPASS_TIMEOUT_S = 12.0


class RemoteVillageService:
    """Service retrieving real remote settlements and assessing road connectivity."""

    async def get_nearby_villages(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 25.0,
        limit: int = 30,
    ) -> Dict[str, Any]:
        """
        Discover settlements within radius_km of coordinates.
        Queries real OSM data and correlates with active community reports.
        """
        # Bounding box sanity check (India region approx: 6.0 to 37.5 N, 68.0 to 98.0 E)
        if not (6.0 <= latitude <= 37.5 and 68.0 <= longitude <= 98.0):
            return {
                "success": False,
                "error": "Coordinates are outside the supported Indian terrain and North Eastern Region.",
                "villages": [],
                "data_source": "OpenStreetMap Overpass API",
            }

        # Check in-memory cache (TTL: 1 hour for geographic settlements)
        cache_key = f"villages:{round(latitude, 3)}:{round(longitude, 3)}:{int(radius_km)}"
        cached_result = village_cache.get(cache_key)
        if cached_result is not None:
            # Re-correlate latest road connectivity dynamically even if village points are cached
            villages = self._correlate_connectivity(cached_result, latitude, longitude)
            return {
                "success": True,
                "count": len(villages),
                "villages": villages[:limit],
                "data_source": "OpenStreetMap Overpass API (Cached)",
                "note": "Village locations are retrieved from real OpenStreetMap geographic data.",
            }

        # Fetch real places from Overpass API
        radius_meters = int(min(radius_km, 50.0) * 1000)
        overpass_query = f"""
        [out:json][timeout:10];
        (
          node["place"~"village|hamlet|town|isolated_dwelling"](around:{radius_meters},{latitude},{longitude});
        );
        out center;
        """

        raw_elements = []
        fetch_error = None

        for endpoint in OVERPASS_ENDPOINTS:
            try:
                async with httpx.AsyncClient(timeout=OVERPASS_TIMEOUT_S) as client:
                    resp = await client.post(endpoint, data={"data": overpass_query})
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_elements = data.get("elements", [])
                        break
            except Exception as exc:
                logger.warning(f"Overpass endpoint {endpoint} failed: {exc}")
                fetch_error = str(exc)
                continue

        if not raw_elements:
            if fetch_error:
                logger.warning(f"Could not reach external Overpass API: {fetch_error}")
                return {
                    "success": False,
                    "error": "External geospatial settlement service (OpenStreetMap Overpass) is currently unreachable. Please try again shortly.",
                    "villages": [],
                    "data_source": "OpenStreetMap Overpass API",
                    "dataset_specs": {
                        "primary_api": "OpenStreetMap Overpass API (place=village|hamlet|town)",
                        "future_api": "Census of India / PMGSY Rural Roads & Habitats PostGIS Database",
                    },
                }
            # Successfully executed query, but no settlements found in sparse area
            return {
                "success": True,
                "count": 0,
                "villages": [],
                "data_source": "OpenStreetMap Overpass API",
                "message": f"No indexed village or settlement nodes found within {radius_km} km of the given coordinates.",
            }

        # Parse real elements into raw village dictionaries
        parsed_villages = []
        for el in raw_elements:
            tags = el.get("tags", {})
            name = tags.get("name") or tags.get("name:en")
            if not name:
                continue

            v_lat = el.get("lat") or el.get("center", {}).get("lat")
            v_lon = el.get("lon") or el.get("center", {}).get("lon")
            if v_lat is None or v_lon is None:
                continue

            dist = haversine_distance(latitude, longitude, v_lat, v_lon)
            if dist > radius_km:
                continue

            parsed_villages.append({
                "id": f"osm_{el.get('id')}",
                "name": name,
                "place_type": tags.get("place", "village"),
                "latitude": float(v_lat),
                "longitude": float(v_lon),
                "distance_km": dist,
                "district": tags.get("addr:district") or tags.get("is_in:district"),
                "state": tags.get("addr:state") or tags.get("is_in:state"),
                "population": int(tags["population"]) if tags.get("population", "").isdigit() else None,
                "data_source": "OpenStreetMap (Overpass API)",
            })

        # Sort by distance
        parsed_villages.sort(key=lambda x: x["distance_km"])

        # Cache raw geographic coordinates for 1 hour
        village_cache.set(cache_key, parsed_villages, ttl_seconds=3600.0)

        # Correlate real-time road connectivity
        villages = self._correlate_connectivity(parsed_villages, latitude, longitude)

        return {
            "success": True,
            "count": len(villages),
            "villages": villages[:limit],
            "data_source": "OpenStreetMap Overpass API",
            "note": "Village locations are retrieved from real OpenStreetMap geographic data.",
        }

    def _correlate_connectivity(
        self, villages_raw: List[Dict[str, Any]], user_lat: float, user_lon: float
    ) -> List[RemoteVillage]:
        """
        Cross-reference active road blockage and hazard reports near each village.
        Strict wording rules applied:
        - Unverified report -> POSSIBLE_ISSUE ("Possible road access issue — based on nearby community report.")
        - Verified report -> BLOCKED ("Confirmed Road Obstruction")
        """
        all_active_reports = report_service.list_reports(limit=200)[0]
        # Filter for active reports that may impact road accessibility
        road_impacting_reports = [
            r
            for r in all_active_reports
            if r.verification_status != VerificationStatus.RESOLVED
            and r.incident_type
            in (
                IncidentType.ROAD_BLOCKAGE,
                IncidentType.LANDSLIDE,
                IncidentType.ROCKFALL,
                IncidentType.FLOOD,
                IncidentType.INFRASTRUCTURE_DAMAGE,
            )
        ]

        result: List[RemoteVillage] = []

        for v in villages_raw:
            v_lat = v["latitude"]
            v_lon = v["longitude"]

            # Check if any road hazard report is within 6 km of this village
            village_hazards: List[Tuple[float, Any]] = []
            for rep in road_impacting_reports:
                dist = haversine_distance(v_lat, v_lon, rep.latitude, rep.longitude)
                if dist <= 6.0:  # 6 km local connectivity radius
                    village_hazards.append((dist, rep))

            village_hazards.sort(key=lambda x: x[0])

            if not village_hazards:
                conn_status = RoadConnectivityStatus.NORMAL
                notes = "Normal — No active road blockage or hazard reports on record for this sector."
            else:
                # Determine highest verification tier among nearby hazards
                has_verified = any(
                    rep.verification_status == VerificationStatus.VERIFIED
                    for _, rep in village_hazards
                )

                if has_verified:
                    conn_status = RoadConnectivityStatus.BLOCKED
                    closest_dist, rep = next(
                        (d, r)
                        for d, r in village_hazards
                        if r.verification_status == VerificationStatus.VERIFIED
                    )
                    road_label = rep.road_name or "local access corridor"
                    notes = (
                        f"Confirmed Road Obstruction — Verified by authorities on {road_label} "
                        f"(approx. {closest_dist} km from village). Avoid non-essential transit."
                    )
                else:
                    conn_status = RoadConnectivityStatus.POSSIBLE_ISSUE
                    closest_dist, rep = village_hazards[0]
                    type_label = rep.incident_type.value.replace("_", " ").lower()
                    notes = (
                        f"Possible road access issue — based on nearby community report ({type_label} "
                        f"reported approx. {closest_dist} km away). Status: UNVERIFIED."
                    )

            village_obj = RemoteVillage(
                id=v["id"],
                name=v["name"],
                place_type=v.get("place_type", "village"),
                latitude=v_lat,
                longitude=v_lon,
                distance_km=v["distance_km"],
                district=v.get("district"),
                state=v.get("state"),
                population=v.get("population"),
                road_connectivity_status=conn_status,
                connectivity_notes=notes,
                nearby_reports_count=len(village_hazards),
                data_source=v.get("data_source", "OpenStreetMap (Overpass API)"),
            )
            result.append(village_obj)

        return result


# Singleton instance
village_service = RemoteVillageService()
