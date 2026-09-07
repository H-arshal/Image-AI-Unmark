/**
 * pipeline.ts — orchestrates:
 *   1. Decode input file -> ImageData
 *   2. Inpaint masked regions (via inpaint.worker.ts)
 *   3. Re-encode ImageData -> encoded bytes (JPEG / PNG / WebP)
 *   4. Strip metadata from encoded bytes (via core engine)
 *   5. Return cleaned bytes + verification metadata
 */

import { detectFormat, clean } from '../core';
import type { Category, ImageFormat } from '../core';

export type Stage = 'decoding' | 'tiling' | 'inpainting' | 'assembling' | 'encoding' | 'stripping metadata' | 'done';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PipelineResult {
  cleanedBytes: Uint8Array;
  format: ImageFormat;
  usingFallback: boolean;
  inpaintedRegions: Region[];
}

const TILE_SIZE = 512;
const TILE_OVERLAP = 64;

interface Tile {
  imgData: ImageData;
  mask: Uint8Array;
  ox: number;
  oy: number;
}

function tileImageData(imageData: ImageData, mask: Uint8Array): Tile[] {
  const { width, height } = imageData;
  const tiles: Tile[] = [];
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
          tile.data[dIdx] = imageData.data[sIdx];
          tile.data[dIdx + 1] = imageData.data[sIdx + 1];
          tile.data[dIdx + 2] = imageData.data[sIdx + 2];
          tile.data[dIdx + 3] = imageData.data[sIdx + 3];
          tileMask[yy * TILE_SIZE + xx] = mask[(y + yy) * width + (x + xx)];
        }
      }
      let anyMask = false;
      for (let i = 0; i < tileMask.length; i++) if (tileMask[i]) { anyMask = true; break; }
      if (anyMask) tiles.push({ imgData: tile, mask: tileMask, ox: x, oy: y });
    }
  }
  return tiles;
}

function hannWindow(size: number): Float32Array {
  const w = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

function assembleImageData(tiles: Tile[], imgWidth: number, imgHeight: number): ImageData {
  const out = new ImageData(imgWidth, imgHeight);
  const weights = new Float32Array(imgWidth * imgHeight);
  const winX = hannWindow(TILE_SIZE);
  const winY = hannWindow(TILE_SIZE);
  for (const t of tiles) {
    const tile = t.imgData;
    for (let yy = 0; yy < TILE_SIZE; yy++) {
      const gy = t.oy + yy;
      if (gy < 0 || gy >= imgHeight) continue;
      const wy = winY[yy];
      for (let xx = 0; xx < TILE_SIZE; xx++) {
        const gx = t.ox + xx;
        if (gx < 0 || gx >= imgWidth) continue;
        const wx = winX[xx];
        const w = wy * wx;
        const dIdx = (gy * imgWidth + gx) * 4;
        const sIdx = (yy * TILE_SIZE + xx) * 4;
        const widx = gy * imgWidth + gx;
        out.data[dIdx]     = tile.data[sIdx]     * w + out.data[dIdx]     * weights[widx];
        out.data[dIdx + 1] = tile.data[sIdx + 1] * w + out.data[dIdx + 1] * weights[widx];
        out.data[dIdx + 2] = tile.data[sIdx + 2] * w + out.data[dIdx + 2] * weights[widx];
        weights[widx] += w;
      }
    }
  }
  for (let i = 0; i < imgWidth * imgHeight; i++) {
    const w = weights[i] || 1;
    out.data[i * 4]     /= w;
    out.data[i * 4 + 1] /= w;
    out.data[i * 4 + 2] /= w;
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

async function decodeToImageData(file: File): Promise<{ imageData: ImageData; mime: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not decode image.'));
      i.src = url;
    });
    const maxSide = 2048;
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    return { imageData: ctx.getImageData(0, 0, w, h), mime: file.type };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function encodeImageData(imageData: ImageData, mime: string, quality = 0.92): Promise<Uint8Array | null> {
  const c = document.createElement('canvas');
  c.width = imageData.width;
  c.height = imageData.height;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return new Promise(resolve => {
    c.toBlob(blob => {
      if (!blob) { resolve(null); return; }
      blob.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
    }, mime, quality);
  });
}

export interface RunOptions {
  file: File;
  mask: Uint8Array;
  removeCategories: Category[];
  modelUrl: string;
  onProgress: (done: number, total: number, stage: Stage) => void;
  onFallback: (usingFallback: boolean) => void;
}

export async function run(opts: RunOptions): Promise<PipelineResult> {
  const { file, mask, removeCategories, modelUrl, onProgress, onFallback } = opts;

  onProgress(0, 1, 'decoding');
  const { imageData, mime } = await decodeToImageData(file);
  onProgress(1, 1, 'tiling');

  // Prepare a copy with masked pixels neutralized for the worker.
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
    const encoded = await encodeImageData(prepped, mime, 0.92);
    if (!encoded) throw new Error('Could not encode output image.');
    const { bytes: cleaned } = clean(encoded, removeCategories);
    onProgress(1, 1, 'done');
    return {
      cleanedBytes: cleaned,
      format: detectFormat(encoded),
      usingFallback: false,
      inpaintedRegions: []
    };
  }

  onProgress(0, tiles.length, 'inpainting');
  const InpaintWorker = (await import('./inpaint.worker.ts?worker')).default;
  const worker = new InpaintWorker();
  const result = await new Promise<{ tiles: Tile[]; usingFallback: boolean }>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === 'progress') {
        onFallback(msg.usingFallback);
        onProgress(msg.done, msg.total, 'inpainting');
      } else if (msg.type === 'result') {
        resolve({ tiles: msg.tiles, usingFallback: msg.usingFallback });
      } else if (msg.type === 'error') {
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (err: ErrorEvent) => { reject(new Error(err.message)); };
    worker.postMessage({ type: 'inpaint', tiles, modelUrl });
  });
  worker.terminate();

  onProgress(1, 1, 'assembling');
  const assembled = assembleImageData(result.tiles, imageData.width, imageData.height);
  onProgress(1, 1, 'encoding');
  const encoded = await encodeImageData(assembled, mime, 0.92);
  if (!encoded) throw new Error('Could not encode output image.');
  onProgress(1, 1, 'stripping metadata');
  const { bytes: cleaned } = clean(encoded, removeCategories);
  onProgress(1, 1, 'done');

  // Region bounds for the verification zoom panel.
  const regions: Region[] = [];
  for (const t of result.tiles) {
    regions.push({ x: t.ox, y: t.oy, w: TILE_SIZE, h: TILE_SIZE });
  }

  return {
    cleanedBytes: cleaned,
    format: detectFormat(encoded),
    usingFallback: result.usingFallback,
    inpaintedRegions: regions
  };
}