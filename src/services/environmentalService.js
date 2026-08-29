/**
 * CLIMORA Environmental Data Service
 * =====================================
 * Fetches real-world environmental data from the backend /api/environmental-data
 * endpoint. The backend in turn queries Open-Meteo (weather, terrain) and
 * Nominatim (geocoding).
 *
 * Architecture:
 *   React (this file)
 *     ↓
 *   FastAPI /api/environmental-data
 *     ↓
 *   Open-Meteo / Nominatim (no API keys exposed to browser)
 *
 * IMPORTANT — NO API KEYS IN FRONTEND:
 *   All external API calls are made by the backend.
 *   This service only calls the CLIMORA backend.
 *
 * IMPORTANT — NO FAKE DATA:
 *   If a field is unavailable, the response contains available=false.
 *   The caller must check availability before using any value.
 *   Never substitute or fabricate values in this layer.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

/** Timeout for the environmental data fetch (ms). */
const ENV_FETCH_TIMEOUT_MS = 20000;

/**
 * @typedef {Object} EnvVariable
 * @property {number|null} value        - The real data value, or null if unavailable
 * @property {boolean}     available    - True only if a real value was retrieved
 * @property {string|null} source       - Data source description
 * @property {string|null} retrieved_at - ISO 8601 timestamp
 * @property {string|null} unit         - Physical unit
 * @property {string}      note         - Provenance or unavailability explanation
 */

/**
 * @typedef {Object} EnvironmentalDataResult
 * @property {boolean}            success
 * @property {string}             retrieved_at
 * @property {Object}             location     - { latitude, longitude, state_region, geocoding_source }
 * @property {Object.<string, EnvVariable>} environment - 14 model features
 * @property {Object}             data_quality
 * @property {string[]}           validation_notes
 * @property {string}             disclaimer
 * @property {string|null}        error        - Present when success=false
 */

/**
 * Fetch real environmental data for GPS coordinates from the CLIMORA backend.
 *
 * @param {number} latitude  - WGS-84 decimal degrees
 * @param {number} longitude - WGS-84 decimal degrees
 * @returns {Promise<EnvironmentalDataResult>}
 * @throws {Error} on network failure or server error
 */
export async function fetchEnvironmentalData(latitude, longitude) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ENV_FETCH_TIMEOUT_MS);

  const url = `${API_BASE_URL}/api/environmental-data?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errMsg = `Environmental data service returned HTTP ${response.status}`;
      try {
        const errData = await response.json();
        if (errData?.error) errMsg = errData.error;
        if (errData?.detail) errMsg = errData.detail;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      throw new Error(
        'Environmental data fetch timed out. Please check your connection and try again.'
      );
    }
    if (err.message === 'Failed to fetch') {
      throw new Error(
        'Cannot reach the CLIMORA backend. Please ensure the server is running.'
      );
    }
    throw err;
  }
}

/**
 * Extract a flat form-compatible object from an environmental data response.
 * Only includes fields that have real, available values.
 * Never fills in unavailable fields with defaults or synthetic values.
 *
 * @param {EnvironmentalDataResult} envData
 * @returns {Object} Partial form data object (only available fields)
 */
export function extractFormValues(envData) {
  if (!envData?.success || !envData?.environment) return {};

  const env = envData.environment;
  const extracted = {};

  // Helper: only add if the value is actually available
  const addIfAvailable = (formKey, envKey, transform = (v) => String(v)) => {
    const variable = env[envKey];
    if (variable?.available && variable?.value != null) {
      extracted[formKey] = transform(variable.value);
    }
  };

  // Location — always available (came from GPS)
  addIfAvailable('latitude', 'latitude', (v) => v.toFixed(6));
  addIfAvailable('longitude', 'longitude', (v) => v.toFixed(6));

  // State — from geocoding
  if (env.state_region?.available && env.state_region?.value) {
    extracted['stateRegion'] = env.state_region.value;
  }

  // Terrain
  addIfAvailable('elevation', 'elevation_m', (v) => v.toFixed(1));
  addIfAvailable('slope', 'slope_deg', (v) => v.toFixed(2));
  addIfAvailable('aspect', 'aspect_deg', (v) => v.toFixed(1));
  addIfAvailable('curvature', 'curvature', (v) => v.toFixed(4));

  // Weather
  addIfAvailable('temperature', 'temperature_c', (v) => v.toFixed(1));
  addIfAvailable('humidity', 'humidity_pct', (v) => v.toFixed(1));
  addIfAvailable('rainfall', 'rainfall_mm', (v) => v.toFixed(1));

  // Soil moisture — Open-Meteo returns m³/m³ (0.0–1.0)
  // The form displays as %, model expects 0–1 ratio; preprocessing converts
  if (env.soil_moisture?.available && env.soil_moisture?.value != null) {
    const smPct = env.soil_moisture.value * 100.0;
    extracted['soilMoisture'] = smPct.toFixed(1);
  }

  // land_cover, historicalLandslideCount, daysSincePreviousEvent:
  // NOT extracted — these are unavailable and require manual input

  return extracted;
}

/**
 * Build a status summary array for the UI data-collection panel.
 * Each item represents one data source group.
 *
 * @param {EnvironmentalDataResult|null} envData
 * @param {boolean} isLoading
 * @param {string|null} errorMessage
 * @returns {Array<{label: string, status: 'loading'|'success'|'partial'|'unavailable'|'error'|'idle', detail: string}>}
 */
export function buildSourceStatus(envData, isLoading, errorMessage) {
  if (isLoading) {
    return [
      { label: 'Weather & Soil', status: 'loading', detail: 'Fetching from Open-Meteo…' },
      { label: 'Terrain & Elevation', status: 'loading', detail: 'Fetching from Copernicus DEM…' },
      { label: 'State / Region', status: 'loading', detail: 'Reverse geocoding…' },
      { label: 'Land Cover', status: 'unavailable', detail: 'Manual selection required' },
      { label: 'Historical Data', status: 'unavailable', detail: 'Manual entry required' },
    ];
  }

  if (errorMessage && !envData) {
    return [
      { label: 'Weather & Soil', status: 'error', detail: errorMessage },
      { label: 'Terrain & Elevation', status: 'error', detail: errorMessage },
      { label: 'State / Region', status: 'error', detail: errorMessage },
      { label: 'Land Cover', status: 'unavailable', detail: 'Manual selection required' },
      { label: 'Historical Data', status: 'unavailable', detail: 'Manual entry required' },
    ];
  }

  if (!envData) {
    return [
      { label: 'Weather & Soil', status: 'idle', detail: 'Awaiting GPS location' },
      { label: 'Terrain & Elevation', status: 'idle', detail: 'Awaiting GPS location' },
      { label: 'State / Region', status: 'idle', detail: 'Awaiting GPS location' },
      { label: 'Land Cover', status: 'unavailable', detail: 'Manual selection required' },
      { label: 'Historical Data', status: 'unavailable', detail: 'Manual entry required' },
    ];
  }

  const env = envData.environment || {};

  // Weather group
  const weatherVars = ['temperature_c', 'humidity_pct', 'rainfall_mm', 'soil_moisture'];
  const weatherOk = weatherVars.filter((k) => env[k]?.available).length;
  const weatherStatus =
    weatherOk === weatherVars.length ? 'success' :
    weatherOk > 0 ? 'partial' : 'error';
  const weatherDetail =
    weatherOk === weatherVars.length
      ? `Temp ${env.temperature_c?.value?.toFixed(1)}°C · Humidity ${env.humidity_pct?.value?.toFixed(0)}% · Rain ${env.rainfall_mm?.value?.toFixed(1)} mm · Soil ${(env.soil_moisture?.value * 100)?.toFixed(1)}%`
      : weatherOk > 0
        ? `${weatherOk}/${weatherVars.length} variables available`
        : 'Weather data unavailable';

  // Terrain group
  const terrainVars = ['elevation_m', 'slope_deg', 'aspect_deg', 'curvature'];
  const terrainOk = terrainVars.filter((k) => env[k]?.available).length;
  const terrainStatus =
    terrainOk === terrainVars.length ? 'success' :
    terrainOk > 0 ? 'partial' : 'error';
  const terrainDetail =
    terrainOk === terrainVars.length
      ? `Elev ${env.elevation_m?.value?.toFixed(0)} m · Slope ${env.slope_deg?.value?.toFixed(1)}° · Aspect ${env.aspect_deg?.value?.toFixed(0)}°`
      : terrainOk > 0
        ? `${terrainOk}/${terrainVars.length} variables available`
        : 'Terrain data unavailable';

  // State / Region
  const stateOk = env.state_region?.available;
  const stateStatus = stateOk ? 'success' : 'error';
  const stateDetail = stateOk
    ? env.state_region.value + (envData.validation_notes?.length ? ' ⚠ (see note)' : '')
    : (envData.error || 'State could not be determined');

  return [
    { label: 'Weather & Soil', status: weatherStatus, detail: weatherDetail },
    { label: 'Terrain & Elevation', status: terrainStatus, detail: terrainDetail },
    { label: 'State / Region', status: stateStatus, detail: stateDetail },
    { label: 'Land Cover', status: 'unavailable', detail: 'Manual selection required (no free API)' },
    { label: 'Historical Data', status: 'unavailable', detail: 'Manual entry required (no open inventory API)' },
  ];
}
