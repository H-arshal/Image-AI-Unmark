/**
 * Core types for the Provenance Lab / Image AI-Unmark metadata engine.
 *
 * The engine is byte-level only. It never decodes pixels, never touches
 * ImageData, never produces a Canvas. This is a hard architectural
 * constraint — see docs/AI_Provenance_Inspector_Cleaner_PRD.md §20.
 */

export const CATEGORY = {
  EXIF: 'EXIF',
  XMP: 'XMP',
  IPTC: 'IPTC',
  ICC: 'ICC',
  C2PA: 'C2PA',
  COMMENT: 'COMMENT',
  TEXT: 'TEXT',
  STRUCTURE: 'STRUCTURE'
} as const;

export type Category = (typeof CATEGORY)[keyof typeof CATEGORY];

export const REMOVABLE_CATEGORIES: Category[] = [
  CATEGORY.EXIF,
  CATEGORY.XMP,
  CATEGORY.IPTC,
  CATEGORY.ICC,
  CATEGORY.C2PA,
  CATEGORY.COMMENT,
  CATEGORY.TEXT
];

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'unknown';

export interface ExifSummary {
  fieldCount: number;
  hasGPS: boolean;
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
}

export interface SegmentDetail {
  // EXIF
  make?: string;
  model?: string;
  software?: string;
  dateTime?: string;
  orientation?: number;
  hasGPS?: boolean;
  fieldCount?: number;
  // XMP
  preview?: string;
  extended?: boolean;
  keyword?: string;
  // Generic
  bytes?: number;
  text?: string;
  note?: string;
}

export interface Segment {
  /** JPEG marker byte, or PNG chunk four-CC, or WebP chunk four-CC. */
  marker: number | string | null;
  /** Byte offsets (inclusive start, exclusive end). */
  start: number;
  end: number;
  category: Category;
  detail: SegmentDetail | null;
}

export interface Analysis {
  format: ImageFormat;
  segments: Segment[];
  /** Map of category -> segments of that category. */
  found: Record<Category, Segment[]>;
  byteLength: number;
}

export interface CleanResult {
  format: ImageFormat;
  bytes: Uint8Array;
}