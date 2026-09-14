/* =========================================================================
   clean-pipeline.js — orchestrates:
     1. Decode input file -> ImageData
     2. Inpaint masked regions (via inpaint-worker.js)
     3. Re-encode ImageData -> encoded bytes (JPEG / PNG / WebP)
     4. Strip metadata from encoded bytes (via ProvenanceCore)
     5. Return { cleanedBytes, format, usingFallback, inpaintedRegions }

   Exposed as `window.CleanPipeline`.
   ========================================================================= */
'use strict';

(function () {
  const TILE_SIZE = 512;
  const TILE_OVERLAP = 64;

  function tileImageData(imageData, mask) {
    const { width, height } = imageData;
    const tiles = [];
    for (let y = 0; y < height; y += (TILE_SIZE - TILE_OVERLAP)) {
      for (let x = 0; x < width; x += (TILE_SIZE - TILE_OVERLAP)) {
        const w = Math.min(TILE_SIZE, width - x);
        const h = Math.min(TILE_SIZE, height - y);
        if (w <= 0 || h <= 0) continue;
        const tile = new ImageData(TILE_SIZE, TILE_SIZE);
        const tileMask = new Uint8Array(TILE_SIZE * TILE_SIZE);
        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            const sIdx = ((y + yy) * width + (x + xx)) * 4;
            const dIdx = (yy * TILE_SIZE + xx) * 4;
            tile.data[dIdx]     = imageData.data[sIdx];
            tile.data[dIdx + 1] = imageData.data[sIdx + 1];
            tile.data[dIdx + 2] = imageData.data[sIdx + 2];
            tile.data[dIdx + 3] = imageData.data[sIdx + 3];
            tileMask[yy * TILE_SIZE + xx] = mask[(y + yy) * width + (x + xx)];
          }
        }
        // Skip tiles with no mask content unless requested otherwise.
        let anyMask = false;
        for (let i = 0; i < tileMask.length; i++) if (tileMask[i]) { anyMask = true; break; }
        if (anyMask) tiles.push({ imgData: tile, mask: tileMask, ox: x, oy: y });
      }
    }
    return tiles;
  }

  function hannWindow(size) {
    const w = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return w;
  }

  function assembleImageData(tiles, width, height) {
    const out = new ImageData(width, height);
    const weights = new Float32Array(width * height);
    const winX = hannWindow(TILE_SIZE);
    const winY = hannWindow(TILE_SIZE);
    for (const t of tiles) {
      const tile = t.imgData;
      for (let yy = 0; yy < TILE_SIZE; yy++) {
        const gy = t.oy + yy;
        if (gy < 0 || gy >= height) continue;
        const wy = winY[yy];
        for (let xx = 0; xx < TILE_SIZE; xx++) {
          const gx = t.ox + xx;
          if (gx < 0 || gx >= width) continue;
          const wx = winX[xx];
          const w = wy * wx;
          const dIdx = (gy * width + gx) * 4;
          const sIdx = (yy * TILE_SIZE + xx) * 4;
          out.data[dIdx]     = tile.data[sIdx]     * w + out.data[dIdx]     * weights[gy * width + gx];
          out.data[dIdx + 1] = tile.data[sIdx + 1] * w + out.data[dIdx + 1] * weights[gy * width + gx];
          out.data[dIdx + 2] = tile.data[sIdx + 2] * w + out.data[dIdx + 2] * weights[gy * width + gx];
          out.data[dIdx + 3] = 255;
          weights[gy * width + gx] += w;
        }
      }
    }
    for (let i = 0; i < width * height; i++) {
      const w = weights[i] || 1;
      out.data[i * 4]     /= w;
      out.data[i * 4 + 1] /= w;
      out.data[i * 4 + 2] /= w;
    }
    return out;
  }

  function decodeToImageData(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxSide = 2048;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve({ imageData: data, mime: file.type, naturalWidth: img.width, naturalHeight: img.height });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image.')); };
      img.src = url;
    });
  }

  function encodeImageData(imageData, mime, quality) {
    const c = document.createElement('canvas');
    c.width = imageData.width;
    c.height = imageData.height;
    const ctx = c.getContext('2d');
    ctx.putImageData(imageData, 0, 0);
    return new Promise((resolve) => {
      c.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, mime, quality);
    });
  }

  /**
   * Run the full pipeline.
   * @param {Object} opts
   * @param {File} opts.file
   * @param {Uint8Array} opts.originalBytes
   * @param {Uint8Array} opts.mask (width*height)
   * @param {string[]} opts.removeCategories
   * @param {string} opts.modelUrl
   * @param {Function} opts.onProgress (done, total, stage)
   */
  async function run(opts) {
    const { file, originalBytes, mask, removeCategories, modelUrl, onProgress } = opts;

    onProgress(0, 1, 'decoding');
    const { imageData, mime } = await decodeToImageData(file);
    onProgress(1, 1, 'tiling');

    // Replace masked pixels with neutral gray so the worker sees the mask.
    const prepped = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    for (let i = 0; i < mask.length; i++) {
      if (mask[i]) {
        const d = i * 4;
        prepped.data[d] = 128;
        prepped.data[d + 1] = 128;
        prepped.data[d + 2] = 128;
      }
    }

    const tiles = tileImageData(prepped, mask);
    if (tiles.length === 0) {
      // Nothing to inpaint — just re-encode and strip metadata.
      const encoded = await encodeImageData(prepped, mime, 0.92);
      const { bytes: cleaned } = ProvenanceCore.clean(encoded, removeCategories);
      onProgress(1, 1, 'done');
      return { cleanedBytes: cleaned, format: ProvenanceCore.detectFormat(encoded), usingFallback: false, inpaintedRegions: [] };
    }

    onProgress(0, tiles.length, 'inpainting');

    const worker = new Worker('inpaint-worker.js');
    const result = await new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'progress') {
          if (typeof msg.usingFallback === 'boolean' && typeof opts.onFallback === 'function') {
            opts.onFallback(msg.usingFallback);
          }
          onProgress(msg.done, msg.total, 'inpainting');
        }
        else if (msg.type === 'result') { resolve(msg); worker.terminate(); }
        else if (msg.type === 'error') { reject(new Error(msg.message)); worker.terminate(); }
      };
      worker.onerror = (err) => { reject(err); worker.terminate(); };
      worker.postMessage({ type: 'inpaint', tiles, modelUrl });
    });

    onProgress(1, 1, 'assembling');
    const assembled = assembleImageData(result.tiles, imageData.width, imageData.height);
    onProgress(1, 1, 'encoding');
    const encoded = await encodeImageData(assembled, mime, 0.92);
    onProgress(1, 1, 'stripping metadata');
    const { bytes: cleaned } = ProvenanceCore.clean(encoded, removeCategories);
    onProgress(1, 1, 'done');

    // Collect inpainted region bounds for verification panel.
    const regions = [];
    for (const t of result.tiles) {
      let x0 = imageData.width, y0 = imageData.height, x1 = -1, y1 = -1;
      for (let yy = 0; yy < TILE_SIZE; yy++) {
        for (let xx = 0; xx < TILE_SIZE; xx++) {
          const gx = t.ox + xx, gy = t.oy + yy;
          if (gx >= imageData.width || gy >= imageData.height) continue;
          // Mark tile presence as "inpainted region" — coarse but honest.
          if (gx < x0) x0 = gx;
          if (gy < y0) y0 = gy;
          if (gx > x1) x1 = gx;
          if (gy > y1) y1 = gy;
        }
      }
      if (x1 >= 0) regions.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }

    return { cleanedBytes: cleaned, format: ProvenanceCore.detectFormat(encoded), usingFallback: result.usingFallback, inpaintedRegions: regions };
  }

  const api = { run };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CleanPipeline = api;
})();