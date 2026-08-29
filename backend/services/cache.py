"""
CLIMORA In-Memory TTL Cache
============================
Lightweight, thread-safe, in-memory cache with per-entry TTL expiry.
No external dependencies (no Redis, no disk I/O).
Designed for local-development / prototype use.

TTL policy (configured in config.py):
    Weather / soil moisture  : 15 minutes  (matches Open-Meteo update interval)
    Elevation               : 24 hours     (terrain is static)
    Terrain derivatives     : 24 hours     (slope/aspect/curvature from DEM)
    Geocoding               : 1 hour       (reverse-geocode result)
"""

import time
import threading
import logging
from typing import Any, Optional

logger = logging.getLogger("CLIMORA.cache")


class TTLCache:
    """
    A simple in-memory dictionary cache with per-entry time-to-live (TTL).

    Thread-safe via a single reentrant lock.
    Eviction is lazy: stale entries are removed on access, not on a timer.
    """

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._lock = threading.RLock()

    def get(self, key: str) -> Optional[Any]:
        """
        Return the cached value if it exists and has not expired.
        Returns None if missing or stale.
        """
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                logger.debug("Cache MISS (expired): %s", key)
                return None
            logger.debug("Cache HIT: %s", key)
            return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        """
        Store a value with a TTL (in seconds from now).
        """
        with self._lock:
            expires_at = time.monotonic() + ttl_seconds
            self._store[key] = (value, expires_at)
            logger.debug("Cache SET: %s (TTL %.0fs)", key, ttl_seconds)

    def delete(self, key: str) -> None:
        """Remove a specific key."""
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        """Remove all entries (useful for testing)."""
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        """Return the number of non-expired entries currently stored."""
        now = time.monotonic()
        with self._lock:
            return sum(1 for _, (_, exp) in self._store.items() if now <= exp)


# ---------------------------------------------------------------------------
# Module-level singleton instances — one per data category
# ---------------------------------------------------------------------------

weather_cache = TTLCache()
terrain_cache = TTLCache()
geocoding_cache = TTLCache()
