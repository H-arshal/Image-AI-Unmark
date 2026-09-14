import {
  asciiAt,
  readNullTerminatedAscii,
  readUint32BE
} from './bytes';
import { CATEGORY } from './types';
import type { Segment } from './types';
import { parseExifSummary } from './exif';

function classifyPNGChunk(
  type: string,
  bytes: Uint8Array,
  dataStart: number,
  dataEnd: number
): { category: string; detail: Segment['detail'] } {
  if (type === 'eXIf') {
    return {
      category: CATEGORY.EXIF,
      detail: { ...(parseExifSummary(bytes.subarray(dataStart, dataEnd)) ?? {}) }
    };
  }
  if (type === 'iCCP') {
    return { category: CATEGORY.ICC, detail: { bytes: dataEnd - dataStart } };
  }
  if (type === 'caBX') {
    return { category: CATEGORY.C2PA, detail: { bytes: dataEnd - dataStart } };
  }
  if (type === 'iTXt') {
    const kw = readNullTerminatedAscii(bytes, dataStart, dataEnd);
    if (/xmp/i.test(kw)) return { category: CATEGORY.XMP, detail: { keyword: kw } };
    return { category: CATEGORY.TEXT, detail: { keyword: kw } };
  }
  if (type === 'tEXt' || type === 'zTXt') {
    const kw = readNullTerminatedAscii(bytes, dataStart, dataEnd);
    if (/iptc/i.test(kw)) return { category: CATEGORY.IPTC, detail: { keyword: kw } };
    if (/xmp/i.test(kw)) return { category: CATEGORY.XMP, detail: { keyword: kw } };
    return { category: CATEGORY.TEXT, detail: { keyword: kw } };
  }
  return { category: CATEGORY.STRUCTURE, detail: null };
}

export function parsePNG(bytes: Uint8Array): Segment[] {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 8 || !sig.every((b, i) => bytes[i] === b)) {
    throw new Error('Not a PNG file (bad signature).');
  }
  const chunks: Segment[] = [
    { marker: 'SIGNATURE', start: 0, end: 8, category: CATEGORY.STRUCTURE, detail: null }
  ];
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = readUint32BE(bytes, offset);
    const type = asciiAt(bytes, offset + 4, 4).padEnd(4, '\0');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (crcEnd > bytes.length) {
      chunks.push({
        marker: type,
        start: offset,
        end: bytes.length,
        category: CATEGORY.STRUCTURE,
        detail: null
      });
      break;
    }
    const classified = classifyPNGChunk(type, bytes, dataStart, dataEnd);
    chunks.push({
      marker: type,
      start: offset,
      end: crcEnd,
      category: classified.category as Segment['category'],
      detail: classified.detail
    });
    offset = crcEnd;
    if (type === 'IEND') break;
  }
  return chunks;
}
