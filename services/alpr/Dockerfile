# Self-hosted ALPR (own model, no token, no per-lookup billing) — see PLAN.md's
# "Own ALPR model" section. CPU-only ONNX Runtime, sized for the Phase 4 VPS
# (no GPU there — see PLAN.md's VPS sizing table).
FROM python:3.12-slim@sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b

WORKDIR /app

# libgl1/libglib2.0-0: OpenCV (pulled in by open-image-models) needs these at
# import time on a slim base image, even for headless CPU inference.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# requirements.txt is hash-pinned (pip-compile --generate-hashes from requirements.in); regenerate, never hand-edit.
RUN pip install --no-cache-dir --require-hashes -r requirements.txt

# models/: YuNet face detector (MIT, ~230 KB) is committed rather than downloaded, so the build needs no network
# beyond pip and the weights are pinned to the exact file the eval ran against.
COPY app.py anonymize.py warmup.py ./
COPY models ./models

# Bakes the ONNX model weights into this image layer at build time, so the
# container has no runtime network dependency once built.
# HOME is the models' cache root (~/.cache): it must be the same path at build and run time and readable by the
# unprivileged user. Building as root under /root and running with HOME=/tmp (a tmpfs) made the service re-download
# the weights at startup, fail on the internal alpr_net ("Temporary failure in name resolution") and restart-loop.
ENV HOME=/opt/alpr-home
RUN mkdir -p "$HOME" && python warmup.py && chmod -R a+rX "$HOME"

# Untrusted images are parsed here: run unprivileged (compose also sets read_only + cap_drop). The model weights
# baked in above stay readable (HOME, read-only); /tmp is the only writable place (compose mounts a tmpfs on it).
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin alpr
USER 10001

EXPOSE 8088
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8088/healthz')"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8088"]
