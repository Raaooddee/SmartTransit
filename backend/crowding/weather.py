"""
Weather client for Madison, WI (Open-Meteo, no API key required).
Exposes is_precipitating and is_very_cold. Cache 10 min to avoid rate limits.
"""

import os
import time
from typing import TypedDict, Optional

import requests

MADISON_LAT = 43.0731
MADISON_LON = -89.4012
OPEN_METEO_BASE = os.environ.get("OPEN_METEO_BASE_URL", "https://api.open-meteo.com")
VERY_COLD_F = 32
VERY_COLD_C = (VERY_COLD_F - 32) * (5 / 9)  # 0

# WMO: 61-67 rain, 71-77 snow, 80-82 showers, 85-86 snow showers
PRECIPITATION_CODES = {
    61, 63, 65, 66, 67, 80, 81, 82,
    71, 73, 75, 77, 85, 86,
}

CACHE_SEC = 10 * 60
_cache = None  # type: dict | None
_cache_at = 0.0


class WeatherFeatures(TypedDict, total=False):
    is_precipitating: bool
    is_very_cold: bool
    temp_f: float
    precipitation_mm: float
    weather_code: int


def get_weather_features() -> WeatherFeatures:
    global _cache, _cache_at
    now = time.time()
    if _cache is not None and (now - _cache_at) < CACHE_SEC:
        return _cache

    url = (
        f"{OPEN_METEO_BASE}/v1/forecast"
        f"?latitude={MADISON_LAT}&longitude={MADISON_LON}"
        "&current=temperature_2m,precipitation,weather_code"
    )
    try:
        r = requests.get(url, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception:
        _cache = {"is_precipitating": False, "is_very_cold": False}
        _cache_at = now
        return _cache

    cur = data.get("current") or {}
    temp_c = cur.get("temperature_2m")
    precip = cur.get("precipitation", 0) or 0
    code = cur.get("weather_code")

    temp_f = (temp_c * (9 / 5) + 32) if temp_c is not None else None
    is_very_cold = temp_c is not None and temp_c < VERY_COLD_C
    is_precipitating = precip > 0 or (isinstance(code, int) and code in PRECIPITATION_CODES)

    out: WeatherFeatures = {
        "is_precipitating": is_precipitating,
        "is_very_cold": is_very_cold,
    }
    if temp_f is not None:
        out["temp_f"] = temp_f
    if precip is not None:
        out["precipitation_mm"] = precip
    if code is not None:
        out["weather_code"] = code

    _cache = out
    _cache_at = now
    return out
