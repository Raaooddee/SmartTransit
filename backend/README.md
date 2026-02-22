# SmartTransit Backend

## Crowding service (Python)

The bus fullness/crowding model runs in Python. The Next.js app can use it by starting this service and setting `CROWDING_SERVICE_URL`.

### Run the crowding API

**Option 1 – Run everything together (recommended)**  
From the project root, after `pip install -r backend/requirements.txt`:

```bash
npm run dev
```

This starts both the Next.js app (port 3000) and the Python crowding service (port 8000). The app is configured to use `http://localhost:8000` when running this way.

**Option 2 – Run the backend only**  
From the project root:

```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

Then run the Next.js app separately (`npm run dev:next`) and set in `.env.local`:

```
CROWDING_SERVICE_URL=http://localhost:8000
```

If `CROWDING_SERVICE_URL` is not set, the app falls back to the in-app default (crowd risk "medium").

### Endpoints

- `GET /crowding?stop=...&route=80` – Returns `crowd_risk`, `crowding`, optional `score`, and `route`.
- `GET /ghost-risk?stop=...&route=80` – Returns `ghost_risk` ("low" or "high") and `route`. Detects when scheduled buses don't actually show up.
- `GET /health` – Health check.

### Optional env (backend)

- `OPEN_METEO_BASE_URL` – Override Open-Meteo API base (default: `https://api.open-meteo.com`).
- `MADISON_METRO_API_KEY` – Required for ghost risk detection to fetch live vehicle data.
