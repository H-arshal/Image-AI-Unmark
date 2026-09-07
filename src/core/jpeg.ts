import { asciiAt, bytesStartWith } from './bytes';
import { CATEGORY } from './types';
import type { Segment } from './types';
import { parseExifSummary } from './exif';

function classifyJPEGSegment(
  marker: number,
  bytes: Uint8Array,
  payloadStart: number,
  payloadEnd: number
): { category: string; detail: Segment['detail'] } {
  if (marker === 0xe1) {
    if (bytesStartWith(bytes, payloadStart, 'Exif\0\0')) {
      return {
        category: CATEGORY.EXIF,
        detail: { ...(parseExifSummary(bytes.subarray(payloadStart + 6, payloadEnd)) ?? {}) }
      };
    }
    if (bytesStartWith(bytes, payloadStart, 'http://ns.adobe.com/xap/1.0/\0')) {
      return {
        category: CATEGORY.XMP,
        detail: {
          preview: asciiAt(bytes, payloadStart + 29, Math.min(payloadEnd - payloadStart - 29, 4000))
        }
      };
    }
    if (bytesStartWith(bytes, payloadStart, 'http://ns.adobe.com/xmp/extension/')) {
      return { category: CATEGORY.XMP, detail: { extended: true } };
    }
    return { category: CATEGORY.STRUCTURE, detail: null };
  }
  if (marker === 0xed) {
    if (bytesStartWith(bytes, payloadStart, 'Photoshop 3.0\0')) {
      return {
        category: CATEGORY.IPTC,
        detail: { bytes: payloadEnd - payloadStart }
      };
    }
    return { category: CATEGORY.STRUCTURE, detail: null };
  }
  if (marker === 0xe2) {
    if (bytesStartWith(bytes, payloadStart, 'ICC_PROFILE\0')) {
      return {
        category: CATEGORY.ICC,
        detail: { bytes: payloadEnd - payloadStart }
      };
    }
    return { category: CATEGORY.STRUCTURE, detail: null };
  }
  if (marker === 0xeb) {
    return { category: CATEGORY.C2PA, detail: { bytes: payloadEnd - payloadStart } };
  }
  if (marker === 0xfe) {
    return {
      category: CATEGORY.COMMENT,
      detail: { text: asciiAt(bytes, payloadStart, Math.min(payloadEnd - payloadStart, 500)) }
    };
  }
  return { category: CATEGORY.STRUCTURE, detail: null };
}

export function parseJPEG(bytes: Uint8Array): Segment[] {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error('Not a JPEG file (missing SOI marker).');
  }
  const segments: Segment[] = [
    { marker: 0xd8, start: 0, end: 2, category: CATEGORY.STRUCTURE, detail: null }
  ];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      segments.push({
        marker: null,
        start: offset,
        end: bytes.length,
        category: CATEGORY.STRUCTURE,
        detail: null
      });
      break;
    }
    let m = offset + 1;
    while (bytes[m] === 0xff) m++;
    const marker = bytes[m]!;
    const segStart = offset;
    if (marker === 0xd9) {
      segments.push({
        marker, start: segStart, end: m + 1, category: CATEGORY.STRUCTURE, detail: null
      });
      offset = m + 1;
      break;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      segments.push({
        marker, start: segStart, end: m + 1, category: CATEGORY.STRUCTURE, detail: null
      });
      offset = m + 1;
      continue;
    }
    if (marker === 0xda) {
      const len = ((bytes[m + 1] ?? 0) << 8) | (bytes[m + 2] ?? 0);
      let p = m + 1 + len;
      while (p < bytes.length - 1) {
        if (bytes[p] === 0xff) {
          const next = bytes[p + 1];
          if (next === 0x00 || ((next ?? 0) >= 0xd0 && (next ?? 0) <= 0xd7)) {
            p += 2;
            continue;
          }
          break;
        }
        p++;
      }
      segments.push({
        marker,
        start: segStart,
        end: p,
        category: CATEGORY.STRUCTURE,
        detail: { note: 'image pixel data' }
      });
      offset = p;
      continue;
    }
    const len = ((bytes[m + 1] ?? 0) << 8) | (bytes[m + 2] ?? 0);
    const segEnd = m + 1 + len;
    const payloadStart = m + 3;
    const classified = classifyJPEGSegment(marker, bytes, payloadStart, segEnd);
    segments.push({
      marker,
      start: segStart,
      end: segEnd,
      category: classified.category as Segment['category'],
      detail: classified.detail
    });
    offset = segEnd;
  }
  return segments;
}