"""Face blur for shared photos (PLAN.md "Shareable photo-search links").

YuNet (MIT, ~230 KB ONNX, OpenCV's `FaceDetectorYN`) finds faces on the full-resolution upload, each box is padded and
pixelated + blurred. Kept apart from app.py so it imports (and is tested) without loading the ALPR models.
The output is re-encoded from pixels, so it carries no EXIF/GPS whatever the upload had.
"""

import io
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

MODEL_PATH = Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx"

# Recall over precision: a missed face is a privacy leak, a false positive is a blurred patch. YuNet's own default
# (0.9) misses profiles and small faces.
SCORE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.3
TOP_K = 500
# Detection runs on a copy whose long side is at most this (cost grows with pixels; a face this far from a 4608 px
# photo is ~1% of the frame). The blur itself is applied to the full-resolution frame.
DETECT_MAX_SIDE = 2560
BOX_PAD = 0.3  # of the face box width / height, each side
MIN_BLOCKS = 6  # a padded box is pixelated down to this many blocks on its short side
JPEG_QUALITY = 90


class UndecodableImage(Exception):
    pass


def decode(raw: bytes) -> np.ndarray:
    """Upload bytes -> upright BGR frame (phones store portrait shots sideways + an EXIF flag)."""
    try:
        pil_image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except Exception as exc:
        raise UndecodableImage from exc
    return np.ascontiguousarray(np.array(pil_image)[:, :, ::-1])


def detect_faces(frame: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Face boxes (x, y, w, h) in `frame` pixels."""
    height, width = frame.shape[:2]
    scale = min(1.0, DETECT_MAX_SIDE / max(height, width))
    small = cv2.resize(frame, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else frame
    # One detector per call: it keeps its input size as state and requests run on a threadpool.
    detector = cv2.FaceDetectorYN.create(
        str(MODEL_PATH), "", (small.shape[1], small.shape[0]), SCORE_THRESHOLD, NMS_THRESHOLD, TOP_K
    )
    _, faces = detector.detect(small)
    if faces is None:
        return []
    return [tuple(int(round(v / scale)) for v in face[:4]) for face in faces]


def _obscure(region: np.ndarray) -> np.ndarray:
    height, width = region.shape[:2]
    blocks = max(2, MIN_BLOCKS)
    scale = min(1.0, blocks / min(height, width))
    tiny = cv2.resize(
        region, (max(1, round(width * scale)), max(1, round(height * scale))), interpolation=cv2.INTER_AREA
    )
    pixelated = cv2.resize(tiny, (width, height), interpolation=cv2.INTER_NEAREST)
    kernel = max(3, (min(height, width) // 4) | 1)
    return cv2.GaussianBlur(pixelated, (kernel, kernel), 0)


def blur_boxes(frame: np.ndarray, boxes: list[tuple[int, int, int, int]]) -> np.ndarray:
    """A copy of `frame` with each padded box obscured."""
    height, width = frame.shape[:2]
    out = frame.copy()
    for x, y, w, h in boxes:
        x0, y0 = max(0, round(x - w * BOX_PAD)), max(0, round(y - h * BOX_PAD))
        x1, y1 = min(width, round(x + w * (1 + BOX_PAD))), min(height, round(y + h * (1 + BOX_PAD)))
        if x1 - x0 < 2 or y1 - y0 < 2:
            continue
        out[y0:y1, x0:x1] = _obscure(out[y0:y1, x0:x1])
    return out


def anonymize(raw: bytes) -> tuple[bytes, int]:
    """JPEG with every detected face blurred, and how many faces that was."""
    frame = decode(raw)
    boxes = detect_faces(frame)
    blurred = blur_boxes(frame, boxes) if boxes else frame
    ok, encoded = cv2.imencode(".jpg", blurred, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
    if not ok:
        raise RuntimeError("JPEG encoding failed")
    return encoded.tobytes(), len(boxes)
