/// <reference lib="webworker" />
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * inpaint.worker.ts — Web Worker for LaMa inpainting via ONNX Runtime Web.
 *
 * Protocol with main thread:
 *   request:  { type: 'inpaint', tiles, modelUrl }
 *   progress: { type: 'progress', done, total, usingFallback }
 *   result:   { type: 'result', tiles, usingFallback }
 *   error:    { type: 'error', message }
 *
 * Falls back to an in-process diffusion-style fill if ONNX Runtime
 * cannot be loaded (offline / CDN blocked). The main thread surfaces
 * this fallback in plain language so the user is never misled.
 */

// Lazy import — the worker runtime may not expose a usable `importScripts`
// in all environments, so we wrap it in try/catch and fall back gracefully.
let ort: any = null;
try {
  // @ts-ignore — `importScripts` is provided by the Web Worker global scope.
  importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js');
  // @ts-ignore
  ort = (self as any).ort;
} catch {
  ort = null;
}

interface Tile {
  imgData: ImageData;
  mask: Uint8Array;
  ox: number;
  oy: number;
}

let session: any = null;
let usingFallback = false;

async function ensureSession(modelUrl: string): Promise<void> {
  if (session || usingFallback || !ort) return;
  try {
    ort.env.wasm.numThreads = 1;
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm']
    });
  } catch {
    usingFallback = true;
  }
}

async function runLaMaTile(imgData: ImageData, mask: Uint8Array, sessionRef: any): Promise<ImageData> {
  const SIZE = 512;
  const input = new ort.Tensor('float32', new Float32Array(4 * SIZE * SIZE * 2), [1, 4, SIZE, SIZE]);
  for (let i = 0; i < SIZE * SIZE; i++) {
    input.data[i] = imgData.data[i * 4] / 255;
    input.data[i + SIZE * SIZE] = imgData.data[i * 4 + 1] / 255;
    input.data[i + 2 * SIZE * SIZE] = imgData.data[i * 4 + 2] / 255;
    input.data[i + 3 * SIZE * SIZE] = mask[i];
  }
  const feeds: Record<string, any> = { [sessionRef.inputNames[0]]: input };
  const results = await sessionRef.run(feeds);
  const out = results[sessionRef.outputNames[0]];
  const outImg = new ImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    outImg.data[i * 4] = Math.max(0, Math.min(255, out.data[i] * 255));
    outImg.data[i * 4 + 1] = Math.max(0, Math.min(255, out.data[i + SIZE * SIZE] * 255));
    outImg.data[i * 4 + 2] = Math.max(0, Math.min(255, out.data[i + 2 * SIZE * SIZE] * 255));
    outImg.data[i * 4 + 3] = 255;
  }
  return outImg;
}

function runFallbackTile(imgData: ImageData, mask: Uint8Array): ImageData {
  const SIZE = 512;
  const out = new ImageData(SIZE, SIZE);
  out.data.set(imgData.data);
  const known = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) known[i] = mask[i] ? 0 : 1;

  const channels = 3;
  const tmp = new Float32Array(SIZE * SIZE * channels);
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < SIZE * SIZE; i++) tmp[i * channels] = out.data[i * 4];
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        const i = y * SIZE + x;
        if (known[i]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const dy of [-1, 0, 1]) {
          for (const dx of [-1, 0, 1]) {
            const j = (y + dy) * SIZE + (x + dx);
            if (!known[j]) continue;
            r += tmp[j * channels];
            g += tmp[(j * channels) + 1];
            b += tmp[(j * channels) + 2];
            n++;
          }
        }
        if (n > 0) {
          out.data[i * 4] = r / n;
          out.data[i * 4 + 1] = g / n;
          out.data[i * 4 + 2] = b / n;
        }
      }
    }
    for (let i = 0; i < SIZE * SIZE; i++) if (!known[i]) known[i] = 1;
  }
  return out;
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type !== 'inpaint') return;
  try {
    await ensureSession(msg.modelUrl);
    const total = msg.tiles.length;
    const out: Tile[] = [];
    for (let i = 0; i < total; i++) {
      const t = msg.tiles[i];
      let resultImg: ImageData;
      if (usingFallback || !ort) {
        resultImg = runFallbackTile(t.imgData, t.mask);
      } else {
        try {
          resultImg = await runLaMaTile(t.imgData, t.mask, session);
        } catch {
          usingFallback = true;
          resultImg = runFallbackTile(t.imgData, t.mask);
        }
      }
      out.push({ imgData: resultImg, mask: t.mask, ox: t.ox, oy: t.oy });
      (self as any).postMessage({ type: 'progress', done: i + 1, total, usingFallback: usingFallback || !ort });
    }
    (self as any).postMessage({ type: 'result', tiles: out, usingFallback: usingFallback || !ort });
  } catch (err) {
    (self as any).postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
};