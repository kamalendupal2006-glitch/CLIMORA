"""
CLIMORA Environmental Data Services
=====================================
Modular data-acquisition layer that retrieves real-world environmental and
geospatial data from authoritative external sources.

Services:
    weather_service    — Open-Meteo: temperature, humidity, rainfall, soil moisture
    terrain_service    — Open-Meteo elevation + derived slope / aspect / curvature
    geocoding_service  — Nominatim OSM + NE India bounding-box fallback → state_region
    landcover_service  — Interface stub (real integration pending)
    historical_service — Interface stub (real integration pending)
    environmental_service — Orchestrates all services into a single response

Architecture:
    FastAPI endpoint /api/environmental-data
         ↓
    environmental_service (async, parallel fetches)
         ↓
    weather_service | terrain_service | geocoding_service | …
         ↓
    cache.py (in-memory TTL cache, no external dependencies)
         ↓
    Validated feature object → existing /api/predict pipeline
"""
