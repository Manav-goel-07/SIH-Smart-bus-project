# 🚌 Smart Bus Intelligence

> **Turning public buses into mobile urban sensing units for real-time city intelligence.**

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

* Python 3.11+
* Node.js 18+
* npm
* A Supabase project

---

# Clone the Repository

```bash
git clone https://github.com/NSUT-SIH-26/NSUT-SIH-DEMO.git

cd NSUT-SIH-DEMO
```

---

# Backend Setup

Navigate to:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
DATABASE_URL=your_supabase_postgresql_connection_string

SUPABASE_URL=your_supabase_project_url

SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

> **Do not commit `.env` or the Supabase service-role key to GitHub.**

Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

Backend:

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

Expected:

```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

# ML Setup

Navigate to the ML directory:

```bash
cd ml
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

Install ML dependencies:

```bash
pip install -r requirements.txt
```

The ML service can then be started using its FastAPI/Uvicorn entry point.

For example:

```bash
python -m uvicorn app.main:app --reload
```

> Replace `app.main:app` with the actual ML entry point if the ML directory uses a different module structure.

The ML service generates structured detections that are consumed by the backend APIs.

---

# Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create:

```text
frontend/.env
```

Add:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

Open the URL provided by Vite, typically:

```text
http://localhost:5173
```

---

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
