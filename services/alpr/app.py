"""Self-hosted ALPR service — FastAPI wrapper around fast-alpr (ONNX, CPU-only).

Own-model replacement for the Plate Recognizer cloud API (see
apps/api/src/recognize/cloud-recognize.service.ts): free per call, no token,
no monthly budget. Detector: yolo-v9-t-384-license-plate-end2end (open-image-
models). OCR: cct-xs-v2-global-model (fast-plate-ocr). Both MIT-licensed,
ONNX Runtime CPU inference — see PLAN.md's "Own ALPR model" section for the
license research behind this choice.

Response shape mirrors PlateReaderResponse in recognize.types.ts exactly, so
recognize.mapper.ts (normalizePlate/repairOcrPlate/dedup/sort) needs no
changes to consume either backend.
"""

import io
import logging
import re
from typing import Any

import numpy as np
from fast_alpr import ALPR
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alpr")

app = FastAPI(title="carplates-alpr")

alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v2-global-model",
)


def _confidence(value: float | list[float]) -> float:
    # A per-character confidence list collapses to its weakest character —
    # one bad character makes the whole plate string suspect.
    if isinstance(value, list):
        return float(min(value)) if value else 0.0
    return float(value)


# The detector letterboxes its input to 384px, so a plate that is ~2-3% of a
# wide photo's width ends up ~10px and is missed. Besides the full frame we
# also run overlapping crops of a fixed pixel size (TILE_SIZE), so a small or
# distant plate is seen at roughly native resolution however large the photo
# is. MAX_TILES caps the cost on huge frames by growing the tile instead.
TILE_SIZE = 640
TILE_OVERLAP = 0.25  # a plate up to ~25% of a tile wide survives a tile seam
MAX_TILES = 24
MIN_TILED_SIDE = 768  # smaller frames have nothing to gain from tiling
DUPLICATE_OVERLAP = 0.5  # intersection / smaller box area above this = same plate


# The detector box can be tight or cut short on angled plates (the OCR then sees
# "BC15" instead of "BC1554ZA"). Read a slightly padded crop first; if that is
# not a full 8-character plate, retry with progressively wider horizontal padding
# and keep the best full-length read.
PLATE_LENGTH = 8
PAD_VARIANTS = [(0.08, 0.15), (0.25, 0.25), (0.45, 0.3)]  # (fraction of box width, of box height)


def _compact(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def _read_plate(tile: np.ndarray, box: Any) -> tuple[str, float] | None:
    height, width = tile.shape[:2]
    bw, bh = box.x2 - box.x1, box.y2 - box.y1
    best: tuple[str, float] | None = None
    for pad_x, pad_y in PAD_VARIANTS:
        x1, x2 = max(0, int(box.x1 - bw * pad_x)), min(width, int(box.x2 + bw * pad_x))
        y1, y2 = max(0, int(box.y1 - bh * pad_y)), min(height, int(box.y2 + bh * pad_y))
        ocr = alpr.ocr.predict(tile[y1:y2, x1:x2])
        if ocr is None or not ocr.text:
            continue
        candidate = (ocr.text, _confidence(ocr.confidence))
        full = len(_compact(ocr.text)) == PLATE_LENGTH
        if full and (best is None or len(_compact(best[0])) != PLATE_LENGTH or candidate[1] > best[1]):
            best = candidate
        elif best is None:
            best = candidate
        if full and candidate[1] >= 0.9:
            break
    return best


EDGE_MARGIN = 3  # px


def _touches_inner_edge(box: Any, tile: tuple[int, int, int, int], width: int, height: int) -> bool:
    x0, y0, x1, y1 = tile
    return (
        (x0 > 0 and box.x1 <= EDGE_MARGIN)
        or (y0 > 0 and box.y1 <= EDGE_MARGIN)
        or (x1 < width and box.x2 >= x1 - x0 - EDGE_MARGIN)
        or (y1 < height and box.y2 >= y1 - y0 - EDGE_MARGIN)
    )


def _axis_starts(length: int, tile: int) -> list[int]:
    if length <= tile:
        return [0]
    step = max(1, int(tile * (1 - TILE_OVERLAP)))
    count = -(-(length - tile) // step) + 1  # ceil
    return [round(i * (length - tile) / (count - 1)) for i in range(count)]


def _tiles(width: int, height: int) -> list[tuple[int, int, int, int]]:
    tiles = [(0, 0, width, height)]
    if max(width, height) < MIN_TILED_SIDE:
        return tiles
    tile = TILE_SIZE
    while len(_axis_starts(width, tile)) * len(_axis_starts(height, tile)) > MAX_TILES:
        tile = int(tile * 1.15)
    tile_w, tile_h = min(tile, width), min(tile, height)
    for y0 in _axis_starts(height, tile_h):
        for x0 in _axis_starts(width, tile_w):
            tiles.append((x0, y0, x0 + tile_w, y0 + tile_h))
    return tiles


def _overlap(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    iw = min(a[2], b[2]) - max(a[0], b[0])
    ih = min(a[3], b[3]) - max(a[1], b[1])
    if iw <= 0 or ih <= 0:
        return 0.0
    smaller = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return (iw * ih) / smaller if smaller > 0 else 0.0


def _predict_tiled(frame: np.ndarray) -> list[dict[str, Any]]:
    height, width = frame.shape[:2]
    # (box in full-frame coords, detection confidence, plate, score)
    found: list[tuple[tuple[float, float, float, float], float, str, float]] = []

    for x0, y0, x1, y1 in _tiles(width, height):
        tile = frame[y0:y1, x0:x1]
        for detection in alpr.detector.predict(tile):
            box = detection.bounding_box
            # A box touching an inner tile edge is a plate cut by the seam — the
            # neighbouring tile (or the full frame) sees it whole.
            if _touches_inner_edge(box, (x0, y0, x1, y1), width, height):
                continue
            read = _read_plate(tile, box)
            if read is None:
                continue
            full_box = (box.x1 + x0, box.y1 + y0, box.x2 + x0, box.y2 + y0)
            found.append((full_box, float(detection.confidence), read[0], read[1]))

    # The same plate is seen by several tiles: keep a full-length read over a
    # truncated one, then the most confident detection.
    found.sort(key=lambda f: (len(_compact(f[2])) == PLATE_LENGTH, f[1]), reverse=True)
    kept: list[tuple[tuple[float, float, float, float], float, str, float]] = []
    for candidate in found:
        if all(_overlap(candidate[0], k[0]) < DUPLICATE_OVERLAP for k in kept):
            kept.append(candidate)

    def _box(b: tuple[float, float, float, float]) -> dict[str, float]:
        x1, y1 = max(0.0, b[0]), max(0.0, b[1])
        x2, y2 = min(float(width), b[2]), min(float(height), b[3])
        return {"x": x1 / width, "y": y1 / height, "w": (x2 - x1) / width, "h": (y2 - y1) / height}

    return [{"plate": plate, "score": score, "box": _box(box)} for box, _, plate, score in kept]


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)) -> dict[str, list[dict[str, Any]]]:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        # Phones store portrait shots sideways + an EXIF rotation flag; without
        # applying it the detector sees plates rotated 90°.
        pil_image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not decode image") from exc

    # fast-alpr (via OpenCV-based open-image-models) expects BGR, PIL gives RGB.
    frame = np.array(pil_image)[:, :, ::-1]

    try:
        results = _predict_tiled(np.ascontiguousarray(frame))
    except Exception:
        logger.exception("ALPR inference failed")
        raise HTTPException(status_code=502, detail="ALPR inference failed")

    return {"results": results}
