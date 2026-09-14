/* =========================================================================
   inpaint-worker.js — Web Worker for LaMa inpainting via ONNX Runtime Web.

   Protocol:
     request:  { type: 'inpaint', tiles: [ { imgData, mask, ox, oy } ], modelUrl }
     progress: { type: 'progress', done, total }
     result:   { type: 'result', tiles: [ { imgData, ox, oy } ] }
     error:    { type: 'error', message }

   PoC note:
     The worker gracefully falls back to a "nearest-tile-blend" stub if
     ONNX Runtime Web is not reachable (offline first-run, CDN blocked).
     The UI surfaces this fallback in plain language so the user is never
     misled about the quality of the inpaint.
   ========================================================================= */
'use strict';

importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/ort.min.js');

let session = null;
let usingFallback = false;

async function ensureSession(modelUrl) {
  if (session || usingFallback) return;
  try {
    // eslint-disable-next-line no-undef
    ort.env.wasm.numThreads = 1;
    session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['wasm']
    });
  } catch (e) {
    usingFallback = true;
  }
}

/**
 * LaMa expects a 4-channel 512x512 image + 1-channel 512x512 mask,
 * concatenated into a 4x512x512 float tensor. This wrapper handles
 * tile preprocess + postprocess.
 */
async function runLaMaTile(imgData, mask, sessionRef) {
  const SIZE = 512;
  // eslint-disable-next-line no-undef
  const input = new ort.Tensor('float32', new Float32Array(4 * SIZE * SIZE * 2), [1, 4, SIZE, SIZE]);
  // Pack: first 3 channels = image (0..1), 4th channel = mask (0/1)
  // then 3 more channels = zeros (LaMa expects 4-channel image + mask separately,
  // some checkpoints differ; this implementation uses the 4-channel image form).
  for (let i = 0; i < SIZE * SIZE; i++) {
    input.data[i] = imgData.data[i * 4] / 255;
    input.data[i + SIZE * SIZE] = imgData.data[i * 4 + 1] / 255;
    input.data[i + 2 * SIZE * SIZE] = imgData.data[i * 4 + 2] / 255;
    input.data[i + 3 * SIZE * SIZE] = mask[i];
  }
  const feeds = { [sessionRef.inputNames[0]]: input };
  const results = await sessionRef.run(feeds);
  const out = results[sessionRef.outputNames[0]];
  const outImg = new ImageData(SIZE, SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    outImg.data[i * 4]     = Math.max(0, Math.min(255, out.data[i] * 255));
    outImg.data[i * 4 + 1] = Math.max(0, Math.min(255, out.data[i + SIZE * SIZE] * 255));
    outImg.data[i * 4 + 2] = Math.max(0, Math.min(255, out.data[i + 2 * SIZE * SIZE] * 255));
    outImg.data[i * 4 + 3] = 255;
  }
  return outImg;
}

/**
 * Fallback inpainter. Uses a simple diffusion-style fill: averages
 * the unmasked border into the masked interior. Visibly worse than
 * LaMa — used only when the model cannot be loaded. The UI must
 * tell the user this is happening.
 */
function runFallbackTile(imgData, mask) {
  const SIZE = 512;
  const out = new ImageData(SIZE, SIZE);
  out.data.set(imgData.data);

  // Build "known" mask and iterate a few diffusion passes.
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
          out.data[i * 4]     = r / n;
          out.data[i * 4 + 1] = g / n;
          out.data[i * 4 + 2] = b / n;
        }
      }
    }
    for (let i = 0; i < SIZE * SIZE; i++) if (!known[i]) known[i] = 1;
  }
  return out;
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type !== 'inpaint') return;

  try {
    await ensureSession(msg.modelUrl);
    const total = msg.tiles.length;
    const out = [];
    for (let i = 0; i < total; i++) {
      const t = msg.tiles[i];
      let resultImg;
      if (usingFallback) {
        resultImg = runFallbackTile(t.imgData, t.mask);
      } else {
        try {
          resultImg = await runLaMaTile(t.imgData, t.mask, session);
        } catch (err) {
          usingFallback = true;
          resultImg = runFallbackTile(t.imgData, t.mask);
        }
      }
      out.push({ imgData: resultImg, ox: t.ox, oy: t.oy });
      self.postMessage({ type: 'progress', done: i + 1, total, usingFallback });
    }
    self.postMessage({ type: 'result', tiles: out, usingFallback });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};