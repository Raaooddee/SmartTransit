"""
Class dismissal time windows (weekdays) when more students head to buses.
Times in local (Madison) 24h "HH:mm" format.
"""

from typing import TypedDict


class DismissalWindow(TypedDict):
    start: str
    end: str


DISMISSAL_WINDOWS: list[DismissalWindow] = [
    {"start": "07:45", "end": "08:15"},
    {"start": "09:50", "end": "10:10"},
    {"start": "11:50", "end": "12:15"},
    {"start": "14:20", "end": "14:40"},
    {"start": "15:50", "end": "16:15"},
    {"start": "17:00", "end": "17:30"},
]
