import type { Category, Segment } from './types';

/**
 * Concatenate the surviving segments into a new Uint8Array.
 * Used for JPEG and PNG. WebP needs an extra RIFF header fix — see
 * `rebuildWebP`.
 */
export function rebuildFromSegments(
  bytes: Uint8Array,
  segments: Segment[],
  removeCategories: Category[]
): Uint8Array {
  const removeSet = new Set(removeCategories);
  const parts: Uint8Array[] = [];
  for (const seg of segments) {
    if (removeSet.has(seg.category)) continue;
    parts.push(bytes.subarray(seg.start, seg.end));
  }
  let total = 0;
  for (const p of parts) total += p.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * WebP rebuild: same as `rebuildFromSegments` but also rewrites the
 * RIFF size header (4-byte little-endian uint32 at offset 4) to
 * reflect the new total length minus 8.
 */
export function rebuildWebP(
  bytes: Uint8Array,
  chunks: Segment[],
  removeCategories: Category[]
): Uint8Array {
  const rebuilt = rebuildFromSegments(bytes, chunks, removeCategories);
  const view = new DataView(rebuilt.buffer, rebuilt.byteOffset, rebuilt.byteLength);
  view.setUint32(4, rebuilt.length - 8, true);
  return rebuilt;
}