import { CATEGORY, REMOVABLE_CATEGORIES } from './types';
import type { Analysis, Category, CleanResult, ImageFormat } from './types';
import { detectFormat } from './format';
import { parseJPEG } from './jpeg';
import { parsePNG } from './png';
import { parseWebP } from './webp';
import { rebuildFromSegments, rebuildWebP } from './rewrite';

function parseForFormat(bytes: Uint8Array, format: ImageFormat) {
  if (format === 'jpeg') return parseJPEG(bytes);
  if (format === 'png') return parsePNG(bytes);
  if (format === 'webp') return parseWebP(bytes);
  throw new Error('Unsupported or unrecognized image format. This engine reads JPEG, PNG, and WebP.');
}

/**
 * Analyze: read the file once, return the segment list, format, and
 * a category → segments index.
 */
export function analyze(bytes: Uint8Array): Analysis {
  const format = detectFormat(bytes);
  const segments = parseForFormat(bytes, format);
  const found = {} as Record<Category, typeof segments>;
  for (const cat of REMOVABLE_CATEGORIES) found[cat] = [];
  for (const seg of segments) {
    if (found[seg.category]) found[seg.category].push(seg);
  }
  return { format, segments, found, byteLength: bytes.length };
}

/**
 * Clean: produce a new byte buffer with the given categories removed.
 * Original is never modified.
 */
export function clean(bytes: Uint8Array, removeCategories: Category[]): CleanResult {
  const format = detectFormat(bytes);
  const segments = parseForFormat(bytes, format);
  if (format === 'webp') {
    return { format, bytes: rebuildWebP(bytes, segments, removeCategories) };
  }
  return { format, bytes: rebuildFromSegments(bytes, segments, removeCategories) };
}

// Re-export for convenience
export { CATEGORY, REMOVABLE_CATEGORIES };
export { detectFormat };
export type { Analysis, Category, CleanResult, ImageFormat, Segment, SegmentDetail } from './types';
export type { ExifSummary } from './types';