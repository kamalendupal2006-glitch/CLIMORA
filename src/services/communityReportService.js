/**
 * CLIMORA Community Report Service
 * =================================
 * Frontend API client for citizen incident reports, photo uploads,
 * proximity alerts, and authority verification workflow.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export async function createReport(reportData) {
  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    let errorMsg = `Server error ${response.status}`;
    try {
      const err = await response.json();
      if (err?.detail) {
        errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/reports/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = `Upload failed (${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function getReports(params = {}) {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.incident_type && params.incident_type !== 'ALL') query.append('incident_type', params.incident_type);
  if (params.severity && params.severity !== 'ALL') query.append('severity', params.severity);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  const response = await fetch(`${API_BASE_URL}/api/reports?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch reports (${response.status})`);
  }
  return response.json();
}

export async function getNearbyReports(latitude, longitude, radiusKm = 25, options = {}) {
  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius_km: radiusKm.toString(),
  });
  if (options.status && options.status !== 'ALL') query.append('status', options.status);
  if (options.incident_type && options.incident_type !== 'ALL') query.append('incident_type', options.incident_type);

  const response = await fetch(`${API_BASE_URL}/api/reports/nearby?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby reports (${response.status})`);
  }
  return response.json();
}

export async function getNearbyAlerts(latitude, longitude, radiusKm = 30) {
  const query = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    radius_km: radiusKm.toString(),
  });

  const response = await fetch(`${API_BASE_URL}/api/reports/alerts?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby alerts (${response.status})`);
  }
  return response.json();
}

export async function getReportById(reportId) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}`);
  if (!response.ok) {
    throw new Error(`Report not found (${response.status})`);
  }
  return response.json();
}

export async function updateReportStatus(reportId, statusPayload) {
  const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(statusPayload),
  });

  if (!response.ok) {
    let errorMsg = `Failed to update status (${response.status})`;
    try {
      const err = await response.json();
      if (err?.detail) errorMsg = err.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
