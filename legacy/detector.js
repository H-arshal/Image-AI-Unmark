/* =========================================================================
   detector.js — auto-detect visible "AI generated" badge regions
   and manage a brush mask for user refinement.

   Heuristic: text-like regions in the four corners + a center-bottom
   band, scored by edge density and aspect ratio.

   Exposed as `window.Detector`.
   ========================================================================= */
'use strict';

(function () {
  /**
   * Auto-detect candidate badge regions in an ImageData buffer.
   * Returns an array of `{ x, y, w, h, score }` boxes, sorted by score
   * descending.
   *
   * The algorithm is intentionally simple so it runs synchronously on
   * the main thread and produces no false positives on common
   * non-badge image content. For real-world use, treat its output
   * as proposals the user confirms or rejects — not as truth.
   */
  function detectBoxes(imageData) {
    const { width, height, data } = imageData;
    const gray = new Float32Array(width * height);

    // 1. Grayscale + edge map (Sobel magnitude, downsampled by 2 for speed).
    const step = 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        gray[(y / step) * Math.ceil(width / step) + (x / step)] =
          (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      }
    }
    const wSmall = Math.ceil(width / step);
    const hSmall = Math.ceil(height / step);
    const edges = new Float32Array(wSmall * hSmall);
    for (let y = 1; y < hSmall - 1; y++) {
      for (let x = 1; x < wSmall - 1; x++) {
        const i = y * wSmall + x;
        const gx = -gray[i - wSmall - 1] - 2 * gray[i - 1] - gray[i + wSmall - 1]
                  + gray[i - wSmall + 1] + 2 * gray[i + 1] + gray[i + wSmall + 1];
        const gy = -gray[i - wSmall - 1] - 2 * gray[i - wSmall] - gray[i - wSmall + 1]
                  + gray[i + wSmall - 1] + 2 * gray[i + wSmall] + gray[i + wSmall + 1];
        edges[i] = Math.min(255, Math.abs(gx) + Math.abs(gy));
      }
    }

    // 2. Region proposals: fixed candidate windows in corner bands.
    //    Each is reported in original-image coordinates.
    const candidates = [];
    const bandH = Math.max(40, Math.round(height * 0.10));
    const bandW = Math.max(120, Math.round(width * 0.30));
    const pad = 16;
    const regions = [
      // four corners (likely badge positions)
      { name: 'top-left',     x: pad,                y: pad,                w: bandW, h: bandH },
      { name: 'top-right',    x: width - bandW - pad, y: pad,               w: bandW, h: bandH },
      { name: 'bottom-left',  x: pad,                y: height - bandH - pad, w: bandW, h: bandH },
      { name: 'bottom-right', x: width - bandW - pad, y: height - bandH - pad, w: bandW, h: bandH },
      // center-bottom band (common on stock-photo style overlays)
      { name: 'center-bottom', x: Math.round(width / 2 - bandW), y: height - bandH - pad, w: bandW, h: bandH }
    ];

    // 3. Score each candidate by mean edge density inside its window.
    for (const r of regions) {
      const x0 = Math.max(0, Math.floor(r.x / step));
      const y0 = Math.max(0, Math.floor(r.y / step));
      const x1 = Math.min(wSmall, Math.ceil((r.x + r.w) / step));
      const y1 = Math.min(hSmall, Math.ceil((r.y + r.h) / step));
      let sum = 0, count = 0, strong = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const v = edges[yy * wSmall + xx];
          sum += v; count++;
          if (v > 60) strong++;
        }
      }
      const mean = count ? sum / count : 0;
      const strongRatio = count ? strong / count : 0;
      // Penalize uniform regions (low mean = no edges) and very noisy
      // regions (high mean everywhere = texture, not text).
      let score = 0;
      if (mean > 8 && mean < 80 && strongRatio > 0.02 && strongRatio < 0.4) {
        score = strongRatio * 100;
      }
      if (score > 0.5) {
        candidates.push({
          x: r.x, y: r.y, w: r.w, h: r.h,
          name: r.name,
          score: Math.round(score * 100) / 100
        });
      }
    }

    // 4. Sort by score desc, return top 6.
    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 6);
  }

  /**
   * Combine detected boxes + brush strokes into a single binary mask.
   * Returns a Uint8Array of length width*height (1 = inpaint).
   */
  function buildMask(width, height, boxes, brushStrokes) {
    const mask = new Uint8Array(width * height);
    for (const b of boxes) {
      const x0 = Math.max(0, b.x);
      const y0 = Math.max(0, b.y);
      const x1 = Math.min(width, b.x + b.w);
      const y1 = Math.min(height, b.y + b.h);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) mask[y * width + x] = 1;
      }
    }
    for (const s of brushStrokes) {
      const r = s.radius;
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          const px = s.x + x, py = s.y + y;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const idx = py * width + px;
          if (s.erase) mask[idx] = 0;
          else mask[idx] = 1;
        }
      }
    }
    return mask;
  }

  /**
   * Tight bounding box of the mask (or null if empty).
   */
  function maskBounds(mask, width, height) {
    let x0 = width, y0 = height, x1 = -1, y1 = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x]) {
          if (x < x0) x0 = x;
          if (y < y0) y0 = y;
          if (x > x1) x1 = x;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /**
   * Apply a mask to ImageData: zero out (replace with neutral gray)
   * all inpaint pixels in-place. This is the input to the inpainter.
   */
  function applyMaskInPlace(imageData, mask) {
    const { width, height, data } = imageData;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x]) {
          const i = (y * width + x) * 4;
          data[i] = 128; data[i + 1] = 128; data[i + 2] = 128;
        }
      }
    }
  }

  const api = { detectBoxes, buildMask, maskBounds, applyMaskInPlace };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.Detector = api;
})();