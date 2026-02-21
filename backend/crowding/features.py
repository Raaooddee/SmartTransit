"""
Time and stop features for bus fullness heuristic.
Madison timezone (America/Chicago) for rush/dismissal.
"""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from .dismissal_windows import DISMISSAL_WINDOWS
from .stop_density import get_stop_density, StopDensityLevel

MADISON_TZ = ZoneInfo("America/Chicago")

# Rush: morning 7–9, evening 17–18 (local 24h)
RUSH_HOURS = [(7, 9), (17, 18)]


def get_time_features(now: datetime | None = None) -> dict:
    if now is None:
        now = datetime.now(MADISON_TZ)
    else:
        now = now.astimezone(MADISON_TZ)

    hour = now.hour
    minute = now.minute
    day_of_week = now.weekday()  # 0 Mon .. 6 Sun
    is_weekend = day_of_week >= 5  # Sat=5, Sun=6

    in_rush_hour = any(start <= hour < end for start, end in RUSH_HOURS)

    time_str = f"{hour:02d}:{minute:02d}"
    in_dismissal_window = (
        not is_weekend
        and any(w["start"] <= time_str <= w["end"] for w in DISMISSAL_WINDOWS)
    )

    return {
        "hour": hour,
        "minute": minute,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "in_rush_hour": in_rush_hour,
        "in_dismissal_window": in_dismissal_window,
    }


def get_stop_density_feature(stop_name_or_id: str) -> StopDensityLevel:
    return get_stop_density(stop_name_or_id)
