"""
Phase 1 rule-based bus fullness model.
Combines time, weather, and stop density into a 0–1 score and maps to crowd_risk + crowding.
"""

from typing import Literal, Optional, TypedDict

from .weather import get_weather_features, WeatherFeatures
from .features import get_time_features, get_stop_density_feature

CrowdLevel = Literal["low", "medium", "high"]

DENSITY_WEIGHT: dict[str, float] = {
    "low": 0.1,
    "medium": 0.2,
    "high": 0.35,
}

THRESHOLD_LOW = 0.33
THRESHOLD_HIGH = 0.66

DEFAULT_STOP = "University & Lake"


def _score_to_level(score: float) -> CrowdLevel:
    if score <= THRESHOLD_LOW:
        return "low"
    if score <= THRESHOLD_HIGH:
        return "medium"
    return "high"


def compute_crowding_from_features(
    time_features: dict,
    weather: WeatherFeatures,
    stop_density: str,
) -> dict:
    score = 0.15

    if time_features.get("is_weekend"):
        score += 0.05
    if time_features.get("in_rush_hour"):
        score += 0.25
    if time_features.get("in_dismissal_window"):
        score += 0.2

    if weather.get("is_precipitating"):
        score += 0.2
    # is_very_cold: temp < 32°F (see weather.VERY_COLD_F)
    if weather.get("is_very_cold"):
        score += 0.15

    score += DENSITY_WEIGHT.get(stop_density, DENSITY_WEIGHT["medium"])
    score = max(0.0, min(1.0, score))

    level = _score_to_level(score)
    prob_full = round(score * score, 2)

    return {
        "crowd_risk": level,
        "crowding": {"level": level, "prob_full": prob_full},
        "score": score,
    }


def get_crowding(
    stop_name_or_id: Optional[str] = None,
    now=None,
    weather: Optional[WeatherFeatures] = None,
) -> dict:
    stop = (stop_name_or_id or "").strip() or DEFAULT_STOP
    time_features = get_time_features(now)
    stop_density = get_stop_density_feature(stop)
    weather_data = weather if weather is not None else get_weather_features()
    return compute_crowding_from_features(time_features, weather_data, stop_density)
