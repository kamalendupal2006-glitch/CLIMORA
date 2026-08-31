import { RISK_LEVELS, RECOMMENDED_ACTIONS } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

/**
 * CLIMORA Prediction Service
 * ==========================
 * Sends all 14 model features to the Flask + XGBoost backend.
 *
 * Pipeline:
 *   React Form → POST /api/predict → Flask → ColumnTransformer → XGBoost → JSON → React
 *
 * The backend is the sole source of truth for probability and risk category.
 * This service does NOT perform any local prediction or heuristic fallback.
 */
export async function predictLandslide(inputData) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  // Convert soil_moisture from UI % (0–100) to model ratio (0.0–1.0)
  const rawMoisture = parseFloat(inputData.soilMoisture) ?? 0;
  const soilMoistureRatio = rawMoisture > 1.0 ? rawMoisture / 100.0 : rawMoisture;

  // Build the exact 14-feature payload the backend expects
  const payload = {
    latitude: parseFloat(inputData.latitude),
    longitude: parseFloat(inputData.longitude),
    state_region: inputData.stateRegion,
    elevation_m: parseFloat(inputData.elevation),
    slope_deg: parseFloat(inputData.slope),
    aspect_deg: parseFloat(inputData.aspect),
    curvature: parseFloat(inputData.curvature),
    rainfall_mm: parseFloat(inputData.rainfall),
    soil_moisture: soilMoistureRatio,
    temperature_c: parseFloat(inputData.temperature),
    humidity_pct: parseFloat(inputData.humidity),
    land_cover: inputData.landCover,
    historical_landslide_count: parseInt(inputData.historicalLandslideCount, 10),
    days_since_previous_event: parseInt(inputData.daysSincePreviousEvent, 10),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Surface the backend error message where available
      let errorMsg = `Server returned HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.error) errorMsg = errorData.error;
      } catch {
        // ignore JSON parse failure — use status message
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Prediction failed — backend returned an unsuccessful response.');
    }

    // Decorate with local action lookup for the recommendation card
    const category = (result.risk_category || 'LOW').toUpperCase().replace(' ', '_');
    const actionData =
      RECOMMENDED_ACTIONS[result.risk_category] ||
      RECOMMENDED_ACTIONS[category] ||
      RECOMMENDED_ACTIONS.LOW;

    return {
      probability: result.probability,
      probability_percent: result.probability_percent ?? Math.round(result.probability * 100),
      risk_category: result.risk_category,
      recommendation: result.recommendation || actionData?.primaryAction,
      actionDetails: actionData,
      factors: result.contributing_factors || [],
      contributing_factors: result.contributing_factors || [],
      model_version: result.model_version || '1.0-non-satellite',
      timestamp: new Date().toISOString(),
      source: 'LIVE_FLASK_XGBOOST_BACKEND',
    };
  } catch (err) {
    clearTimeout(timeoutId);

    // Network failure or AbortError → clear user-facing message, no fallback prediction
    if (err.name === 'AbortError' || err.message === 'Failed to fetch') {
      throw new Error(
        'CLIMORA prediction server is unavailable. Please start the backend and try again.'
      );
    }

    // Re-throw backend HTTP errors and other errors as-is
    throw err;
  }
}

/**
 * Optional: Check backend health before submitting.
 * Returns true if the backend is reachable, false otherwise.
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Batch prediction — sends an array of raw row objects (already in backend field names)
 * to POST /api/predict/batch and returns the full response.
 *
 * @param {Array<Object>} rows - Array of objects with backend field names (snake_case)
 * @param {Function} onProgress - Optional callback(completed, total) called after each row result
 */
export async function predictBatch(rows, onProgress) {
  const controller = new AbortController();
  // Allow up to 2 minutes for large batches
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/predict/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMsg = `Server returned HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.detail) errorMsg = errorData.detail;
        if (errorData?.error) errorMsg = errorData.error;
      } catch { /* ignore */ }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    // Simulate per-row progress reporting (backend returns all at once)
    if (onProgress && data.results) {
      data.results.forEach((_, i) => onProgress(i + 1, data.total));
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Batch prediction timed out. Try uploading a smaller file.');
    }
    throw err;
  }
}

