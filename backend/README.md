# SmartTransit Backend

## Crowding service (Python)

The bus fullness/crowding model runs in Python. The Next.js app can use it by starting this service and setting `CROWDING_SERVICE_URL`.

### Run the crowding API

From the project root:

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

Then in the Next.js app (e.g. in `.env.local`):

```
CROWDING_SERVICE_URL=http://localhost:8000
```

If `CROWDING_SERVICE_URL` is not set, the app falls back to the in-app TypeScript crowding implementation.

### Endpoints

- `GET /crowding?stop=...&route=80` – Returns `crowd_risk`, `crowding`, optional `score`, and `route`.
- `GET /ghost-risk?stop=...&route=80` – Returns `ghost_risk` ("low" or "high") and `route`. Detects when scheduled buses don't actually show up.
- `GET /health` – Health check.

### Optional env (backend)

- `OPEN_METEO_BASE_URL` – Override Open-Meteo API base (default: `https://api.open-meteo.com`).
- `MADISON_METRO_API_KEY` – Required for ghost risk detection to fetch live vehicle data.
