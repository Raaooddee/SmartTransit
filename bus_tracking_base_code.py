import os
import requests
import pandas as pd

# ==========================
# CONFIGURATION
# ==========================
# Madison Metro's live API host
HOST = "metromap.cityofmadison.com"
BASE_URL = f"http://{HOST}/bustime/api/v3"
API_KEY = os.environ.get("MADISON_METRO_API_KEY")
if not API_KEY:
    print("Error: Set MADISON_METRO_API_KEY in your environment.")
    print("Example: export MADISON_METRO_API_KEY='your-api-key'")
    exit(1)
ROUTES = "80"  # Route 80 is the UW-Madison campus loop

# ==========================
# FETCH VEHICLE DATA
# ==========================
# Function name comes after /v3/
endpoint = f"{BASE_URL}/getvehicles"

params = {
    "key": API_KEY,
    "format": "json", # JSON support confirmed in v3 guide
    "rt": ROUTES,
    "tmres": "s"      # Returns timestamps with seconds
}

try:
    response = requests.get(endpoint, params=params, timeout=15)
    
    # Raise error if URL is still wrong (404) or key is invalid (403)
    response.raise_for_status()

    data = response.json()
    bustime = data.get("bustime-response", {})

    # The API returns 'error' as a child of the root if something is wrong
    if "error" in bustime:
        # Some errors are lists in JSON, others are single dictionaries
        err_msg = bustime["error"]
        print(f"API Logic Error: {err_msg}")
    else:
        # Success: encapsulate vehicle info
        vehicles = bustime.get("vehicle", [])

        if not vehicles:
            print(f"No active buses found for Route {ROUTES}. Is it after service hours?")
        else:
            df = pd.DataFrame(vehicles)
            
            # Convert decimal degree strings to floats for mapping
            for col in ["lat", "lon", "spd"]:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors="coerce")

            print("\n--- Live Madison Metro (v3) ---")
            # Showing key fields: Vehicle ID, Route, Latitude, Longitude, and Speed
            print(df[["vid", "rt", "lat", "lon", "spd", "tmstmp", "psgld"]].head())
            print(f"\nSuccessfully tracked {len(df)} vehicles.")

except requests.exceptions.HTTPError as e:
    print(f"HTTP Error (likely URL or Key issue): {e}")
except Exception as e:
    print(f"Connection Error: {e}")