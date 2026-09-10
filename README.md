# Smart Bus Intelligence

Smart Bus Intelligence turns public buses into mobile urban sensing units. The backend stores and serves road issues, traffic observations, traffic hotspots, and safety incidents. The frontend provides a real-time city operations dashboard with a Leaflet map and incident workflows.

## Project structure

```text
smart-bus-intelligence/
├── backend/        FastAPI + PostgreSQL/PostGIS service
├── frontend/       React + Vite + Tailwind dashboard
├── ml-service/     FastAPI + Ultralytics road-damage inference service
├── supabase/       Supabase schema and storage policies
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL with the PostGIS extension
- A configured database connection string

## 1. Configure the backend

Create `backend/.env` with the async PostgreSQL connection string used by the backend:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE_NAME
```

Make sure the target database has PostGIS enabled:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 2. Install and run the backend

From the repository root, open a terminal and run:

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### macOS/Linux

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at:

- API root: http://127.0.0.1:8000/
- Health check: http://127.0.0.1:8000/health
- WebSocket: ws://127.0.0.1:8000/ws

## 3. Configure the frontend

The frontend already includes a `.env` file with the default backend URL. To create your own local configuration, copy `.env.example` to `.env` inside `frontend/`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_VIDEO_BUCKET=bus-videos
```

Change the API value if the backend is running on another host or port. Get the Supabase URL and anon key from **Project settings > API**. The anon key is safe for browser use; never put a Supabase service-role key in `frontend/.env`.

### Supabase setup

1. Create a Supabase project and enable Email auth under **Authentication > Providers**.
2. Copy `supabase/schema.sql` into the Supabase SQL editor and run it. This creates the profile table, editable profile fields, driver-owned private video storage policies, and the `bus-videos` and `profile-avatars` buckets.
3. Start the frontend and open `/`. Users can sign up as a driver or authority. Driver accounts go to `/driver`; authority accounts go to the existing operations dashboard.
4. For a real deployment, promote authority users manually in Supabase using the SQL comment at the bottom of `supabase/schema.sql`. Do not rely on a client-selected admin role for production authorization without adding an approval workflow.

When the Supabase values are empty, the app shows the setup warning instead of pretending that authentication is working.

## 4. Install and run the frontend

Open a second terminal from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Vite will print the local dashboard URL, usually:

```text
http://localhost:5173/
```

If port `5173` is already in use, start on another port:

```powershell
npm run dev -- --port 5174
```

## Frontend routes

- `/` - Operations dashboard
- `/map` - Full live city map
- `/incidents` - Incident monitoring and status workflow
- `/road-issues` - Corroborated road issue registry
- `/traffic` - Traffic observations and hotspot analytics
- `/driver` - Driver video upload workspace (requires a driver profile)

## Production build

From `frontend/`:

```powershell
npm run build
npm run preview
```

The frontend reads data from the FastAPI API and does not generate fake operational records. If the backend is unavailable, the dashboard shows explicit loading, empty, and error states instead of hiding the problem.

## 6. Run the road-damage ML service

The separate ML service uses the Hugging Face `rezzzq/yolo12s-road-damage-rdd2022` YOLOv12 model. It detects RDD2022 classes: `D00` longitudinal crack, `D10` transverse crack, `D20` alligator crack, `D40` pothole, and `Repair`.

### Windows PowerShell

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The first inference downloads the model weights from Hugging Face and may take a little longer. The service exposes:

- `GET http://127.0.0.1:8001/health`
- `POST http://127.0.0.1:8001/predict/image`
- `POST http://127.0.0.1:8001/predict/video`

The driver dashboard uploads the video to the private Supabase bucket first, then sends the same file to the ML service for frame-sampled inference. Set `VITE_ML_API_URL` in `frontend/.env` if the ML service runs elsewhere.

## API integration

Frontend API calls are centralized in `frontend/src/services/api.js`. Realtime messages are handled by `frontend/src/services/websocket.js` and `frontend/src/hooks/useFleetData.js`.

The dashboard uses these backend feeds:

- `GET /api/incidents/`
- `PATCH /api/incidents/{incident_id}/status`
- `GET /api/road-issues/`
- `GET /api/traffic/hotspots`
- `GET /api/traffic/observations`
- `WS /ws`

The optional dashboard summary endpoint is used when available; otherwise, the frontend derives visible rollups from the loaded feeds.
