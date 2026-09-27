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

import numpy as np
from fast_alpr import ALPR
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

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


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/recognize")
async def recognize(image: UploadFile = File(...)) -> dict[str, list[dict[str, float | str]]]:
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")

    try:
        pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Could not decode image") from exc

    # fast-alpr (via OpenCV-based open-image-models) expects BGR, PIL gives RGB.
    frame = np.array(pil_image)[:, :, ::-1]

    try:
        results = alpr.predict(frame)
    except Exception:
        logger.exception("ALPR inference failed")
        raise HTTPException(status_code=502, detail="ALPR inference failed")

    return {
        "results": [
            {"plate": r.ocr.text, "score": _confidence(r.ocr.confidence)}
            for r in results
            if r.ocr is not None and r.ocr.text
        ]
    }
