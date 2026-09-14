import { readNullTerminatedAscii } from './bytes';
import type { ExifSummary } from './types';

/**
 * Parse the IFD0 of an EXIF segment and return a small summary.
 * Best-effort: returns null on any parse error.
 *
 * Supports both endiannesses (II = little-endian, MM = big-endian).
 * Extracts only the most useful tags for an inspection tool:
 * Make, Model, Software, DateTime, Orientation, and GPS presence.
 */
export function parseExifSummary(payload: Uint8Array): ExifSummary | null {
  try {
    const isLE = payload[0] === 0x49 && payload[1] === 0x49;
    const isBE = payload[0] === 0x4d && payload[1] === 0x4d;
    if (!isLE && !isBE) return null;

    const r16 = (o: number): number =>
      isLE
        ? (payload[o]! | (payload[o + 1]! << 8))
        : ((payload[o]! << 8) | payload[o + 1]!);

    const r32 = (o: number): number =>
      isLE
        ? ((payload[o]!) |
           (payload[o + 1]! << 8) |
           (payload[o + 2]! << 16) |
           (payload[o + 3]! << 24)) >>> 0
        : (((payload[o]!) << 24) |
           (payload[o + 1]! << 16) |
           (payload[o + 2]! << 8) |
           payload[o + 3]!) >>> 0;

    const ifd0Offset = r32(4);
    if (ifd0Offset < 8 || ifd0Offset >= payload.length) return null;

    const numEntries = r16(ifd0Offset);
    const tags: ExifSummary = { fieldCount: numEntries, hasGPS: false };

    // EXIF TIFF type sizes (bytes per element)
    const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

    const readAscii = (valueOffset: number, count: number): string =>
      readNullTerminatedAscii(payload, valueOffset, valueOffset + count);

    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifd0Offset + 2 + i * 12;
      if (entryOffset + 12 > payload.length) break;
      const tagId = r16(entryOffset);
      const type = r16(entryOffset + 2);
      const count = r32(entryOffset + 4);
      const size = (typeSize[type] ?? 1) * count;
      const valueOffset = size > 4 ? r32(entryOffset + 8) : entryOffset + 8;
      if (valueOffset < 0 || valueOffset > payload.length) continue;

      switch (tagId) {
        case 0x010f: tags.make = readAscii(valueOffset, count); break;
        case 0x0110: tags.model = readAscii(valueOffset, count); break;
        case 0x0131: tags.software = readAscii(valueOffset, count); break;
        case 0x0132: tags.dateTime = readAscii(valueOffset, count); break;
        case 0x0112: tags.orientation = r16(valueOffset); break;
        case 0x8825: tags.hasGPS = true; break;
        default: break;
      }
    }
    return tags;
  } catch {
    return null;
  }
}