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

# Untrusted images are parsed here: run unprivileged (compose also sets read_only + cap_drop). The model weights
# baked in above stay readable; HOME/tmp are the only writable places (compose mounts a tmpfs on /tmp).
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin alpr
USER 10001
ENV HOME=/tmp

EXPOSE 8088
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8088/healthz')"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8088"]
