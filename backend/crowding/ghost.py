"""
Ghost walks detection: identifies when scheduled buses don't actually show up.
Checks for live vehicle availability and compares against expected service times.
"""

from __future__ import annotations

import os
import requests
from typing import Literal, Optional
from datetime import datetime

from .features import get_time_features, MADISON_TZ
from .dismissal_windows import DISMISSAL_WINDOWS

# Ghost risk is now a probability (0.0 to 1.0, or 0-100%)

# Service hours: Route 80 typically runs 6:00 AM - 11:00 PM on weekdays
SERVICE_START_HOUR = 6
SERVICE_END_HOUR = 23

# During dismissal windows and rush hours, we expect more buses
# If no buses are available during these times, ghost risk is high
RUSH_HOURS = [(7, 9), (17, 18)]

# Madison Metro API configuration
MADISON_METRO_HOST = "metromap.cityofmadison.com"
BASE_URL = f"http://{MADISON_METRO_HOST}/bustime/api/v3"
ROUTE_80 = "80"


def fetch_vehicle_count(api_key: Optional[str] = None) -> int:
    """
    Fetch the number of live vehicles for Route 80.
    
    Args:
        api_key: Madison Metro API key (if None, returns 0)
    
    Returns:
        Number of active vehicles, or 0 if API unavailable
    """
    if not api_key:
        return 0
    
    try:
        url = f"{BASE_URL}/getvehicles"
        params = {
            "key": api_key,
            "format": "json",
            "rt": ROUTE_80,
            "tmres": "s",
        }
        response = requests.get(url, params=params, timeout=10)
        if not response.ok:
            return 0
        
        data = response.json()
        bustime = data.get("bustime-response", {})
        
        if "error" in bustime:
            return 0
        
        vehicles = bustime.get("vehicle", [])
        if not vehicles:
            return 0
        
        if not isinstance(vehicles, list):
            vehicles = [vehicles] if vehicles else []
        
        return len(vehicles)
    except Exception:
        return 0


def get_ghost_risk(
    vehicle_count: Optional[int] = None,
    stop_name_or_id: Optional[str] = None,
    now: Optional[datetime] = None,
    api_key: Optional[str] = None,
) -> float:
    """
    Determine ghost risk probability based on vehicle availability and time context.
    
    Args:
        vehicle_count: Number of live vehicles currently available (if None, will fetch from API)
        stop_name_or_id: Stop name or ID (for future use)
        now: Current datetime (defaults to now in Madison timezone)
        api_key: Madison Metro API key (used if vehicle_count is None)
    
    Returns:
        Probability of ghost bus (0.0 to 1.0, where 1.0 = 100% chance)
    """
    if now is None:
        now = datetime.now(MADISON_TZ)
    else:
        now = now.astimezone(MADISON_TZ)
    
    # Fetch vehicle count if not provided
    if vehicle_count is None:
        vehicle_count = fetch_vehicle_count(api_key)
    
    time_features = get_time_features(now)
    hour = time_features["hour"]
    day_of_week = time_features["day_of_week"]
    is_weekend = time_features["is_weekend"]
    in_rush_hour = time_features["in_rush_hour"]
    in_dismissal_window = time_features["in_dismissal_window"]
    
    # Base probability starts at 0
    prob = 0.0
    
    # Outside service hours: very low risk (no expectation of buses)
    if hour < SERVICE_START_HOUR or hour >= SERVICE_END_HOUR:
        return 0.05  # 5% base risk even outside hours
    
    # If there are vehicles available, risk is very low
    if vehicle_count > 0:
        # More vehicles = lower risk
        if vehicle_count >= 3:
            return 0.05  # 5% - plenty of buses
        elif vehicle_count >= 2:
            return 0.15  # 15% - some buses available
        else:
            return 0.30  # 30% - only one bus, could be a ghost
    
    # No vehicles available - calculate risk based on context
    # Rush hour or dismissal window: very high risk
    if in_rush_hour:
        prob = 0.85  # 85% - should have buses during rush hour
    elif in_dismissal_window:
        prob = 0.80  # 80% - should have buses during dismissal
    elif is_weekend:
        # Weekend: lower risk (less frequent service expected)
        if hour >= 10 and hour < 18:  # Daytime weekend
            prob = 0.40  # 40% - some service expected
        else:
            prob = 0.25  # 25% - limited weekend service
    else:
        # Weekday during service hours with no vehicles
        if hour >= 7 and hour < 9:  # Morning commute
            prob = 0.75  # 75% - should have morning buses
        elif hour >= 17 and hour < 19:  # Evening commute
            prob = 0.75  # 75% - should have evening buses
        elif hour >= 9 and hour < 17:  # Midday weekday
            prob = 0.60  # 60% - regular service expected
        else:
            prob = 0.50  # 50% - off-peak but still service hours
    
    # Ensure probability is between 0 and 1
    return max(0.0, min(1.0, prob))

