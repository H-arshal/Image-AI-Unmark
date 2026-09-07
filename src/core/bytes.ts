/**
 * Byte-level helpers shared by all format parsers.
 * Pure functions, no side effects, no DOM access.
 */

export function asciiAt(bytes: Uint8Array, offset: number, len: number): string {
  let s = '';
  for (let i = 0; i < len; i++) {
    const b = bytes[offset + i];
    if (b === 0) break;
    s += String.fromCharCode(b);
  }
  return s;
}

export function bytesStartWith(bytes: Uint8Array, offset: number, str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    if (bytes[offset + i] !== str.charCodeAt(i)) return false;
  }
  return true;
}

export function readNullTerminatedAscii(bytes: Uint8Array, start: number, end: number): string {
  let s = '';
  for (let i = start; i < end; i++) {
    if (bytes[i] === 0) break;
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

export function readUint32BE(bytes: Uint8Array, o: number): number {
  return (((bytes[o] ?? 0) << 24) |
          ((bytes[o + 1] ?? 0) << 16) |
          ((bytes[o + 2] ?? 0) << 8) |
          (bytes[o + 3] ?? 0)) >>> 0;
}

export function readUint32LE(bytes: Uint8Array, o: number): number {
  return (((bytes[o + 3] ?? 0) << 24) |
          ((bytes[o + 2] ?? 0) << 16) |
          ((bytes[o + 1] ?? 0) << 8) |
          (bytes[o] ?? 0)) >>> 0;
}