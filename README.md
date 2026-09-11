# 🚌 Smart Bus Intelligence

> **Turning public buses into mobile urban sensing units for real-time city intelligence.**

## 📋 Problem Statement

| **Problem Statement ID**    | **26124**                                                                      |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Problem Statement Title** | **AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet** |

## 👥 Team — Pixel-Pirates

| **Team Member** | **Role**                            |
| --------------- | ----------------------------------- |
| **Rehan Garg**  | Backend Development                 |
| **Manav Goel**  | Frontend Development                |
| **Aditya**      | Machine Learning                    |
| **Sabhya Goel** | Frontend–Backend API Integration    |
| **Siya**        | Machine Learning                    |
| **Tunishi**     | Project Architecture & Presentation |

Smart Bus Intelligence is an AI-powered urban sensing platform that transforms existing cameras on public buses into a distributed network of mobile sensors.

Instead of cameras simply recording footage, the system uses **Edge AI + Computer Vision + Geospatial Processing + Real-Time Analytics** to detect road infrastructure problems, traffic conditions, and critical safety incidents across a city.

---

# 1. What Problem Are We Solving?

Modern cities already have a large number of public buses equipped with cameras. However, these cameras are primarily used for surveillance and post-incident analysis rather than continuous city-wide intelligence.

This creates several challenges:

* Road damage such as potholes may remain undetected for long periods.
* Traffic congestion is difficult to monitor at a highly localized level.
* Dangerous road conditions such as waterlogging or missing signs can go unnoticed.
* Critical incidents such as hit-and-run events require rapid identification and response.
* Information collected by individual buses is fragmented.
* Fixed CCTV infrastructure only monitors predefined locations.

Installing dedicated cameras and sensors throughout an entire city is expensive and difficult to scale.

### Our key insight

**Public buses already move through large portions of the city every day.**

Instead of building a completely new sensing infrastructure, we transform existing buses into **mobile urban sensing units**.

---

# 2. What Is Our Proposed Solution?

We propose **Smart Bus Intelligence**, a platform that combines computer vision running on the ML layer with a centralized backend and a real-time city command dashboard.

Each participating bus continuously processes camera footage and generates structured AI detections.

The system can be used to detect:

### 🛣️ Road Infrastructure

* Potholes
* Damaged roads
* Missing road dividers
* Missing zebra crossings
* Damaged or missing traffic signs
* Waterlogging
* Other road hazards

### 🚦 Traffic Intelligence

* Vehicle density
* Vehicle categories
* Traffic congestion
* Traffic hotspots
* Traffic patterns across monitored locations

### 🚨 Safety Intelligence

* Hit-and-run incidents
* Rash/dangerous driving situations
* Vulnerable pedestrian situations
* Vehicle tracking
* Vehicle registration number detection using OCR

The detections are sent to the backend, where they are validated, geolocated, aggregated, stored, and delivered to the command dashboard.

---

# 3. How Does It Work?

## System Architecture

```text
                       PUBLIC BUS
                           │
                    Camera Streams
                           │
                           ▼
                ┌─────────────────────┐
                │     EDGE ML LAYER   │
                │                     │
                │ Object Detection    │
                │ Classification      │
                │ Tracking            │
                │ OCR                 │
                │ Computer Vision     │
                └──────────┬──────────┘
                           │
                     AI Detections
                           │
                           ▼
                ┌─────────────────────┐
                │    FASTAPI BACKEND  │
                │                     │
                │ Validation          │
                │ Event Processing    │
                │ Geolocation         │
                │ Aggregation         │
                │ Correlation         │
                │ Incident Management │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ PostgreSQL + PostGIS│
                │                     │
                │ Events              │
                │ Road Issues         │
                │ Traffic Data        │
                │ Hotspots            │
                │ Incidents           │
                └──────────┬──────────┘
                           │
                  REST API + WebSocket
                           │
                           ▼
                ┌─────────────────────┐
                │   CITY DASHBOARD    │
                │                     │
                │ Live Map            │
                │ Incidents           │
                │ Road Issues         │
                │ Traffic Analytics   │
                │ Real-time Alerts    │
                └─────────────────────┘
```

---

## Three-Layer Responsibility

The system maintains a clear separation of responsibilities.

### ML Layer

**Detect**

The ML system processes camera footage and produces structured detections such as:

```json
{
  "event_type": "pothole",
  "confidence": 0.93,
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

The ML layer focuses on computer vision and detection.

---

### Backend Layer

**Understand and process**

The backend:

* Validates detections
* Stores events
* Associates GPS coordinates
* Aggregates repeated detections
* Correlates observations from multiple buses
* Identifies traffic hotspots
* Manages incidents
* Stores evidence
* Provides REST APIs
* Sends real-time updates

---

### Frontend Layer

**Visualize and operate**

The dashboard allows authorities to:

* Monitor the city map
* View road issues
* Monitor traffic
* Investigate incidents
* View evidence
* Update incident status
* Receive real-time alerts

---

# Road Issue Aggregation

A major feature is the ability to recognize that multiple detections can represent the **same physical road problem**.

For example:

```text
BUS_101 ──► Pothole ──► GPS A
                         │
BUS_102 ──► Pothole ──► GPS A + 10m
                         │
BUS_105 ──► Pothole ──► GPS A + 8m
                         │
                         ▼
                  SAME ROAD ISSUE
```

Instead of creating three separate potholes, the backend can aggregate them into one road issue.

The system tracks:

* Detection count
* Unique buses
* Maximum confidence
* Severity
* First detection time
* Last detection time
* Associated events

This allows repeated observations from different buses to provide stronger evidence that an infrastructure problem is persistent.

---

# Traffic Hotspot Detection

Traffic observations generated by buses contain:

* GPS coordinates
* Timestamp
* Total vehicle count
* Cars
* Buses
* Trucks
* Two-wheelers

The backend groups nearby observations within a spatial and temporal window.

Current MVP configuration:

```text
Spatial radius: 100 metres
Time window:    5 minutes
```

It calculates:

* Average vehicle count
* Peak vehicle count
* Observation count
* Unique bus count
* Congestion level

Current MVP classification:

```text
< 15 vehicles       → LOW
15–30 vehicles      → MEDIUM
> 30 vehicles       → HIGH
```

These thresholds can later be replaced with road-specific or dynamically learned thresholds.

---

# Incident Processing

Safety incidents are handled separately because they may require immediate action.

An incident can contain:

* Incident type
* Bus ID
* Timestamp
* GPS location
* AI confidence
* Vehicle registration number
* Severity
* Evidence reference
* Incident status
* Additional ML metadata

Incident lifecycle:

```text
NEW
 │
 ▼
ACKNOWLEDGED
 │
 ▼
INVESTIGATING
 │
 ▼
RESOLVED
```

---

# Evidence Management

Important incidents can have associated image evidence.

The system uses **Supabase Storage** for evidence files rather than storing image data directly inside PostgreSQL.

The database stores the corresponding evidence reference.

The flow is:

```text
Incident
   │
   ▼
FastAPI
   │
   ▼
Supabase Storage
   │
   ▼
Evidence Reference
   │
   ▼
Dashboard
```

This keeps large media files separate from transactional database data.

---

# Real-Time Updates

The backend exposes a WebSocket connection for live dashboard updates.

```text
Bus / ML
   │
   ▼
FastAPI
   │
   ├──────────────► PostgreSQL
   │
   └──────────────► WebSocket
                         │
                         ▼
                    Live Dashboard
```

Supported real-time events include:

```text
NEW_INCIDENT
ROAD_ISSUE_UPDATE
TRAFFIC_HOTSPOT_UPDATE
```

When a new event arrives, the dashboard can update without requiring a complete page refresh.

---

# 4. Technologies Used

## 🤖 Machine Learning / Computer Vision

The ML service is implemented using:

* **Python**
* **FastAPI**
* **Uvicorn**
* **OpenCV**
* **NumPy**
* **Hugging Face Hub**
* **YOLOv12**

### ML Requirements

```text
fastapi
uvicorn[standard]
python-multipart
opencv-python-headless
numpy
huggingface_hub
ultralytics @ git+https://github.com/sunsmarterjie/yolov12.git
```

The ML service is responsible for processing visual data and producing structured detections that can be consumed by the backend.

---

## ⚙️ Backend

* **Python**
* **FastAPI**
* **SQLAlchemy**
* **AsyncPG**
* **Pydantic**
* **Uvicorn**
* **GeoAlchemy2**
* **WebSockets**

The backend acts as the central intelligence and processing layer between the ML system and dashboard.

---

## 🗄️ Database

* **PostgreSQL**
* **PostGIS**
* **Supabase**

PostGIS provides geospatial capabilities for:

* Proximity searches
* Road issue clustering
* Traffic hotspot detection
* Distance calculations
* GPS-based event processing

---

## ☁️ Storage

**Supabase Storage**

Used for storing incident evidence such as images.

---

## 🖥️ Frontend

* **React**
* **Vite**
* **Tailwind CSS**
* **React Router**
* **Axios**
* **Leaflet**
* **React-Leaflet**
* **Lucide React**

The frontend provides the real-time city intelligence dashboard.

---

# 5. How Can a Reviewer Run It?

## Prerequisites

Install:

* Python 3.10+
* Node.js 18+
* npm
* A Supabase account and project

The project uses Supabase PostgreSQL for the database, so a separate local PostgreSQL installation is not required.

---

## Clone the Repository

```bash
git clone https://github.com/NSUT-SIH-26/NSUT-SIH-DEMO.git

cd NSUT-SIH-DEMO
```

---

## Backend Setup

Navigate to the backend:

```powershell
cd backend
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create:

```text
backend/.env
```

Add:

```env
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:5432/DATABASE_NAME

SUPABASE_URL=https://YOUR_PROJECT.supabase.co

SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

> **Do not commit `.env` or the Supabase service-role key to GitHub.**

Make sure PostGIS is enabled in the Supabase database:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Start the backend:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

WebSocket:

```text
ws://127.0.0.1:8000/ws
```

---

## Supabase Setup

Create a Supabase project and enable Email authentication:

```text
Authentication
→ Providers
→ Email
```

Then open the Supabase SQL Editor and run:

```text
supabase/schema.sql
```

This creates the required database tables, storage buckets, and storage policies.

You will need the following values from your Supabase project:

* Project URL
* Anon Key
* PostgreSQL connection string

The Supabase **anon key** is safe for browser use.

> Never put the Supabase service-role key in `frontend/.env`.

---

## ML Service Setup

Open another terminal from the repository root:

```powershell
cd ml-service
```

Create a virtual environment:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install ML dependencies:

```powershell
python -m pip install -r requirements.txt
```

Start the ML service:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

The ML service will be available at:

```text
http://127.0.0.1:8001
```

Health check:

```text
http://127.0.0.1:8001/health
```

Image inference:

```text
POST http://127.0.0.1:8001/predict/image
```

Video inference:

```text
POST http://127.0.0.1:8001/predict/video
```

The first inference may take longer because the road-damage model is downloaded from Hugging Face.

The ML service uses:

```text
rezzzq/yolo12s-road-damage-rdd2022
```

It detects:

| Class  | Meaning            |
| ------ | ------------------ |
| D00    | Longitudinal crack |
| D10    | Transverse crack   |
| D20    | Alligator crack    |
| D40    | Pothole            |
| Repair | Road repair        |

---

## Frontend Setup

Open another terminal from the repository root:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Create:

```text
frontend/.env
```

Add:

```env
VITE_API_URL=http://127.0.0.1:8000

VITE_ML_API_URL=http://127.0.0.1:8001

VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co

VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

VITE_SUPABASE_VIDEO_BUCKET=bus-videos
```

Start the frontend:

```powershell
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

If port `5173` is already in use:

```powershell
npm run dev -- --port 5174
```

---

## Running the Complete System

The reviewer should run three terminals.

### Terminal 1 — Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2 — ML Service

```powershell
cd ml-service
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

### Terminal 3 — Frontend

```powershell
cd frontend
npm run dev
```

Then open:

```text
http://localhost:5173
```

The system uses:

```text
Frontend   → http://localhost:5173
Backend    → http://127.0.0.1:8000
ML Service → http://127.0.0.1:8001
Supabase   → Database + Authentication + Storage
```

---

## Frontend Routes

* `/` — Operations dashboard
* `/map` — Full live city map
* `/incidents` — Incident monitoring and status workflow
* `/road-issues` — Road issue registry
* `/traffic` — Traffic observations and hotspot analytics
* `/driver` — Driver video upload workspace

The `/driver` workspace requires a driver profile.

---

## API Integration

Frontend API calls are centralized in:

```text
frontend/src/services/api.js
```

Realtime WebSocket messages are handled through:

```text
frontend/src/services/websocket.js
```

Fleet data is handled through:

```text
frontend/src/hooks/useFleetData.js
```

The dashboard consumes:

```text
GET   /api/incidents/
PATCH /api/incidents/{incident_id}/status

GET   /api/road-issues/

GET   /api/traffic/hotspots

GET   /api/traffic/observations

WS    /ws
```

The driver dashboard communicates with the ML service through:

```text
POST /predict/image
POST /predict/video
```

---

## Production Build

From the frontend directory:

```powershell
npm run build
```

To preview the production build:

```powershell
npm run preview
```

For deployment, replace the local backend and ML URLs in `frontend/.env` with the deployed service URLs.


# 6. What Does the Final Output Look Like?

The final output is a **real-time Smart City Command Dashboard**.

The main dashboard provides a unified view of intelligence collected from the bus network.

```text
┌──────────────────────────────────────────────────────────┐
│ SMART BUS INTELLIGENCE                    ● SYSTEM LIVE  │
├─────────────┬────────────────────────────────────────────┤
│             │                                            │
│ Dashboard   │  Total Events   Road Issues   Incidents    │
│             │       128            17          4         │
│ Live Map    │                                            │
│             │ ┌────────────────────────────────────────┐ │
│ Incidents   │ │                                        │ │
│             │ │            LIVE CITY MAP               │ │
│ Road Issues │ │                                        │ │
│             │ │     🔴        🟠          🔵            │ │
│ Traffic     │ │                                        │ │
│ Analytics   │ └────────────────────────────────────────┘ │
│             │                                            │
│             │ Recent Incidents     Road Issues            │
└─────────────┴────────────────────────────────────────────┘
```

The actual dashboard provides:

* Live GIS map
* Road issue markers
* Traffic hotspot markers
* Incident markers
* Severity indicators
* KPI cards
* Incident management
* Road issue monitoring
* Traffic analytics
* Evidence viewing
* Real-time notifications

---

# 7. Important Features & Expected Impact

## 🚍 Mobile Urban Sensing

Existing public buses become mobile sensing units without requiring a completely new city-wide sensing infrastructure.

As buses follow their regular routes, they can continuously contribute observations from different parts of the city.

---

## 🤖 AI-Powered Computer Vision

Camera feeds can be analyzed using computer vision models to detect infrastructure problems, vehicles, pedestrians, and safety-related events.

This transforms raw camera footage into structured intelligence.

---

## 📍 Geospatial Intelligence

Every observation is associated with geographic coordinates.

PostGIS enables the backend to perform spatial operations and convert individual detections into meaningful geographic information.

---

## 🔄 Multi-Bus Corroboration

Multiple buses can independently observe the same physical problem.

```text
BUS 101 ─┐
BUS 102 ─┼──► Same Road Issue
BUS 105 ─┘
```

This provides stronger evidence than relying on a single observation.

---

## 🚦 Real-Time Traffic Intelligence

Vehicle-count observations from buses can be transformed into localized congestion hotspots.

This gives authorities a more granular understanding of traffic conditions.

---

## 🚨 Faster Incident Response

Critical incidents can be pushed to the command dashboard through WebSockets.

This reduces the delay between:

```text
Detection
    ↓
Awareness
    ↓
Investigation
    ↓
Response
```

---

## 🗺️ Unified City Intelligence

Instead of treating road maintenance, traffic monitoring, and incident detection as isolated systems, the platform brings them together into one dashboard.

---

## 📈 Scalable Sensing Network

The system is designed around a simple principle:

```text
More buses
    ↓
More routes covered
    ↓
More observations
    ↓
Greater city visibility
```

The sensing network can therefore grow as additional buses participate.

---

# Future Scope

The current system can be extended with:

* Live bus tracking
* Route-level traffic intelligence
* Dynamic congestion thresholds
* Historical traffic analytics
* Predictive congestion
* Predictive road maintenance
* Automated maintenance prioritization
* Advanced vehicle re-identification
* Improved OCR
* Role-based access control
* Mobile command-center interface
* Edge-device fleet management
* Advanced event correlation
* Distributed event processing for very large deployments

---

# System Design Philosophy

The architecture follows a strict responsibility boundary:

```text
┌───────────────────────────────┐
│          ML / EDGE            │
│                               │
│ Detect                        │
│ Classify                      │
│ Track                         │
│ OCR                           │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│           BACKEND             │
│                               │
│ Validate                      │
│ Aggregate                     │
│ Geolocate                     │
│ Correlate                     │
│ Store                         │
│ Broadcast                     │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│          FRONTEND             │
│                               │
│ Visualize                     │
│ Monitor                       │
│ Investigate                   │
│ Manage                        │
└───────────────────────────────┘
```

This separation allows the ML, backend, and frontend layers to evolve independently while communicating through well-defined interfaces.

---

# 🎯 Core Idea

> **Don't build more cameras. Make the cameras already moving through the city intelligent.**

Smart Bus Intelligence transforms public transportation from a passive surveillance network into a **distributed, AI-powered, real-time urban sensing system**.
