from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import subprocess
from uuid import uuid4

# CPU OPTIMIZATION: Maximum threads limitation
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")

CURRENT_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = CURRENT_DIR.parent / "uploads"
ULTRALYTICS_CONFIG_DIR = CURRENT_DIR.parent / ".ultralytics"
WEIGHTS_DIR = CURRENT_DIR / "weights"

YOLO_MODEL_PATH = WEIGHTS_DIR / "yolo_cow_detector" / "best.pt"
VIT_MODEL_DIR = WEIGHTS_DIR / "vit_behavior_classifier"

# ULTRA-OPTIMIZATION MOBILE: 1 image sur 15 (ex: 2 fps au lieu de 30)
FRAME_SKIP_RATIO = 15 

class VisionProcessingError(Exception):
    """Raised when a requested video cannot be processed."""

class VisionProcessingUnavailable(Exception):
    """Raised when model files or runtime dependencies are unavailable."""

@dataclass(slots=True)
class ProcessedVideoResult:
    original_video_url: str
    processed_video_url: str
    frames_processed: int
    total_detections: int
    behavior_counts: dict[str, int]

class CowVisionInference:
    def __init__(self) -> None:
        self._load_runtime_dependencies()
        self._validate_model_paths()
        self.device = "cpu"
        
        self.torch.set_num_threads(2)
        if hasattr(self.torch, 'set_num_interop_threads'):
            self.torch.set_num_interop_threads(1)
        
        self.detector = self.YOLO(str(YOLO_MODEL_PATH))
        self.detector.to(self.device)
        
        self.vit_processor = self.AutoImageProcessor.from_pretrained(str(VIT_MODEL_DIR), use_fast=True)
        self.vit_classifier = self.AutoModelForImageClassification.from_pretrained(str(VIT_MODEL_DIR)).to(self.device)
        self.vit_classifier.eval()
        self.behavior_labels = self.vit_classifier.config.id2label

    def _load_runtime_dependencies(self) -> None:
        ULTRALYTICS_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        os.environ.setdefault("YOLO_CONFIG_DIR", str(ULTRALYTICS_CONFIG_DIR))

        try:
            import cv2
            import torch
            import torch.nn.functional as torch_functional
            from PIL import Image
            from transformers import AutoImageProcessor, AutoModelForImageClassification
            from ultralytics import YOLO
        except ModuleNotFoundError as exc:
            missing_name = exc.name or "unknown"
            raise VisionProcessingUnavailable(
                f"Missing vision dependency: {missing_name}. Install backend vision requirements first."
            ) from exc

        self.cv2 = cv2
        self.torch = torch
        self.torch_functional = torch_functional
        self.Image = Image
        self.AutoImageProcessor = AutoImageProcessor
        self.AutoModelForImageClassification = AutoModelForImageClassification
        self.YOLO = YOLO

    def _validate_model_paths(self) -> None:
        if not YOLO_MODEL_PATH.exists():
            raise VisionProcessingUnavailable(f"YOLO model file not found: {YOLO_MODEL_PATH}")
        if not VIT_MODEL_DIR.exists():
            raise VisionProcessingUnavailable(f"ViT model directory not found: {VIT_MODEL_DIR}")

    def detect_cows(self, image_bgr, conf: float = 0.25) -> list[list[int]]:
        result = self.detector.predict(source=image_bgr, conf=conf, verbose=False)[0]
        if result.boxes is None or len(result.boxes) == 0:
            return []
        return result.boxes.xyxy.cpu().numpy().astype(int).tolist()

    def classify_cow(self, crop_bgr) -> dict[str, float | str]:
        crop_rgb = self.cv2.cvtColor(crop_bgr, self.cv2.COLOR_BGR2RGB)
        inputs = self.vit_processor(self.Image.fromarray(crop_rgb), return_tensors="pt")
        inputs = {key: value.to(self.device) for key, value in inputs.items()}

        with self.torch.no_grad():
            logits = self.vit_classifier(**inputs).logits
            probs = self.torch_functional.softmax(logits, dim=-1)

        pred_id = int(logits.argmax(-1).item())
        behavior = self.behavior_labels.get(pred_id) or self.behavior_labels.get(str(pred_id)) or str(pred_id)
        return {"class": behavior, "conf": float(probs[0, pred_id].item())}

    def run_pipeline(self, image_bgr) -> list[dict[str, object]]:
        results: list[dict[str, object]] = []

        for box in self.detect_cows(image_bgr):
            x1, y1, x2, y2 = box
            crop = image_bgr[y1:y2, x1:x2]
            if crop.size == 0:
                continue

            behavior = self.classify_cow(crop)
            results.append(
                {
                    "bbox": box,
                    "behavior": str(behavior["class"]),
                    "conf": float(behavior["conf"]),
                }
            )
        return results

    def draw_results(self, image_bgr, results: list[dict[str, object]]):
        annotated = image_bgr.copy()

        for result in results:
            x1, y1, x2, y2 = result["bbox"]
            label = f"{result['behavior']} ({float(result['conf']):.2f})"
            self.cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
            self.cv2.putText(
                annotated,
                label,
                (x1, max(20, y1 - 8)),
                self.cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                (255, 255, 255),
                2,
            )
        return annotated

    def process_video(self, video_path: Path, output_path: Path, max_frames: int = 500) -> tuple[int, int, dict[str, int]]:
        cap = self.cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise VisionProcessingError(f"Could not open video: {video_path.name}")

        fps = cap.get(self.cv2.CAP_PROP_FPS) or 25.0
        original_width = int(cap.get(self.cv2.CAP_PROP_FRAME_WIDTH))
        original_height = int(cap.get(self.cv2.CAP_PROP_FRAME_HEIGHT))
        if original_width <= 0 or original_height <= 0:
            cap.release()
            raise VisionProcessingError(f"Could not read video dimensions: {video_path.name}")

        # CPU OPTIMIZATION: Agressive target resolution 320px (instead of 640px)
        max_dimension = max(original_width, original_height)
        scale_factor = 320 / max_dimension if max_dimension > 320 else 1.0
        downsampled_width = max(160, int(original_width * scale_factor))
        downsampled_height = max(120, int(original_height * scale_factor))

        output_path.parent.mkdir(parents=True, exist_ok=True)
        raw_output_path = output_path.with_name(f"{output_path.stem}-raw.mp4")
        writer = self.cv2.VideoWriter(str(raw_output_path), self.cv2.VideoWriter_fourcc(*"mp4v"), fps, (original_width, original_height))
        
        if not writer.isOpened():
            cap.release()
            raise VisionProcessingError(f"Could not create processed video: {raw_output_path.name}")

        frame_count = 0
        total_detections = 0
        behavior_counts: Counter[str] = Counter()
        frame_index = 0
        
        # Stockage des derniers résultats pour fluidifier le rendu des frames sautées
        last_known_results = []

        try:
            while cap.isOpened() and frame_count < max_frames:
                ok, frame = cap.read()
                if not ok:
                    break

                # Frame skipping persistant : on dessine les anciens cadres
                if frame_index % FRAME_SKIP_RATIO != 0:
                    annotated = self.draw_results(frame, last_known_results)
                    writer.write(annotated)
                    frame_index += 1
                    continue

                # Traitement de l'image réduite
                frame_small = self.cv2.resize(frame, (downsampled_width, downsampled_height), interpolation=self.cv2.INTER_LINEAR)
                results = self.run_pipeline(frame_small)
                
                # Remise à l'échelle des coordonnées pour la vidéo HD
                if scale_factor < 1.0:
                    for result in results:
                        x1, y1, x2, y2 = result["bbox"]
                        result["bbox"] = [
                            int(x1 / scale_factor),
                            int(y1 / scale_factor),
                            int(x2 / scale_factor),
                            int(y2 / scale_factor)
                        ]
                
                last_known_results = results # Mise à jour du cache
                
                annotated = self.draw_results(frame, results)
                writer.write(annotated)

                total_detections += len(results)
                behavior_counts.update(str(result["behavior"]) for result in results)
                frame_count += 1
                frame_index += 1
        finally:
            cap.release()
            writer.release()

        self._make_browser_playable_mp4(raw_output_path, output_path)
        return frame_count, total_detections, dict(behavior_counts)

    def _make_browser_playable_mp4(self, raw_output_path: Path, output_path: Path) -> None:
        try:
            import imageio_ffmpeg
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        except ModuleNotFoundError:
            shutil.move(str(raw_output_path), str(output_path))
            return

        command = [
            ffmpeg_exe, "-y", "-i", str(raw_output_path),
            "-vcodec", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", str(output_path),
        ]

        completed = subprocess.run(command, capture_output=True, text=True)
        raw_output_path.unlink(missing_ok=True)

        if completed.returncode != 0:
            raise VisionProcessingError(f"Could not transcode processed video for browser playback: {completed.stderr}")

_ENGINE: CowVisionInference | None = None

def get_vision_engine() -> CowVisionInference:
    global _ENGINE
    if _ENGINE is None:
        _ENGINE = CowVisionInference()
    return _ENGINE

def resolve_uploaded_video_path(video_url: str) -> Path:
    if not video_url.startswith("/static/uploads/"):
        raise VisionProcessingError("video_url must point to /static/uploads/")

    filename = Path(video_url).name
    if not filename:
        raise VisionProcessingError("video_url does not include a filename")

    video_path = UPLOADS_DIR / filename
    if not video_path.exists():
        raise VisionProcessingError(f"Uploaded video not found: {filename}")

    return video_path

def process_uploaded_video(video_url: str, max_frames: int = 500) -> ProcessedVideoResult:
    video_path = resolve_uploaded_video_path(video_url)
    output_filename = f"processed-{video_path.stem}-{uuid4().hex[:8]}.mp4"
    output_path = UPLOADS_DIR / output_filename

    frames_processed, total_detections, behavior_counts = get_vision_engine().process_video(
        video_path=video_path,
        output_path=output_path,
        max_frames=max_frames,
    )

    return ProcessedVideoResult(
        original_video_url=video_url,
        processed_video_url=f"/static/uploads/{output_filename}",
        frames_processed=frames_processed,
        total_detections=total_detections,
        behavior_counts=behavior_counts,
    )