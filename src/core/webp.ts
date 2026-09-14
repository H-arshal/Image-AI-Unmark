import { asciiAt, readUint32LE } from './bytes';
import { CATEGORY } from './types';
import type { Segment } from './types';
import { parseExifSummary } from './exif';

function classifyWebPChunk(fourcc: string): string {
  const t = fourcc.trim().toUpperCase();
  if (t === 'EXIF') return CATEGORY.EXIF;
  if (t === 'XMP') return CATEGORY.XMP;
  if (t === 'ICCP') return CATEGORY.ICC;
  if (t === 'C2PA') return CATEGORY.C2PA;
  return CATEGORY.STRUCTURE;
}

export function parseWebP(bytes: Uint8Array): Segment[] {
  if (
    bytes.length < 12 ||
    bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46 ||
    bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50
  ) {
    throw new Error('Not a WebP file (missing RIFF/WEBP header).');
  }
  const chunks: Segment[] = [
    { marker: 'RIFF-HEADER', start: 0, end: 12, category: CATEGORY.STRUCTURE, detail: null }
  ];
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = asciiAt(bytes, offset, 4);
    const size = readUint32LE(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    const pad = size % 2 === 1 ? 1 : 0;
    const chunkEnd = dataEnd + pad;
    if (chunkEnd > bytes.length) {
      chunks.push({
        marker: fourcc,
        start: offset,
        end: bytes.length,
        category: CATEGORY.STRUCTURE,
        detail: null
      });
      break;
    }
    const category = classifyWebPChunk(fourcc);
    let detail: Segment['detail'] = null;
    if (category === CATEGORY.EXIF) {
      detail = { ...(parseExifSummary(bytes.subarray(dataStart, dataEnd)) ?? {}) };
    } else if (category !== CATEGORY.STRUCTURE) {
      detail = { bytes: size };
    }
    chunks.push({
      marker: fourcc,
      start: offset,
      end: chunkEnd,
      category: category as Segment['category'],
      detail
    });
    offset = chunkEnd;
  }
  return chunks;
}