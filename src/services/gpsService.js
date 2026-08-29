/**
 * CLIMORA GPS Location Service
 * ============================
 * Browser-based geolocation for user-initiated location detection.
 *
 * Privacy contract:
 *  - Location is ONLY requested after explicit user action.
 *  - Location is NEVER requested automatically on page load.
 *  - Location is NEVER continuously tracked.
 *  - Location is NEVER stored persistently.
 *  - Location is NEVER sent anywhere until the user has granted permission
 *    AND explicitly clicked the "Use My Location" button.
 *
 * Future extensibility:
 *  - The { latitude, longitude } object returned here can be passed directly
 *    to future services for weather, elevation, terrain, soil, and historical
 *    data retrieval.
 *
 * HTTPS note:
 *  - navigator.geolocation requires a secure context in production.
 *  - localhost / 127.0.0.1 works during development without HTTPS.
 *  - Production deployments MUST use HTTPS.
 */

/**
 * GPS accuracy warning threshold (metres).
 * If the browser reports accuracy worse than this, a low-accuracy warning
 * is shown to the user. Prediction is still allowed.
 */
export const GPS_ACCURACY_WARN_THRESHOLD_M = 500;

/**
 * Default geolocation options — high accuracy, 10-second timeout,
 * allow a cached position up to 30 seconds old.
 */
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 30000,
};

/**
 * Map GeolocationPositionError codes to user-friendly messages.
 */
function geolocationErrorMessage(err) {
  switch (err.code) {
    case 1:
      return 'Location permission was denied. Please allow location access or use manual coordinates for testing.';
    case 2:
      return 'Your current location could not be determined. Please check your device location settings.';
    case 3:
      return 'Unable to obtain your location within the allowed time. Please try again.';
    default:
      return 'An unknown location error occurred. Please try again.';
  }
}

/**
 * Request the user current position via browser Geolocation API.
 * ONLY call this in response to an explicit user action (button click).
 *
 * @returns {Promise<{ position: { latitude, longitude, accuracy }, warning: string|null }>}
 */
export function requestCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 'UNSUPPORTED',
        message: 'Location services are not supported by this browser.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };

        const warning =
          position.accuracy > GPS_ACCURACY_WARN_THRESHOLD_M
            ? `Location detected, but GPS accuracy is low (+-${Math.round(position.accuracy)} m). Results may be less precise.`
            : null;

        resolve({ position, warning });
      },
      (err) => {
        const code =
          err.code === 1 ? 'DENIED'
          : err.code === 2 ? 'UNAVAILABLE'
          : err.code === 3 ? 'TIMEOUT'
          : 'UNKNOWN';

        reject({
          code,
          message: geolocationErrorMessage(err),
        });
      },
      GEO_OPTIONS
    );
  });
}

/**
 * Format accuracy for display.
 * @param {number} accuracyMetres
 * @returns {string}  e.g. "+-18 m"
 */
export function formatAccuracy(accuracyMetres) {
  if (accuracyMetres == null || isNaN(accuracyMetres)) return '+- unknown';
  return `+-${Math.round(accuracyMetres)} m`;
}
