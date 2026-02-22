"""
Stop-area density: relative demand at each stop (high/medium/low).
Keys are real bus stop names from the map (route80_stops). One entry per
unique name; the same density applies to all stop_ids that share that name.
"""

from typing import Literal

StopDensityLevel = Literal["high", "medium", "low"]

STOP_DENSITY: dict[str, StopDensityLevel] = {
    # Core campus / high ridership
    "Langdon at N Park": "high",
    "N Lake at University": "high",
    "N Lake at Langdon": "high",
    "N Lake at W Johnson": "high",
    "W Dayton at N Park": "high",
    "W Dayton at N Orchard": "high",
    "Observatory at Bascom": "high",
    "Observatory at N Charter": "high",
    "N Charter at University": "high",
    # Main corridor
    "Observatory at Babcock": "medium",
    "Observatory at Walnut": "medium",
    "Observatory at Highland": "medium",
    "Observatory at Colwood": "medium",
    "Observatory at Elm": "high",
    "Linden at Henry": "medium",
    "Linden at N Charter": "high",
    "Linden at Babcock": "medium",
    "Babcock at Linden": "medium",
    "W Dayton at N Mills": "medium",
    "N Randall at Engineering": "medium",
    "University Bay at Lot 60": "medium",
    "University Bay at Lot 76": "medium",
    "Marsh at Highland": "medium",
    "Marsh at Lot 60": "medium",
    "Marsh at Lot 76": "medium",
    "Highland at Observatory": "medium",
    "Highland at Marsh": "medium",
    "University Bay at Picnic Point": "medium",
    "Walnut at Observatory": "medium",
    # Outlying
    "Lake Mendota at University Bay": "low",
    "Lake Mendota at Eagle Heights": "low",
    "Lake Mendota at Lot N": "low",
    "Lake Mendota at Lot P": "low",
    "Lake Mendota at Lot Q": "low",
    "Lake Mendota at Lot R": "low",
    "Eagle Heights at Lot E": "low",
    "Eagle Heights at Lot F": "low",
    "Eagle Heights at Lot M": "low",
    "Eagle Heights at Shelter": "low",
}

DEFAULT_DENSITY: StopDensityLevel = "low"

# Map stop_id -> stop_name so lookup by ID returns density for that stop's name.
_STOP_ID_TO_NAME: dict[str, str] = {
    "1": "Langdon at N Park",
    "555": "Linden at Henry",
    "595": "Observatory at Walnut",
    "596": "Lake Mendota at Lot R",
    "597": "Eagle Heights at Lot E",
    "598": "Marsh at Highland",
    "599": "Eagle Heights at Lot F",
    "600": "University Bay at Lot 60",
    "602": "Lake Mendota at Eagle Heights",
    "603": "Lake Mendota at Lot N",
    "604": "Lake Mendota at University Bay",
    "605": "Lake Mendota at University Bay",
    "606": "University Bay at Lot 76",
    "607": "Walnut at Observatory",
    "608": "Eagle Heights at Lot M",
    "609": "Lake Mendota at Lot P",
    "611": "Lake Mendota at Lot Q",
    "612": "Marsh at Lot 76",
    "614": "Eagle Heights at Shelter",
    "615": "Observatory at Walnut",
    "616": "Observatory at Highland",
    "628": "Highland at Observatory",
    "634": "Observatory at Babcock",
    "655": "Observatory at Elm",
    "679": "Marsh at Lot 60",
    "692": "Observatory at Colwood",
    "709": "Highland at Marsh",
    "741": "Observatory at Colwood",
    "851": "University Bay at Picnic Point",
    "866": "University Bay at Picnic Point",
    "877": "Observatory at Elm",
    "878": "Babcock at Linden",
    "882": "Observatory at Babcock",
    "918": "N Randall at Engineering",
    "973": "N Lake at W Johnson",
    "1058": "Linden at N Charter",
    "1185": "Linden at N Charter",
    "1190": "N Lake at Langdon",
    "1223": "W Dayton at N Orchard",
    "1246": "Observatory at N Charter",
    "1262": "Linden at Babcock",
    "1314": "Linden at Henry",
    "1339": "Observatory at Bascom",
    "1341": "W Dayton at N Mills",
    "1651": "N Charter at University",
    "1774": "W Dayton at N Park",
    "1816": "N Lake at University",
}


def get_stop_density(stop_name_or_id: str) -> StopDensityLevel:
    normalized = (stop_name_or_id or "").strip()
    if normalized in STOP_DENSITY:
        return STOP_DENSITY[normalized]
    # Resolve stop_id to stop_name so duplicate-name stops share the same density.
    name = _STOP_ID_TO_NAME.get(normalized)
    return STOP_DENSITY.get(name, DEFAULT_DENSITY)
