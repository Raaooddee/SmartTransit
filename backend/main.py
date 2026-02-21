"""
Crowding service: GET /crowding?stop=...&route=80
Run with: uvicorn main:app --reload --port 8000
"""

from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from crowding import get_crowding

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


@app.get("/health")
def health():
    return {"status": "ok"}
