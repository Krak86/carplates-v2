"""Run once at Docker image build time (see Dockerfile) to force fast-alpr's
model download into this layer, so the running container never needs network
access to Hugging Face Hub at request time — it's meant to be a self-contained
"always free, no external dependency" service (see PLAN.md).
"""

from fast_alpr import ALPR

ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v2-global-model",
)
print("ALPR models downloaded and cached in this image layer.")
