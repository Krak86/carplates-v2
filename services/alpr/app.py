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
from types import SimpleNamespace
from typing import Any

import cv2
import numpy as np
from fast_alpr import ALPR
from fast_plate_ocr.core.process import preprocess_image
from fast_plate_ocr.inference.plate_recognizer import _load_image_from_source
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, ImageOps
from rapidocr_onnxruntime import RapidOCR

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("alpr")

app = FastAPI(title="carplates-alpr")

alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v2-global-model",
)

# General text OCR (PP-OCR models bundled in the wheel, ONNX CPU) for VIN labels / windshield
# stickers — fast-alpr's plate OCR can't emit a 17-char line. VIN extraction and validation
# live in the API (packages/shared extractVins); this only returns the text lines.
text_ocr = RapidOCR()


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
# "BC15" instead of "BC1554ZA"). Read crops at several paddings, as-is and then
# (if still unsure) upscaled 2x + sharpened (small, soft plates — e.g. a motorcycle plate ~110px wide —
# read "AL1930JA" raw but "AI1920JA" sharpened), and keep the best full-length
# read. Tight padding comes first: extra context can *hurt* on small plates.
PLATE_LENGTH = 8
PAD_VARIANTS = [(0.08, 0.15), (0.25, 0.25), (0.45, 0.3)]  # (fraction of box width, of box height)
SHARPEN_PAD_VARIANTS = [(0.0, 0.0), *PAD_VARIANTS]  # tight first: padding can hurt a small, sharpened plate
SHARPEN_SCALE = 2
SHARPEN_KERNEL = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
GOOD_ENOUGH = 0.97  # a full-length read at least this confident stops the search


def _compact(text: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", text.upper())


def _sharpened(crop: np.ndarray) -> np.ndarray:
    big = cv2.resize(crop, None, fx=SHARPEN_SCALE, fy=SHARPEN_SCALE, interpolation=cv2.INTER_CUBIC)
    return cv2.filter2D(big, -1, SHARPEN_KERNEL)


# The OCR picks the likeliest of 36 characters per slot, so it can emit a letter no UA plate uses
# (BO read as BU at 0.88 vs 0.12) or a letter where a digit belongs. A UA plate has a known shape
# and its letters come from a small set, so re-pick each slot within its class. Same shapes as
# PLATE_SHAPES in packages/shared (plate.ts). Letters = the 12 Cyrillic look-alikes plus the Latin
# ones that really occur in the registry (all 24.2M 8-char plates, 2026-10-26: Y 389k, J 303k, F 240k,
# D 133k, G 80k, Z 62k); L/U/N/S/R/V/Q are 0.5k-10.5k each (L is 0.04% of plates), so a read of one of
# those is a misread. Re-measured on the full table: the earlier 2% sample picked the same set.
PLATE_LETTERS = "ABCEHIKMOPTXYJFDGZ"
PLATE_SHAPES = ["LLDDDDLL", "LLLLDDDD", "DDLLDDDD"]
MIN_SHAPE_FIT = 6  # slots (of 8) that must already fit a shape, else the read is left as it is


def _plate_ocr(crop: np.ndarray) -> tuple[str, float] | None:
    model = alpr.ocr.ocr_model
    cfg = model.config
    # Same preprocessing as fast-alpr's DefaultOCR.predict, but keeping the per-slot probabilities.
    color = cv2.COLOR_BGR2RGB if cfg.image_color_mode == "rgb" else cv2.COLOR_BGR2GRAY
    batch = preprocess_image(_load_image_from_source(cv2.cvtColor(crop, color), cfg))
    probs = model.model.run([model.plate_output_name], {"input": batch})[0].reshape(
        cfg.max_plate_slots, len(cfg.alphabet)
    )
    alphabet = cfg.alphabet
    picked = probs.argmax(axis=1)
    text = "".join(alphabet[i] for i in picked).rstrip(cfg.pad_char)
    if not text:
        return None
    scores = [float(probs[slot, i]) for slot, i in enumerate(picked[: len(text)])]
    if len(text) == PLATE_LENGTH:
        letters = [i for i, c in enumerate(alphabet) if c in PLATE_LETTERS]
        digits = [i for i, c in enumerate(alphabet) if c.isdigit()]

        def fit(shape: str) -> int:
            return sum((c.isalpha() if kind == "L" else c.isdigit()) for c, kind in zip(text, shape))

        shape = max(PLATE_SHAPES, key=fit)  # a tie keeps the earlier (more common) shape
        if fit(shape) >= MIN_SHAPE_FIT:
            fixed = ""
            for slot, kind in enumerate(shape):
                allowed = letters if kind == "L" else digits
                best = max(allowed, key=lambda i: probs[slot, i])
                fixed += alphabet[best]
                if best != picked[slot]:
                    # An overridden character's confidence is its share among the allowed ones.
                    scores[slot] = float(probs[slot, best] / probs[slot, allowed].sum())
            text = fixed
    return text, min(scores)


def _read_plate(tile: np.ndarray, box: Any) -> tuple[tuple[str, float], list[tuple[str, float]]] | None:
    """The best read of the plate in `box`, plus every read tried (the alternatives come from those)."""
    height, width = tile.shape[:2]
    bw, bh = box.x2 - box.x1, box.y2 - box.y1
    best: tuple[str, float] | None = None
    best_full = False
    reads: list[tuple[str, float]] = []
    # Plain crops first. Sharpened ones only run when no plain read is confident:
    # on a confident plate they could only reorder a multi-row plate's characters.
    for sharpen, pads in ((False, PAD_VARIANTS), (True, SHARPEN_PAD_VARIANTS)):
        for pad_x, pad_y in pads:
            x1, x2 = max(0, int(box.x1 - bw * pad_x)), min(width, int(box.x2 + bw * pad_x))
            y1, y2 = max(0, int(box.y1 - bh * pad_y)), min(height, int(box.y2 + bh * pad_y))
            crop = tile[y1:y2, x1:x2]
            if crop.size == 0:
                continue
            candidate = _plate_ocr(_sharpened(crop) if sharpen else crop)
            if candidate is None:
                continue
            reads.append(candidate)
            full = len(_compact(candidate[0])) == PLATE_LENGTH
            if best is None or (full and not best_full) or (full == best_full and candidate[1] > best[1]):
                best, best_full = candidate, full
            if best_full and best is not None and best[1] >= GOOD_ENOUGH:
                return best, reads
    return (best, reads) if best is not None else None


# The same plate can read two ways when one glyph is ambiguous at this size (3/5 on a blurry
# plate): the readers differ by crop, and the more confident one is not always the right one. Besides
# the best read, return up to MAX_ALTERNATIVES other full-length reads that differ from it by exactly
# one character and are at least ALT_MIN_SCORE sure; they share the plate's box, so the UI can show
# them as one group. A primary at or above ALT_CONFIDENT_SCORE is sure enough that an alternative
# more than ALT_CONFIDENT_GAP behind it is only noise (AH4018AC at 0.987 beside AH4078AC at 0.943);
# a near-tie (BT1572BK 0.986 / BT1372BK 0.985) is real ambiguity and stays.
ALT_MIN_SCORE = 0.55
ALT_CONFIDENT_SCORE = 0.97
ALT_CONFIDENT_GAP = 0.03
MAX_ALTERNATIVES = 2


def _alternatives(best: str, best_score: float, reads: list[tuple[str, float]]) -> list[tuple[str, float]]:
    confident = best_score >= ALT_CONFIDENT_SCORE
    top: dict[str, float] = {}
    for text, score in reads:
        compact = _compact(text)
        differs = sum(a != b for a, b in zip(compact, best))
        if len(compact) == PLATE_LENGTH and differs == 1 and score >= ALT_MIN_SCORE:
            if confident and best_score - score > ALT_CONFIDENT_GAP:
                continue
            top[compact] = max(score, top.get(compact, 0.0))
    return sorted(top.items(), key=lambda item: item[1], reverse=True)[:MAX_ALTERNATIVES]


# Stacked car plates (4 letters over 4 digits, e.g. KA EO / 3881) have a near-square
# box, and the whole-plate OCR reads them in an unstable order. Split the box into
# two rows, read each, join top then bottom. Single-row plates are ~4-5x wider than
# tall; a row only counts if it reads exactly 4 characters. (Three-row motorcycle
# plates are not handled here: this OCR returns nothing for a lone short row, so
# they go through the whole-plate read, which keeps their order.)
STACKED_MAX_ASPECT = 2.4  # box width / height below this is a candidate for two rows
STACKED_ROW_OVERLAP = 0.06  # of box height, so a row's glyphs aren't clipped at the split
STACKED_ROW_LENGTH = 4


def _read_stacked(tile: np.ndarray, box: Any) -> tuple[str, float] | None:
    height, width = tile.shape[:2]
    bw, bh = box.x2 - box.x1, box.y2 - box.y1
    if bh <= 0 or bw / bh >= STACKED_MAX_ASPECT:
        return None
    x1, x2 = max(0, int(box.x1 - bw * 0.05)), min(width, int(box.x2 + bw * 0.05))
    mid = (box.y1 + box.y2) / 2
    overlap = bh * STACKED_ROW_OVERLAP
    rows = [(box.y1 - bh * 0.05, mid + overlap), (mid - overlap, box.y2 + bh * 0.05)]
    text, score = '', 1.0
    for top, bottom in rows:
        crop = tile[max(0, int(top)) : min(height, int(bottom)), x1:x2]
        ocr = alpr.ocr.predict(crop) if crop.size else None
        part = _compact(ocr.text) if ocr is not None and ocr.text else ''
        if len(part) != STACKED_ROW_LENGTH:
            return None
        text += part
        score = min(score, _confidence(ocr.confidence))
    return text, score


# Three-row moped plates (AB / 1918 / AB) photographed at a steep angle: the plate OCR reads one
# line, so they come out as garbage (or blank) however the crop is padded. The general text
# OCR (RapidOCR, same one as the VIN route) finds each row on its own, and survives a wide range
# of tilts, so for near-square / tall boxes read it on a few rotations of the crop and accept a
# read only if it has the moped layout (2 letters, 4 digits, 2 letters), rows joined top to
# bottom. A confident row read beats the plate OCR's; otherwise it only fills in for a weak one.
ROWS_MAX_ASPECT = 1.6  # box width / height below this is a candidate for three rows (a moped plate is ~1.3)
ROWS_ANGLES = [0, -70, 70, -50, 50, -85, 85, -30, 30]  # level first: most plates need no rotation
ROWS_TILTED_ASPECT = 1.0  # a box taller than wide may hold a steeply rotated plate: only then try the other angles
ROWS_TARGET_SIDE = 400  # px: the crop is scaled to this long side (a cost cap: a 800 px false box cost 8 s at 3x)
ROWS_MAX_SCALE = 4
ROWS_PAD = 0.1
ROWS_GOOD_ENOUGH = 0.9
ROWS_ACCEPT_BELOW = 0.9  # a normal full-length read at least this confident is kept
MOPED_PLATE = re.compile(r"^[A-Z]{2}\d{4}[A-Z]{2}$")


def _rotated(crop: np.ndarray, angle: int) -> np.ndarray:
    height, width = crop.shape[:2]
    side = int(max(height, width) * 1.1)
    matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1.0)
    matrix[0, 2] += (side - width) / 2
    matrix[1, 2] += (side - height) / 2
    return cv2.warpAffine(crop, matrix, (side, side), borderValue=(255, 255, 255))


def _read_rows(tile: np.ndarray, box: Any) -> tuple[str, float] | None:
    height, width = tile.shape[:2]
    bw, bh = box.x2 - box.x1, box.y2 - box.y1
    if bh <= 0 or bw / bh >= ROWS_MAX_ASPECT:
        return None
    crop = tile[
        max(0, int(box.y1 - bh * ROWS_PAD)) : min(height, int(box.y2 + bh * ROWS_PAD)),
        max(0, int(box.x1 - bw * ROWS_PAD)) : min(width, int(box.x2 + bw * ROWS_PAD)),
    ]
    if crop.size == 0:
        return None
    scale = min(ROWS_MAX_SCALE, ROWS_TARGET_SIDE / max(crop.shape[:2]))
    crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC if scale > 1 else cv2.INTER_AREA)
    best: tuple[str, float] | None = None
    for angle in ROWS_ANGLES if bw / bh < ROWS_TILTED_ASPECT else ROWS_ANGLES[:1]:
        lines, _ = text_ocr(_rotated(crop, angle))
        if not lines:
            continue
        # The "UA" flag strip is read as a row of its own.
        lines = [line for line in lines if _compact(line[1]) != "UA"]
        lines = sorted(lines, key=lambda line: sum(point[1] for point in line[0]))
        text = "".join(_compact(line[1]) for line in lines)
        if not MOPED_PLATE.match(text):
            continue
        score = min(float(line[2]) for line in lines)
        if best is None or score > best[1]:
            best = (text, score)
        if score >= ROWS_GOOD_ENOUGH:
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
    # (box in full-frame coords, detection confidence, plate, score, every read tried for it)
    found: list[tuple[tuple[float, float, float, float], float, str, float, list[tuple[str, float]]]] = []

    for x0, y0, x1, y1 in _tiles(width, height):
        tile = frame[y0:y1, x0:x1]
        for detection in alpr.detector.predict(tile):
            box = detection.bounding_box
            # A box touching an inner tile edge is a plate cut by the seam — the
            # neighbouring tile (or the full frame) sees it whole.
            if _touches_inner_edge(box, (x0, y0, x1, y1), width, height):
                continue
            read = _read_stacked(tile, box)
            reads = [read] if read is not None else []
            if read is None and (plate_read := _read_plate(tile, box)) is not None:
                read, reads = plate_read
            if read is None:
                continue
            full_box = (box.x1 + x0, box.y1 + y0, box.x2 + x0, box.y2 + y0)
            found.append((full_box, float(detection.confidence), read[0], read[1], reads))

    # The same plate is seen by several tiles: keep a full-length read over a
    # truncated one, then the most confident detection.
    found.sort(key=lambda f: (len(_compact(f[2])) == PLATE_LENGTH, f[1]), reverse=True)
    kept: list[tuple[tuple[float, float, float, float], float, str, float, list[tuple[str, float]]]] = []
    for candidate in found:
        if all(_overlap(candidate[0], k[0]) < DUPLICATE_OVERLAP for k in kept):
            kept.append(candidate)

    def _box(b: tuple[float, float, float, float]) -> dict[str, float]:
        x1, y1 = max(0.0, b[0]), max(0.0, b[1])
        x2, y2 = min(float(width), b[2]), min(float(height), b[3])
        return {"x": x1 / width, "y": y1 / height, "w": (x2 - x1) / width, "h": (y2 - y1) / height}

    results: list[dict[str, Any]] = []
    for box, _, plate, score, _ in kept:
        same_plate = [r for f in found if _overlap(f[0], box) >= DUPLICATE_OVERLAP for r in f[4]]
        # The row-wise text OCR is the more accurate reader for a moped layout (the plate OCR
        # misreads one glyph, e.g. AH4018AC -> AH4078AC), so a confident row read wins. It is the
        # slow reader, so it runs once per plate here, not once per tile that saw it.
        rows = _read_rows(frame, SimpleNamespace(x1=box[0], y1=box[1], x2=box[2], y2=box[3]))
        if rows is not None:
            same_plate.append(rows)
            weak = len(_compact(plate)) != PLATE_LENGTH or score < ROWS_ACCEPT_BELOW
            # Same text from both readers: keep the plate OCR's score so it doesn't drift.
            if _compact(plate) != rows[0] and (weak or rows[1] > score):
                plate, score = rows
        results.append({"plate": plate, "score": score, "box": _box(box)})
        # An alternative ranks just below its plate's own read, whatever it scored: the API sorts by
        # score and opens the top one, so an alternative must never take the primary's place.
        results.extend(
            {"plate": alt, "score": min(alt_score, score - 0.001), "box": _box(box)}
            for alt, alt_score in _alternatives(_compact(plate), score, same_plate)
        )
    return results


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


# The API already caps uploads at 4 MB; this is the same guard one hop later, with headroom.
MAX_UPLOAD_BYTES = 6 * 1024 * 1024


def _read_capped(image: UploadFile) -> bytes:
    raw = image.file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large")
    return raw


# Plain `def` (not `async def`) on purpose: the inference is CPU-bound, so FastAPI runs the handler in its
# threadpool and a slow photo no longer queues every other upload behind it on the event loop.
@app.post("/recognize")
def recognize(image: UploadFile = File(...)) -> dict[str, list[dict[str, Any]]]:
    raw = _read_capped(image)
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


# Stamped / embossed VINs (light, widely spaced characters on dark metal) often defeat the detector on the
# raw photo. When the plain pass finds nothing VIN-shaped, retry on contrast-boosted, upscaled variants.
_VIN_LIKE = re.compile(r"[A-Z0-9]{15,}")


def _vin_ish(text: str) -> bool:
    compact = re.sub(r"[^A-Z0-9]", "", text.upper())
    return len(compact) >= 12 and sum(c.isdigit() for c in compact) >= 4


def _has_vin_like(lines: list[dict[str, Any]]) -> bool:
    for line in lines:
        compact = re.sub(r"[^A-Z0-9]", "", str(line["text"]).upper())
        if _VIN_LIKE.fullmatch(compact) and sum(c.isdigit() for c in compact) >= 4:
            return True
    return False


def _squeeze(frame: np.ndarray, fx: float, enhance: bool) -> np.ndarray:
    # Widely spaced stamped characters are read as separate scraps (or not at all); narrowing the image
    # brings them close enough for the detector to see one line.
    out = cv2.resize(frame, None, fx=fx, fy=1.0, interpolation=cv2.INTER_AREA)
    if enhance:
        gray = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8)).apply(cv2.cvtColor(out, cv2.COLOR_BGR2GRAY))
        out = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    return out


def _ocr_lines(frame: np.ndarray, **kwargs: Any) -> list[dict[str, Any]]:
    # A VIN that touches the photo's edge (a tight crop) loses its first/last character when the detector's
    # box is grown past the image, so OCR a padded copy and map the boxes back onto the original frame.
    height, width = frame.shape[:2]
    pad = max(24, round(max(height, width) * 0.04))
    padded = cv2.copyMakeBorder(frame, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    # result: [[polygon, text, score], ...], or None when no text was detected. The polygon becomes an
    # axis-aligned box in fractions of the original image, so the web app can outline each line on the photo.
    result, _ = text_ocr(padded, **kwargs)
    lines: list[dict[str, Any]] = []
    for polygon, text, score in result or []:
        xs = [float(p[0]) - pad for p in polygon]
        ys = [float(p[1]) - pad for p in polygon]
        x0, y0 = max(0.0, min(xs) / width), max(0.0, min(ys) / height)
        x1, y1 = min(1.0, max(xs) / width), min(1.0, max(ys) / height)
        lines.append({"text": text, "score": float(score), "box": {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}})
    return lines


@app.post("/recognize/vin")
def recognize_vin(image: UploadFile = File(...)) -> dict[str, list[dict[str, Any]]]:
    raw = _read_capped(image)
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        pil_image = ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not decode image") from exc

    frame = np.ascontiguousarray(np.array(pil_image)[:, :, ::-1])
    try:
        lines = _ocr_lines(frame, unclip_ratio=2.5)
        if not _has_vin_like(lines):
            for fx, enhance in ((0.5, False), (0.35, False), (0.5, True), (0.35, True)):
                extra = _ocr_lines(_squeeze(frame, fx, enhance), unclip_ratio=2.5)
                logger.info("VIN OCR retry (fx=%s enhance=%s): %s", fx, enhance, [line["text"] for line in extra])
                seen = {line["text"] for line in lines}
                # Only VIN-shaped lines are taken from the retries; their other (squeezed, noisy) lines would only add junk.
                lines += [line for line in extra if line["text"] not in seen and _vin_ish(line["text"])]
                if _has_vin_like(lines):
                    break
    except Exception:
        logger.exception("VIN OCR failed")
        raise HTTPException(status_code=502, detail="VIN OCR failed")

    return {"lines": lines}
