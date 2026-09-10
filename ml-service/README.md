# UrbanEye Road-Damage ML Service

This service runs two detectors together for UrbanEye uploads: SABIQ for road damage and [`Madan11/two-wheeler-detector`](https://huggingface.co/Madan11/two-wheeler-detector) for vehicles.

## What it detects

The model is trained on the RDD2022 classes:

- `crack` - Longitudinal, transverse, or alligator crack
- `other` - Other road corruption
- `pothole` - Pothole

Vehicle classes:

- `auto_rickshaw`, `bicycle`, `bus`, `car`, `motorcycle`
- `pickup`, `scooter`, `truck`, `van`

## Requirements

- Python 3.10+
- A machine with enough memory for PyTorch and the model weights
- FFmpeg/OpenCV-compatible video files

The model weights are downloaded from Hugging Face on the first inference and cached by Ultralytics.


## Run locally

From the repository root:

### Windows PowerShell

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

If another Python environment was previously used for testing the model, reset the ML service environment so FastAPI and the standalone script use the same YOLOv12 fork:

```powershell
python -m pip uninstall -y ultralytics
python -m pip install --no-cache-dir -r requirements.txt
```

Always start Uvicorn from this `ml-service\.venv` environment. Do not use the backend virtual environment for ML inference.

### macOS/Linux

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Check that it is running:

```text
http://127.0.0.1:8001/health
```

## API endpoints

### Health

```http
GET /health
```

### Image inference

```powershell
curl.exe -X POST http://127.0.0.1:8001/predict/image -F "file=@road-frame.jpg"
```

### Video inference

```powershell
curl.exe -X POST http://127.0.0.1:8001/predict/video -F "file=@bus-footage.mp4"
```

Video inference samples frames using `ML_FRAME_INTERVAL` and returns:

- `detections`: class, confidence, bounding box, frame number, and timestamp
- `summary.total_detections`
- `summary.counts`
- `summary.average_confidence`
- `summary.frames_processed`
- `summary.duration_seconds`

## Configuration

The service supports these environment variables:

```env
MODEL_REPO=Rahaf2001/sabiq-road-detection
MODEL_FILENAME=best.pt
VEHICLE_MODEL_REPO=Madan11/two-wheeler-detector
VEHICLE_MODEL_FILENAME=best.pt
VEHICLE_MODEL_PATH=models/vehicle_best.pt
ML_CONFIDENCE=0.10
ML_VEHICLE_CONFIDENCE=0.25
ML_IMAGE_SIZE=640
ML_FRAME_INTERVAL=12
ML_MAX_VIDEO_MB=500
ML_AUGMENT=true
```

For example, to process more frames:

```powershell
$env:ML_FRAME_INTERVAL="6"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Lower intervals improve temporal coverage but increase processing time.
`ML_AUGMENT=true` enables augmented inference, which is more robust to camera angle and road-frame composition but takes longer per image/frame.

Image responses include `annotated_image_base64` and `annotated_image_mime_type`. To preview the result in a browser or frontend, render it as:

```text
data:image/jpeg;base64,<annotated_image_base64>
```

When no detections are found, the annotated image will look the same as the input. This model detects road-surface damage only; it will not label arbitrary objects or screenshots.

## Frontend integration

Set this in `frontend/.env`:

```env
VITE_ML_API_URL=http://127.0.0.1:8001
```

The driver dashboard uploads a video to Supabase Storage first, then posts the same file to `/predict/video`. The ML service does not persist uploaded videos or inference results; Supabase remains the upload store.

## Docker

```powershell
cd ml-service
docker build -t urbaneye-ml-service .
docker run --rm -p 8001:8001 urbaneye-ml-service
```

The first container inference downloads the model weights, so the initial request can take longer than later requests.
