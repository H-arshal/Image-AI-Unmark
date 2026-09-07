/**
 * detector.ts — auto-detect candidate "AI generated" badge regions
 * in an ImageData buffer, plus brush-mask helpers.
 *
 * Heuristic: text-like regions in the four corners + a center-bottom
 * band, scored by edge density and aspect ratio. Treat output as
 * proposals the user confirms, not as truth.
 */

export interface RegionBox {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  score: number;
}

export interface BrushStroke {
  x: number;
  y: number;
  radius: number;
  erase: boolean;
}

export function detectBoxes(imageData: ImageData): RegionBox[] {
  const { width, height, data } = imageData;
  const step = 2;
  const wSmall = Math.ceil(width / step);
  const hSmall = Math.ceil(height / step);
  const gray = new Float32Array(wSmall * hSmall);
  const edges = new Float32Array(wSmall * hSmall);

  // Grayscale + edge magnitude (Sobel, downsampled by step)
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const gi = (y / step) * wSmall + (x / step);
      gray[gi] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
  }
  for (let y = 1; y < hSmall - 1; y++) {
    for (let x = 1; x < wSmall - 1; x++) {
      const i = y * wSmall + x;
      const gx =
        -gray[i - wSmall - 1] - 2 * gray[i - 1] - gray[i + wSmall - 1] +
        gray[i - wSmall + 1] + 2 * gray[i + 1] + gray[i + wSmall + 1];
      const gy =
        -gray[i - wSmall - 1] - 2 * gray[i - wSmall] - gray[i - wSmall + 1] +
        gray[i + wSmall - 1] + 2 * gray[i + wSmall] + gray[i + wSmall + 1];
      edges[i] = Math.min(255, Math.abs(gx) + Math.abs(gy));
    }
  }

  // Region proposals in fixed corner positions + center-bottom band.
  const bandH = Math.max(40, Math.round(height * 0.10));
  const bandW = Math.max(120, Math.round(width * 0.30));
  const pad = 16;
  const regions: Array<{ name: string; x: number; y: number; w: number; h: number }> = [
    { name: 'top-left', x: pad, y: pad, w: bandW, h: bandH },
    { name: 'top-right', x: width - bandW - pad, y: pad, w: bandW, h: bandH },
    { name: 'bottom-left', x: pad, y: height - bandH - pad, w: bandW, h: bandH },
    { name: 'bottom-right', x: width - bandW - pad, y: height - bandH - pad, w: bandW, h: bandH },
    { name: 'center-bottom', x: Math.round(width / 2 - bandW), y: height - bandH - pad, w: bandW, h: bandH }
  ];

  const candidates: RegionBox[] = [];
  for (const r of regions) {
    const x0 = Math.max(0, Math.floor(r.x / step));
    const y0 = Math.max(0, Math.floor(r.y / step));
    const x1 = Math.min(wSmall, Math.ceil((r.x + r.w) / step));
    const y1 = Math.min(hSmall, Math.ceil((r.y + r.h) / step));
    let sum = 0, count = 0, strong = 0;
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const v = edges[yy * wSmall + xx];
        sum += v;
        count++;
        if (v > 60) strong++;
      }
    }
    const mean = count ? sum / count : 0;
    const strongRatio = count ? strong / count : 0;
    let score = 0;
    if (mean > 8 && mean < 80 && strongRatio > 0.02 && strongRatio < 0.4) {
      score = strongRatio * 100;
    }
    if (score > 0.5) {
      candidates.push({ x: r.x, y: r.y, w: r.w, h: r.h, name: r.name, score: Math.round(score * 100) / 100 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 6);
}

export function buildMask(
  width: number,
  height: number,
  boxes: RegionBox[],
  brushStrokes: BrushStroke[]
): Uint8Array {
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