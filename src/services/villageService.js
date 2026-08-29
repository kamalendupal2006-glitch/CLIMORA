/**
 * CLIMORA Remote Village Service
 * ===============================
 * Frontend API client for discovering remote villages and inspecting
 * their live road connectivity status.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export async function getNearbyVillages(latitude, longitude, radiusKm = 25, limit = 30) {
  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius_km: radiusKm.toString(),
    limit: limit.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/api/villages/nearby?${query.toString()}`);
  if (!response.ok) {
    let errorMsg = `Settlement discovery error (${response.status})`;
    try {
      const err = await response.json();
      if (err?.error) errorMsg = err.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
