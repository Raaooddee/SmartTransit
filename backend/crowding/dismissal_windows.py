"""
UW–Madison class-schedule-based rush windows (15 min before class start until start).
Used for bus fullness heuristic. Times in Madison local 24h "HH:mm".
No windows after 5:00 p.m. (assume post-5pm does not increase crowdedness).

50-min classes: starts at 7:45, 8:50, 9:55, 11:00, 12:05, 1:20, 2:25, 3:30, 4:35 (MWF / TR / MW / MF / WF).
75-min TR/T/R: 8:00, 9:30, 11:00, 1:00, 2:30, 4:00 → Tue/Thu only for 9:15–9:30, 12:45–1:00.
75-min MW/MF/WF/M/W/F: 8:00, 2:30, 4:00 → Mon/Wed/Fri.
days: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri (datetime.weekday()). If absent, applies all weekdays.
"""

from typing import TypedDict


class DismissalWindow(TypedDict, total=False):
    start: str
    end: str
    days: list[int]  # 0=Mon .. 4=Fri


DISMISSAL_WINDOWS: list[DismissalWindow] = [
    {"start": "07:30", "end": "07:45"},
    {"start": "07:45", "end": "08:00"},
    {"start": "08:35", "end": "08:50"},
    {"start": "09:15", "end": "09:30", "days": [1, 3]},  # Tue, Thu
    {"start": "09:40", "end": "09:55"},
    {"start": "10:45", "end": "11:00"},
    {"start": "11:50", "end": "12:05"},
    {"start": "12:45", "end": "13:00", "days": [1, 3]},
    {"start": "13:05", "end": "13:20"},
    {"start": "14:10", "end": "14:25"},
    {"start": "14:15", "end": "14:30"},
    {"start": "15:15", "end": "15:30"},
    {"start": "15:45", "end": "16:00"},
    {"start": "16:20", "end": "16:35"},
]
