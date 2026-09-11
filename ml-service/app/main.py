import os
import logging
import base64
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download

os.environ.setdefault("YOLO_CONFIG_DIR", str(Path(__file__).resolve().parent.parent / "runtime"))

from ultralytics import YOLO

MODEL_REPO = os.getenv("MODEL_REPO", "Rahaf2001/sabiq-road-detection")
MODEL_FILENAME = os.getenv("MODEL_FILENAME", "best.pt")
VEHICLE_MODEL_REPO = os.getenv("VEHICLE_MODEL_REPO", "Madan11/two-wheeler-detector")
VEHICLE_MODEL_FILENAME = os.getenv("VEHICLE_MODEL_FILENAME", "best.pt")
VEHICLE_MODEL_PATH = os.getenv("VEHICLE_MODEL_PATH", str(Path(__file__).resolve().parent.parent / "models" / "vehicle_best.pt"))
VEHICLE_CONFIDENCE = float(os.getenv("ML_VEHICLE_CONFIDENCE", "0.25"))
ENABLE_VEHICLES = os.getenv("ML_ENABLE_VEHICLES", "true").lower() in {"1", "true", "yes", "on"}
CONFIDENCE = float(os.getenv("ML_CONFIDENCE", "0.10"))
IMAGE_SIZE = int(os.getenv("ML_IMAGE_SIZE", "640"))
USE_AUGMENT = os.getenv("ML_AUGMENT", "true").lower() in {"1", "true", "yes", "on"}
FRAME_INTERVAL = max(1, int(os.getenv("ML_FRAME_INTERVAL", "12")))
MAX_VIDEO_MB = int(os.getenv("ML_MAX_VIDEO_MB", "500"))
FFMPEG_PATH = os.getenv("FFMPEG_PATH", "ffmpeg")

app = FastAPI(title="UrbanEye Road Damage ML Service", version="1.0.0")
logger = logging.getLogger("urbaneye-ml")
configured_origins = [origin.strip().rstrip('/') for origin in os.getenv('CORS_ORIGINS', '').split(',') if origin.strip()]
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://sih-smart-bus-project.vercel.app",
]
allowed_origins = list(dict.fromkeys(default_origins + configured_origins))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model: YOLO | None = None
vehicle_model: YOLO | None = None


def patch_yolov12_attention() -> None:
    """Make the runtime forward pass support the checkpoint's qkv modules."""
    from ultralytics.nn.modules.block import AAttn

    def forward(self, x):
        batch, channels, height, width = x.shape
        tokens = height * width
        qk_layer = self._modules.get("qk")
        value_layer = self._modules.get("v")
        qkv_layer = self._modules.get("qkv")
        if qk_layer is not None and value_layer is not None:
            qk_map = qk_layer(x)
            value_map = value_layer(x)
        elif qkv_layer is not None:
            packed = qkv_layer(x)
            all_head_dim = self.head_dim * self.num_heads
            qk_map, value_map = torch.split(packed, [all_head_dim * 2, all_head_dim], dim=1)
        else:
            raise RuntimeError("Unsupported YOLOv12 attention layout")
        qk = qk_map.flatten(2).transpose(1, 2)
        positional = self.pe(value_map)
        value = value_map.flatten(2).transpose(1, 2)
        if self.area > 1:
            qk = qk.reshape(batch * self.area, tokens // self.area, channels * 2)
            value = value.reshape(batch * self.area, tokens // self.area, channels)
            batch, tokens, _ = qk.shape
        query, key = qk.split([channels, channels], dim=2)
        query = query.transpose(1, 2).view(batch, self.num_heads, self.head_dim, tokens)
        key = key.transpose(1, 2).view(batch, self.num_heads, self.head_dim, tokens)
        value = value.transpose(1, 2).view(batch, self.num_heads, self.head_dim, tokens)
        attention = (query.transpose(-2, -1) @ key) * (self.head_dim ** -0.5)
        attention = (attention - attention.max(dim=-1, keepdim=True).values).exp()
        attention = attention / attention.sum(dim=-1, keepdim=True)
        output = (value @ attention.transpose(-2, -1)).permute(0, 3, 1, 2)
        if self.area > 1:
            output = output.reshape(batch // self.area, tokens * self.area, channels)
            batch, tokens, _ = output.shape
        output = output.reshape(batch, height, width, channels).permute(0, 3, 1, 2)
        return self.proj(output + positional)

    AAttn.forward = forward


def get_model() -> YOLO:
    global model
    if model is None:
        patch_yolov12_attention()
        model_path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILENAME)
        model = YOLO(model_path)
    return model


def get_vehicle_model() -> YOLO:
    global vehicle_model
    if vehicle_model is None:
        model_path = VEHICLE_MODEL_PATH if Path(VEHICLE_MODEL_PATH).exists() else hf_hub_download(repo_id=VEHICLE_MODEL_REPO, filename=VEHICLE_MODEL_FILENAME)
        vehicle_model = YOLO(model_path)
    return vehicle_model


def detections_from_result(result: Any, detector: YOLO, frame_number: int, timestamp_seconds: float) -> list[dict[str, Any]]:
    names = result.names or detector.names
    detections = []
    if result.boxes is None:
        return detections
    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])
        coordinates = [round(float(value), 2) for value in box.xyxy[0].tolist()]
        detections.append({
            "class_id": class_id,
            "class_name": names.get(class_id, str(class_id)) if isinstance(names, dict) else names[class_id],
            "confidence": round(confidence, 4),
            "bbox": coordinates,
            "frame": frame_number,
            "timestamp_seconds": round(timestamp_seconds, 2),
        })
    return detections


def infer_result(image: Any, detector: YOLO | None = None, confidence: float | None = None) -> Any:
    detector = detector or get_model()
    return detector.predict(source=image, conf=confidence or CONFIDENCE, imgsz=IMAGE_SIZE, augment=USE_AUGMENT, verbose=False)[0]


def annotate_frame(frame: Any, road_result: Any, vehicle_result: Any = None) -> Any:
    annotated = road_result.plot(img=frame, labels=True, boxes=True)
    return vehicle_result.plot(img=annotated, labels=True, boxes=True) if vehicle_result is not None else annotated


def infer_frame(image: Any, frame_number: int, timestamp_seconds: float) -> list[dict[str, Any]]:
    detector = get_model()
    result = infer_result(image)
    return detections_from_result(result, detector, frame_number, timestamp_seconds)


def summarize(detections: list[dict[str, Any]], frames_processed: int, duration_seconds: float) -> dict[str, Any]:
    counts = Counter(item["class_name"] for item in detections)
    confidence_by_class: dict[str, list[float]] = {}
    for item in detections:
        confidence_by_class.setdefault(item["class_name"], []).append(item["confidence"])
    return {
        "frames_processed": frames_processed,
        "duration_seconds": round(duration_seconds, 2),
        "total_detections": len(detections),
        "counts": dict(counts),
        "average_confidence": {key: round(sum(values) / len(values), 4) for key, values in confidence_by_class.items()},
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "models": {"road_damage": MODEL_REPO, "vehicles": VEHICLE_MODEL_REPO if ENABLE_VEHICLES else None}, "model_files": {"road_damage": MODEL_FILENAME, "vehicles": VEHICLE_MODEL_PATH if ENABLE_VEHICLES and Path(VEHICLE_MODEL_PATH).exists() else (VEHICLE_MODEL_FILENAME if ENABLE_VEHICLES else None)}, "models_loaded": {"road_damage": model is not None, "vehicles": vehicle_model is not None}, "vehicle_detection_enabled": ENABLE_VEHICLES, "confidence": {"road_damage": CONFIDENCE, "vehicles": VEHICLE_CONFIDENCE}, "image_size": IMAGE_SIZE, "augment": USE_AUGMENT}


@app.post("/predict/image")
async def predict_image(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    suffix = Path(file.filename or "upload.jpg").suffix or ".jpg"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp:
            temp_path = temp.name
            temp.write(content)
        image = cv2.imread(temp_path, cv2.IMREAD_COLOR)
        if image is None:
            raise HTTPException(status_code=400, detail="The image could not be decoded.")
        road_detector = get_model()
        vehicle_detector = get_vehicle_model() if ENABLE_VEHICLES else None
        road_result = infer_result(temp_path, road_detector, CONFIDENCE)
        vehicle_result = infer_result(temp_path, vehicle_detector, VEHICLE_CONFIDENCE) if vehicle_detector is not None else None
        detections = detections_from_result(road_result, road_detector, 0, 0)
        if vehicle_result is not None:
            detections.extend(detections_from_result(vehicle_result, vehicle_detector, 0, 0))
        annotated_image = annotate_frame(image, road_result, vehicle_result)
        encoded_ok, encoded = cv2.imencode(".jpg", annotated_image, [cv2.IMWRITE_JPEG_QUALITY, 90])
        if not encoded_ok:
            raise RuntimeError("The annotated image could not be encoded")
    except Exception as error:
        logger.exception("Image inference failed")
        raise HTTPException(status_code=502, detail=f"Model inference failed: {error}") from error
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass
    return {
        "file_name": file.filename,
        "runtime": {"road_confidence": CONFIDENCE, "vehicle_confidence": VEHICLE_CONFIDENCE, "image_size": IMAGE_SIZE, "augment": USE_AUGMENT},
        "detections": detections,
        "summary": summarize(detections, 1, 0),
        "annotated_image_base64": base64.b64encode(encoded.tobytes()).decode("ascii"),
        "annotated_image_mime_type": "image/jpeg",
    }


@app.post("/predict/video")
async def predict_video(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=415, detail="Upload a video file.")
    temp_path = None
    annotated_path = None
    browser_annotated_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(file.filename or "upload.mp4").suffix or ".mp4") as temp:
            temp_path = temp.name
            size = 0
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_VIDEO_MB * 1024 * 1024:
                    raise HTTPException(status_code=413, detail=f"Videos must be smaller than {MAX_VIDEO_MB} MB.")
                temp.write(chunk)
        capture = cv2.VideoCapture(temp_path)
        if not capture.isOpened():
            raise HTTPException(status_code=400, detail="The video could not be decoded.")
        fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = frame_count / fps if frame_count else 0
        width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        if width <= 0 or height <= 0:
            raise HTTPException(status_code=400, detail="The video has no readable dimensions.")
        with tempfile.NamedTemporaryFile(delete=False, suffix=".avi") as annotated_temp:
            annotated_path = annotated_temp.name
        writer = cv2.VideoWriter(annotated_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (width, height))
        if not writer.isOpened():
            raise HTTPException(status_code=502, detail="The annotated video could not be created.")
        detections = []
        frame_number = 0
        frames_processed = 0
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                output_frame = frame
                if frame_number % FRAME_INTERVAL == 0:
                    road_detector = get_model()
                    vehicle_detector = get_vehicle_model() if ENABLE_VEHICLES else None
                    road_result = infer_result(frame, road_detector, CONFIDENCE)
                    vehicle_result = infer_result(frame, vehicle_detector, VEHICLE_CONFIDENCE) if vehicle_detector is not None else None
                    detections.extend(detections_from_result(road_result, road_detector, frame_number, frame_number / fps))
                    if vehicle_result is not None:
                        detections.extend(detections_from_result(vehicle_result, vehicle_detector, frame_number, frame_number / fps))
                    output_frame = annotate_frame(frame, road_result, vehicle_result)
                    frames_processed += 1
                writer.write(output_frame)
                frame_number += 1
        except Exception as error:
            logger.exception("Video inference failed")
            raise HTTPException(status_code=502, detail=f"Model inference failed: {error}") from error
        finally:
            capture.release()
            writer.release()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as browser_temp:
            browser_annotated_path = browser_temp.name
        conversion = subprocess.run([
            FFMPEG_PATH, "-y", "-loglevel", "error", "-i", annotated_path,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-an", browser_annotated_path,
        ], capture_output=True, text=True)
        if conversion.returncode != 0:
            raise RuntimeError(f"Browser video conversion failed: {conversion.stderr.strip()}")
        with open(browser_annotated_path, "rb") as annotated_file:
            annotated_video = base64.b64encode(annotated_file.read()).decode("ascii")
        return {
            "file_name": file.filename,
            "models": {"road_damage": MODEL_REPO, "vehicles": VEHICLE_MODEL_REPO if ENABLE_VEHICLES else None},
            "detections": detections,
            "summary": summarize(detections, frames_processed, duration),
            "annotated_video_base64": annotated_video,
            "annotated_video_mime_type": "video/mp4",
        }
    finally:
        if temp_path:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass
        if annotated_path:
            try:
                os.unlink(annotated_path)
            except FileNotFoundError:
                pass
        if browser_annotated_path:
            try:
                os.unlink(browser_annotated_path)
            except FileNotFoundError:
                pass
