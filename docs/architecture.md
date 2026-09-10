# System Architecture

## High-level flow

```text
                         ┌──────────────────────┐
                         │    Public Buses      │
                         │   Onboard Cameras     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     Edge AI Device   │
                         │  Computer Vision     │
                         └──────────┬───────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   │                │                │
                   ▼                ▼                ▼
            Road Analysis    Traffic Analysis   Safety Analysis
                   │                │                │
                   └────────────────┼────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │   Backend API        │
                         │      FastAPI         │
                         └──────────┬───────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
           Event Processing   Traffic Aggregation   Incident
                  │                 │              Management
                  └─────────────────┼─────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │ PostgreSQL + PostGIS │
                         │   Central Database   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   WebSocket Layer    │
                         │   Real-time Updates  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   React Dashboard    │
                         │  GIS + Analytics     │
                         └──────────────────────┘
```

## Components

### Public Bus Cameras

Existing onboard cameras installed on public buses act as mobile sensing devices.

The cameras continuously capture road and traffic scenes while the bus travels through the city.

The system does not require a dedicated sensing vehicle because the existing public transport fleet provides city-wide coverage.

### Edge AI Device

An edge computing device connected to the bus cameras processes the camera feed locally.

The machine learning models identify relevant events such as:

* Potholes and damaged roads
* Missing road dividers
* Missing or damaged zebra crossings
* Damaged or missing traffic signs
* Waterlogging and other road hazards
* Vehicle density
* Traffic bottlenecks
* Vulnerable pedestrians
* Hit-and-run or rash-driving incidents

The edge layer extracts useful detection information instead of continuously sending raw video to the central server.

### Machine Learning Models

The ML layer performs computer-vision analysis on the camera feed.

Different analysis modules handle different categories of urban intelligence:

**Road Analysis**

Detects road infrastructure problems and hazards.

**Traffic Analysis**

Detects and counts vehicles to estimate traffic density and identify congestion hotspots.

**Safety Analysis**

Identifies potentially dangerous situations and incidents. For supported incidents, the system can also track the offending vehicle and extract its registration number.

The ML layer sends structured detection results to the backend rather than directly communicating with the frontend.

### Backend API

The backend is implemented using **FastAPI**.

It acts as the central processing and coordination layer between the ML system, database, storage, and frontend.

The backend is responsible for:

* Receiving ML detection events
* Validating incoming data
* Processing and storing events
* Associating repeated detections with existing road issues
* Aggregating traffic observations
* Identifying traffic hotspots
* Managing incidents
* Handling incident status updates
* Managing evidence uploads
* Providing dashboard APIs
* Broadcasting real-time updates through WebSockets

### Event Processing

Raw detections received from buses are stored as events.

For repeated road detections, the backend performs spatial matching to determine whether the detection corresponds to an already known road issue.

For example:

```text
Bus 101 detects pothole
        ↓
Backend receives event
        ↓
Search for existing pothole nearby
        ↓
Existing issue found?
     /          \
   YES           NO
    ↓             ↓
Update issue   Create issue
    ↓             ↓
        Store event
```

This prevents the same physical road problem from being treated as a completely new issue every time another bus detects it.

### Traffic Aggregation

Traffic observations from buses contain:

* Vehicle count
* Cars
* Buses
* Trucks
* Two-wheelers
* GPS coordinates
* Timestamp
* Bus ID

The backend combines observations that occur within a defined spatial and temporal window.

The current aggregation uses a **100 metre spatial radius** and a **5 minute temporal window** to generate traffic hotspots.

Each hotspot stores information such as:

* Average vehicle count
* Peak vehicle count
* Number of observations
* Number of unique buses
* Congestion level

### Incident Management

Safety-related incidents are stored separately from normal road and traffic observations.

An incident can contain:

* Incident type
* Bus ID
* Timestamp
* GPS location
* Detection confidence
* Vehicle registration number
* Severity
* Evidence reference
* Incident status
* Additional metadata

Incident statuses include:

```text
NEW
  ↓
ACKNOWLEDGED
  ↓
INVESTIGATING
  ↓
RESOLVED
```

This allows authorities or operators to track an incident throughout its lifecycle.

### Evidence Storage

Incident evidence such as images is stored using **Supabase Storage**.

The database stores the reference to the evidence rather than storing the image itself.

The flow is:

```text
ML / Camera
     ↓
Backend API
     ↓
Supabase Storage
     ↓
Evidence Reference
     ↓
PostgreSQL
```

This keeps large media files separate from structured application data.

### Database

The central database uses **PostgreSQL with PostGIS**.

PostGIS enables the system to perform geographic queries on detected events and infrastructure problems.

The database stores entities such as:

* Events
* Road issues
* Traffic observations
* Traffic hotspots
* Incidents

Geospatial indexing allows the backend to efficiently perform operations such as:

```text
"Find road issues within 20 metres of this detection."

"Find traffic observations within 100 metres of this location."

"Find incidents near this location."
```

### WebSocket / Real-time Layer

The backend provides a WebSocket connection for real-time updates.

When an important event is processed, the backend can broadcast an update to connected dashboards.

Examples include:

```text
NEW_INCIDENT
ROAD_ISSUE_UPDATE
TRAFFIC_HOTSPOT_UPDATE
```

This allows the dashboard to update without continuously refreshing the page.

### Frontend Dashboard

The frontend is built using **React**.

It provides a central command dashboard for visualizing intelligence collected from the bus fleet.

The dashboard displays:

* Overall system statistics
* Road issues
* Traffic hotspots
* Active incidents
* Severity information
* GIS-based event locations
* Incident details
* Real-time updates

The GIS interface displays different event categories on the map so that operators can quickly understand what is happening across the city.

## Data Flow

The complete data flow can be summarized as:

```text
Bus Camera
    │
    ▼
Edge AI
    │
    ├──────────► Road Detection
    │
    ├──────────► Traffic Detection
    │
    └──────────► Safety Detection
                    │
                    ▼
              Structured Event
                    │
                    ▼
              FastAPI Backend
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Events     Traffic   Incidents
          │         │         │
          ▼         ▼         ▼
       Processing Aggregation Management
          │         │         │
          └─────────┼─────────┘
                    ▼
             PostgreSQL
              + PostGIS
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
    REST API              WebSocket
          │                   │
          └─────────┬─────────┘
                    ▼
             React Dashboard
                    │
                    ▼
             City Intelligence
```

## Technology Stack

| Layer                   | Technology                |
| ----------------------- | ------------------------- |
| Frontend                | React, Vite, Tailwind CSS |
| Maps                    | Leaflet, React-Leaflet    |
| Backend                 | FastAPI, Python           |
| Database                | PostgreSQL                |
| Geospatial Database     | PostGIS                   |
| ORM                     | SQLAlchemy                |
| Real-time Communication | WebSockets                |
| Object Storage          | Supabase Storage          |
| Machine Learning        | YOLOv12, OpenCV, NumPy    |
| ML API                  | FastAPI, Uvicorn          |
| Model Hosting           | Hugging Face Hub          |

## Architecture Principle

The system follows a clear separation of responsibilities:

```text
ML detects
     ↓
Backend validates, processes and aggregates
     ↓
Database stores
     ↓
WebSocket / REST API exposes
     ↓
Frontend visualizes
```

The Machine Learning layer is therefore independent of the frontend.

This allows ML models to be improved or replaced without requiring major changes to the dashboard.

## Scalability and Future Scope

The current implementation uses a modular backend architecture suitable for the prototype and hackathon deployment.

As the number of buses and detections increases, individual components can be separated into independent services.

Potential future services include:

```text
API Gateway
     │
     ├── Event Ingestion Service
     ├── Road Intelligence Service
     ├── Traffic Intelligence Service
     ├── Incident Management Service
     ├── Notification Service
     └── Analytics Service
```

A message queue or event-streaming system can also be introduced for large-scale event ingestion.

This allows the platform to evolve from a prototype into a city-scale urban intelligence infrastructure without changing the fundamental data flow.
