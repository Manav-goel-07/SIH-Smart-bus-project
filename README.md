# SIH 2026 Project Repository

# Smart Bus Intelligence

Turning public buses into mobile urban sensing units for real-time city intelligence.

## 1. Project Information

- **Project Title:** Smart Bus Intelligence
- **PS ID:** 26124
- **PS Title:** AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet
- **Category:** Software
- **Theme:** Smart Cities and Infrastructure
- **Team:** Pixel-Pirates

### Team

| Team Member | Role |
| --- | --- |
| Rehan Garg | Backend Development |
| Manav Goel | Frontend Development |
| Aditya | Machine Learning |
| Sabhya Goel | Frontend–Backend API Integration |
| Siya | Machine Learning |
| Tunishi | Project Architecture and Presentation |

## 2. Problem Statement

Public buses already travel through large portions of a city and many are equipped with cameras. However, these cameras are commonly used for surveillance or post-incident review rather than continuous city-wide intelligence.

As a result, potholes and damaged roads can remain undetected, localized congestion is difficult to measure, waterlogging and missing road infrastructure can go unnoticed, and incidents such as hit-and-run events may not reach authorities quickly. Information collected by individual buses is also fragmented, while fixed CCTV infrastructure only covers predefined locations.

Installing dedicated cameras and sensors across an entire city is expensive and difficult to scale. Smart Bus Intelligence addresses this gap by turning existing public buses into mobile urban sensing units.

## 3. Proposed Solution

Smart Bus Intelligence combines edge computer vision, a centralized FastAPI backend, geospatial processing, Supabase storage, and a real-time city command dashboard.

Each participating bus processes camera footage and sends structured AI detections to the backend. The backend validates, geolocates, aggregates, correlates, stores, prioritizes, and broadcasts the resulting intelligence to authorities.

The platform supports three responsibilities:

- **ML layer:** Detects road damage, vehicles, traffic conditions, and safety signals from images or video.
- **Backend layer:** Validates detections, associates GPS coordinates, aggregates repeated observations, manages incidents, stores evidence, and provides APIs and WebSocket updates.
- **Frontend layer:** Visualizes the city map, incidents, road issues, traffic analytics, evidence, fleet information, and passenger routes.

## 4. Key Features

### Road Infrastructure Intelligence

- Pothole detection
- Longitudinal, transverse, and alligator crack detection
- Damaged road detection
- Waterlogging and other road-hazard extensibility
- Geolocated road-issue complaints
- Multi-bus corroboration of the same physical issue
- Priority score from 1–100 with reasons and supporting evidence

### Traffic Intelligence

- Vehicle-density observations
- Vehicle categories including cars, buses, trucks, and two-wheelers
- Localized congestion levels
- Traffic hotspot detection
- Traffic visualization on the live map
- Traffic analytics based on vehicle count, speed, and delay

### Safety Intelligence

- Incident creation and monitoring
- Hit-and-run and dangerous-driving event support
- Pedestrian and vulnerable-road-user event support
- Vehicle registration number field support
- Incident confidence, severity, location, timestamp, metadata, and evidence
- Pending, acknowledged, and in-progress workflows
- Optional photo evidence for incidents and road issues

### Operations and Passenger Experience

- Authority command dashboard
- Driver image and video upload workspace
- Annotated image and video results
- Live OpenStreetMap map with incidents, infrastructure issues, traffic, and fleet markers
- Real-time WebSocket updates
- Passenger bus tracking and delay visibility
- Delhi bus stop route selection
- Direct-route filtering between selected stops
- Expected arrival and journey-time estimates
- Supabase authentication, profiles, and private evidence storage

## 5. Technology Stack

- Frontend: React, Vite, React Router, Axios, Leaflet, React Leaflet, Lucide React
- Backend: Python, FastAPI, Uvicorn, SQLAlchemy, AsyncPG, Pydantic, GeoAlchemy2, WebSockets
- Machine Learning: Python, YOLOv12/Ultralytics, OpenCV, NumPy, Hugging Face Hub, PyTorch
- Database: PostgreSQL, PostGIS, Supabase
- Storage: Supabase Storage
- Maps: OpenStreetMap tiles with Leaflet
- Deployment: Docker, Vercel, Render, or another container platform

## 6. Architecture

See [docs/architecture.md](docs/architecture.md).

```yaml
PUBLIC BUS
  |
  v
Camera Streams
  |
  v
EDGE ML LAYER
  - Object detection
  - Classification
  - Tracking
  - OCR extension point
  - Computer vision
  |
  v
Structured AI Detections
  |
  v
FASTAPI BACKEND
  - Validation
  - Event processing
  - Geolocation
  - Aggregation
  - Correlation
  - Incident management
  - Evidence references
  |
  +----> PostgreSQL + PostGIS
  |        - Events
  |        - Road issues
  |        - Traffic data
  |        - Hotspots
  |        - Incidents
  |
  +----> Supabase Storage
  |
  +----> REST API + WebSocket
              |
              v
       CITY COMMAND DASHBOARD
       - Live map
       - Incidents
       - Road issues
       - Traffic analytics
       - Evidence review
       - Real-time alerts
```

### Example Detection

```json
{
  "event_type": "pothole",
  "confidence": 0.93,
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209
  }
}
```

### Road Issue Aggregation

Multiple buses can independently observe the same road issue. Nearby observations are grouped into one issue instead of creating duplicate records.

The system tracks detection count, distinct confirming buses, maximum confidence, severity, first detection time, last detection time, associated events, evidence, and priority.

### Traffic Hotspot Detection

Traffic observations contain GPS coordinates, timestamp, total vehicle count, cars, buses, trucks, and two-wheelers. The current MVP groups nearby observations using:

- Spatial radius: 100 metres
- Time window: 5 minutes

It calculates average vehicle count, peak vehicle count, observation count, unique bus count, and congestion level:

```text
Less than 15 vehicles  -> LOW
15 to 30 vehicles      -> MEDIUM
More than 30 vehicles  -> HIGH
```

### Incident Lifecycle

```text
NEW -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED
```

The authority interface also presents the active workflow as Pending, Acknowledged, and In Progress.

### Evidence Management

Images and videos are stored in Supabase Storage rather than directly in PostgreSQL. The database stores an evidence reference, which the dashboard uses to create a secure preview URL.

### Real-Time Updates

The backend exposes a WebSocket for live dashboard updates, including:

- `NEW_INCIDENT`
- `ROAD_ISSUE_UPDATE`
- `TRAFFIC_HOTSPOT_UPDATE`

## 7. Repository Structure

```text
smart-bus-intelligence/
├── README.md
├── SUBMISSION_GUIDE.md
├── submission/
│   ├── PRESENTATION.md
│   └── DEMO.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vercel.json
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── .env.example
├── ml-service/
│   ├── app/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
├── supabase/
│   └── schema.sql
├── docs/
│   └── architecture.md
├── assets/
│   └── screenshots/
├── .gitignore
└── LICENSE
```

### What goes where?

| Item | Location |
| --- | --- |
| Frontend source code | `frontend/` |
| Backend API source code | `backend/` |
| ML service | `ml-service/` |
| Supabase schema and policies | `supabase/` |
| Architecture documentation | `docs/` |
| Screenshots and prototype photos | `assets/screenshots/` |
| Final presentation | `submission/PRESENTATION.md` |
| Demo video link | `submission/DEMO.md` |
| Project overview | `README.md` |

## 8. Final Presentation

See submissions/PRESENTATION.md for the presentation.

## 9. Demo Video

See submission/DEMO.md for demo video.

## 10. Screenshots / Prototype Photos

Important screenshots and prototype photos are stored in `assets/screenshots/`, including the landing page, login page, dashboard, live map, traffic analytics, incidents, road issues, and congestion analysis views.

## 11. Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- A Supabase project with Email authentication enabled
- Git

The project uses Supabase PostgreSQL, so a separate local PostgreSQL installation is not required.

### Clone the Repository

```powershell
git clone https://github.com/NSUT-SIH-26/NSUT-SIH-DEMO.git
cd NSUT-SIH-DEMO
```

### Supabase Setup

1. Create a Supabase project.
2. Enable Email authentication under **Authentication -> Providers -> Email**.
3. Enable PostGIS:

```sql
create extension if not exists postgis;
```

4. Run `supabase/schema.sql` in the Supabase SQL Editor.
5. Keep the Supabase URL and anon key for the frontend.
6. Keep the PostgreSQL connection string and service-role key for the backend only.

Never commit `.env` files or expose the Supabase service-role key in the frontend.

### Backend Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Set these values in `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE_NAME
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### ML Service Setup

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

The first inference may take longer because the road-damage model is downloaded from Hugging Face. The configured road-damage model is `rezzzq/yolo12s-road-damage-rdd2022` with support for D00, D10, D20, D40, and Repair classes.

### Frontend Setup

```powershell
cd frontend
npm install
Copy-Item .env.example .env
```

Set these values in `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_ML_API_URL=http://127.0.0.1:8001
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_VIDEO_BUCKET=bus-videos
```

## 12. Run

Run each service in a separate terminal.

### Terminal 1 — Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`
- WebSocket: `ws://127.0.0.1:8000/ws`

### Terminal 2 — ML Service

```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

- API: `http://127.0.0.1:8001`
- Health: `http://127.0.0.1:8001/health`
- Image inference: `POST /predict/image`
- Video inference: `POST /predict/video`

### Terminal 3 — Frontend

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`.

If port 5173 is already in use:

```powershell
npm run dev -- --port 5174
```

### Frontend Routes

- `/` — Authority operations dashboard
- `/map` — Full live city map
- `/incidents` — Incident monitoring and status workflow
- `/road-issues` — Road issue registry and priority review
- `/traffic` — Traffic observations and hotspot analytics
- `/driver` — Driver image/video upload workspace

### API Integration

Frontend API calls are centralized in `frontend/src/services/api.js`.

The main dashboard consumes:

```text
GET   /api/incidents/
PATCH /api/incidents/{incident_id}/status
GET   /api/road-issues/
PATCH /api/road-issues/{issue_id}
GET   /api/traffic/hotspots
GET   /api/traffic/observations
WS    /ws
```

The driver dashboard communicates with the ML service through:

```text
POST /predict/image
POST /predict/video
```

### Production Build

```powershell
cd frontend
npm run build
npm run preview
```

For deployment, replace the local backend and ML URLs in `frontend/.env` with the deployed service URLs.

## 13. Future Scope

- Live bus tracking and route-level traffic intelligence
- Dynamic, road-specific congestion thresholds
- Historical and predictive traffic analytics
- Predictive road maintenance and automated prioritization
- Advanced vehicle re-identification and OCR
- Automated authority assignment, escalation, and notifications
- Mobile command-center interface
- Edge-device fleet management
- Advanced event correlation and distributed event processing
- Larger-scale GPU-backed inference deployment

## Important

Before submission, make sure the repository is accessible to reviewers. Do **not** upload passwords, API keys, access tokens, `.env` files containing secrets, Supabase service-role keys, model credentials, or other confidential information.
