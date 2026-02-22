"""
Crowding service: GET /crowding?stop=...&route=80
Ghost risk service: GET /ghost-risk?stop=...&route=80
Run with: uvicorn main:app --reload --port 8000
"""

import os
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from crowding import get_crowding, get_ghost_risk

app = FastAPI(title="SmartTransit Crowding", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/crowding")
def crowding(stop: Optional[str] = None, route: str = "80"):
    result = get_crowding(stop_name_or_id=stop)
    out = {
        "crowd_risk": result["crowd_risk"],
        "crowding": result["crowding"],
        "route": route,
    }
    if "score" in result:
        out["score"] = result["score"]
    return out


@app.get("/ghost-risk")
def ghost_risk(stop: Optional[str] = None, route: str = "80"):
    api_key = os.environ.get("MADISON_METRO_API_KEY")
    prob = get_ghost_risk(stop_name_or_id=stop, api_key=api_key)
    # Return probability as percentage (0-100)
    prob_percent = round(prob * 100, 1)
    return {
        "ghost_risk": prob_percent,
        "ghost_risk_prob": prob,  # Also return as 0-1 for consistency
        "route": route,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
