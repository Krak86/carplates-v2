# Self-hosted ALPR (own model, no token, no per-lookup billing) — see PLAN.md's
# "Own ALPR model" section. CPU-only ONNX Runtime, sized for the Phase 4 VPS
# (no GPU there — see PLAN.md's VPS sizing table).
FROM python:3.12-slim

WORKDIR /app

# libgl1/libglib2.0-0: OpenCV (pulled in by open-image-models) needs these at
# import time on a slim base image, even for headless CPU inference.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py warmup.py ./

# Bakes the ONNX model weights into this image layer at build time, so the
# container has no runtime network dependency once built.
RUN python warmup.py

EXPOSE 8088
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8088"]
