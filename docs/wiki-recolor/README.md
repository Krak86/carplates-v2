# Wiki recolour prototype (research, 2026-11-06)

Throwaway Node scripts behind `docs/wiki-recolor-plan.md`. Saved as `.txt` so lint and Prettier skip them; copy to `.mjs` to run.
They are reference for the TypeScript port in `scripts/src/wiki-paint-core.ts`, not code to ship.

- `prototype-segmentation.mjs.txt` - SegFormer ADE20K `car` mask, largest component, Lab paint clustering, gates (wrap, dark neutral, area), recolour of all 11 colours, "close colour" skip. Run:
  `node prototype-segmentation.mjs <dir with scripts/package.json> <outDir> <list.json>` where `list.json` is `[{ "name", "url", "target"? }]`. Writes `outDir/g/<name>__<colour>.jpg` and `v4-results.json`.
  Module base must be `scripts/` (it has `sharp` and `@huggingface/transformers`). Reads `Xenova/segformer-b0-finetuned-ade-512-512` (downloaded and cached under `outDir/hf-cache`).
- `prototype-candidates.mjs.txt` - Commons search for candidate photos per model (title filters, width at least 1000).
- `prototype-gallery.mjs.txt` - builds `gallery.html` from `v4-results.json` (every colour per photo, kept originals outlined green).

Machine notes: no Python here; the CARLA ONNX export was done in a throwaway `python:3.12-slim` Docker container (not needed any more, that model was rejected).
sharp returns extra channels for 1-channel raw input after `blur` / `resize`: always read `info.channels` and stride by it (this caused a striped-mask bug).
