import asyncifyMjs from 'onnxruntime-web-dev/ort-wasm-simd-threaded.asyncify.mjs?url'
import asyncifyWasm from 'onnxruntime-web-dev/ort-wasm-simd-threaded.asyncify.wasm?url'
import plainMjs from 'onnxruntime-web-dev/ort-wasm-simd-threaded.mjs?url'
import plainWasm from 'onnxruntime-web-dev/ort-wasm-simd-threaded.wasm?url'

/**
 * Self-hosted onnxruntime-web runtime for transformers.js. By default it fetches the glue + wasm from cdn.jsdelivr.net and
 * runs the glue as a `blob:` script, both blocked by the strict CSP. `onnxruntime-web-dev` is the exact build transformers
 * pins (mixing it with the app's own onnxruntime-web would break the JS <-> wasm ABI).
 */
export type OrtWasmPaths = { mjs: string; wasm: string }

/** Safari below 26 without WebGPU cannot run the asyncify build (same rule transformers.js applies to its CDN default). */
export function needsPlainBuild(userAgent: string, hasWebGpu: boolean): boolean {
  if (hasWebGpu) return false
  if (/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(userAgent)) return false
  const m = /Version\/(\d+)[.\d]*.*Safari/.exec(userAgent)
  return !!m && Number(m[1]) < 26
}

export function ortWasmPaths(userAgent: string, hasWebGpu: boolean): OrtWasmPaths {
  return needsPlainBuild(userAgent, hasWebGpu)
    ? { mjs: plainMjs, wasm: plainWasm }
    : { mjs: asyncifyMjs, wasm: asyncifyWasm }
}
