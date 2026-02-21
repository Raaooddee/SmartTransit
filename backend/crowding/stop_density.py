"""
Stop-area density: relative demand at each stop (high/medium/low).
Key by stop name or stop ID.
"""

from typing import Literal

StopDensityLevel = Literal["high", "medium", "low"]

STOP_DENSITY: dict[str, StopDensityLevel] = {
    "University & Lake": "high",
    "University Ave & Lake St": "high",
    "State St & Lake St": "high",
    "Langdon St & Park St": "high",
    "Observatory & Charter": "high",
    "University Bay & Marsh": "medium",
    "Highland & University": "medium",
    "Mills & University": "medium",
    "Randall & Charter": "medium",
    "Dayton & State": "high",
    "Johnson & State": "high",
    "Babcock & University": "medium",
    "Camp Randall": "medium",
}

DEFAULT_DENSITY: StopDensityLevel = "medium"


def get_stop_density(stop_name_or_id: str) -> StopDensityLevel:
    normalized = (stop_name_or_id or "").strip()
    return STOP_DENSITY.get(normalized, DEFAULT_DENSITY)
