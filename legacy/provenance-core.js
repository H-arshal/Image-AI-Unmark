/* =========================================================================
   ProvenanceCore — byte-level metadata parser / rewriter
   (JPEG / PNG / WebP — EXIF, XMP, IPTC, ICC, C2PA structural presence)

   Extracted from index.html (Provenance Lab) so that both Provenance
   Lab and CleanLabel share a single metadata engine.

   Exposed as a global `ProvenanceCore` via `window.ProvenanceCore`.
   No external dependencies. ES2020 baseline.
   ========================================================================= */
'use strict';

(function () {
  const CATEGORY = {
    EXIF: 'EXIF', XMP: 'XMP', IPTC: 'IPTC', ICC: 'ICC',
    C2PA: 'C2PA', COMMENT: 'COMMENT', TEXT: 'TEXT', STRUCTURE: 'STRUCTURE'
  };
  const REMOVABLE_CATEGORIES = [
    CATEGORY.EXIF, CATEGORY.XMP, CATEGORY.IPTC, CATEGORY.ICC,
    CATEGORY.C2PA, CATEGORY.COMMENT, CATEGORY.TEXT
  ];

  function asciiAt(bytes, offset, len) {
    let s = '';
    for (let i = 0; i < len; i++) {
      const b = bytes[offset + i];
      if (b === 0) break;
      s += String.fromCharCode(b);
    }
    return s;
  }
  function bytesStartWith(bytes, offset, str) {
    for (let i = 0; i < str.length; i++) {
      if (bytes[offset + i] !== str.charCodeAt(i)) return false;
    }
    return true;
  }
  function readNullTerminatedAscii(bytes, start, end) {
    let s = '';
    for (let i = start; i < end; i++) {
      if (bytes[i] === 0) break;
      s += String.fromCharCode(bytes[i]);
    }
    return s;
  }
  function readUint32BE(bytes, o) {
    return ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
  }
  function readUint32LE(bytes, o) {
    return ((bytes[o + 3] << 24) | (bytes[o + 2] << 16) | (bytes[o + 1] << 8) | bytes[o]) >>> 0;
  }

  function detectFormat(bytes) {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length >= 8 && pngSig.every((b, i) => bytes[i] === b)) return 'png';
    if (bytes.length >= 12 && bytesStartWith(bytes, 0, 'RIFF') && bytesStartWith(bytes, 8, 'WEBP')) return 'webp';
    return 'unknown';
  }

  function parseExifSummary(payload) {
    try {
      const isLE = payload[0] === 0x49 && payload[1] === 0x49;
      const isBE = payload[0] === 0x4d && payload[1] === 0x4d;
      if (!isLE && !isBE) return null;
      const r16 = (o) => isLE ? (payload[o] | (payload[o + 1] << 8)) : ((payload[o] << 8) | payload[o + 1]);
      const r32 = (o) => (isLE
        ? payload[o] | (payload[o + 1] << 8) | (payload[o + 2] << 16) | (payload[o + 3] << 24)
        : (payload[o] << 24) | (payload[o + 1] << 16) | (payload[o + 2] << 8) | payload[o + 3]) >>> 0;
      const ifd0Offset = r32(4);
      if (ifd0Offset < 8 || ifd0Offset >= payload.length) return null;
      const numEntries = r16(ifd0Offset);
      const tags = { fieldCount: numEntries, hasGPS: false };
      const typeSize = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
      const readAscii = (valueOffset, count) => readNullTerminatedAscii(payload, valueOffset, valueOffset + count);
      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifd0Offset + 2 + i * 12;
        if (entryOffset + 12 > payload.length) break;
        const tagId = r16(entryOffset);
        const type = r16(entryOffset + 2);
        const count = r32(entryOffset + 4);
        const size = (typeSize[type] || 1) * count;
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
    } catch (e) { return null; }
  }

  function classifyJPEGSegment(marker, bytes, payloadStart, payloadEnd) {
    if (marker === 0xe1) {
      if (bytesStartWith(bytes, payloadStart, 'Exif\0\0'))
        return { category: CATEGORY.EXIF, detail: parseExifSummary(bytes.subarray(payloadStart + 6, payloadEnd)) };
      if (bytesStartWith(bytes, payloadStart, 'http://ns.adobe.com/xap/1.0/\0'))
        return { category: CATEGORY.XMP, detail: { preview: asciiAt(bytes, payloadStart + 29, Math.min(payloadEnd - payloadStart - 29, 4000)) } };
      if (bytesStartWith(bytes, payloadStart, 'http://ns.adobe.com/xmp/extension/'))
        return { category: CATEGORY.XMP, detail: { extended: true } };
      return { category: CATEGORY.STRUCTURE, detail: null };
    }
    if (marker === 0xed) {
      if (bytesStartWith(bytes, payloadStart, 'Photoshop 3.0\0'))
        return { category: CATEGORY.IPTC, detail: { bytes: payloadEnd - payloadStart } };
      return { category: CATEGORY.STRUCTURE, detail: null };
    }
    if (marker === 0xe2) {
      if (bytesStartWith(bytes, payloadStart, 'ICC_PROFILE\0'))
        return { category: CATEGORY.ICC, detail: { bytes: payloadEnd - payloadStart } };
      return { category: CATEGORY.STRUCTURE, detail: null };
    }
    if (marker === 0xeb) return { category: CATEGORY.C2PA, detail: { bytes: payloadEnd - payloadStart } };
    if (marker === 0xfe) return { category: CATEGORY.COMMENT, detail: { text: asciiAt(bytes, payloadStart, Math.min(payloadEnd - payloadStart, 500)) } };
    return { category: CATEGORY.STRUCTURE, detail: null };
  }

  function parseJPEG(bytes) {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('Not a JPEG file (missing SOI marker).');
    const segments = [{ marker: 0xd8, start: 0, end: 2, category: CATEGORY.STRUCTURE, detail: null }];
    let offset = 2;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        segments.push({ marker: null, start: offset, end: bytes.length, category: CATEGORY.STRUCTURE, detail: null });
        break;
      }
      let m = offset + 1;
      while (bytes[m] === 0xff) m++;
      const marker = bytes[m];
      const segStart = offset;
      if (marker === 0xd9) {
        segments.push({ marker, start: segStart, end: m + 1, category: CATEGORY.STRUCTURE, detail: null });
        offset = m + 1; break;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        segments.push({ marker, start: segStart, end: m + 1, category: CATEGORY.STRUCTURE, detail: null });
        offset = m + 1; continue;
      }
      if (marker === 0xda) {
        const len = (bytes[m + 1] << 8) | bytes[m + 2];
        let p = m + 1 + len;
        while (p < bytes.length - 1) {
          if (bytes[p] === 0xff) {
            const next = bytes[p + 1];
            if (next === 0x00 || (next >= 0xd0 && next <= 0xd7)) { p += 2; continue; }
            break;
          }
          p++;
        }
        segments.push({ marker, start: segStart, end: p, category: CATEGORY.STRUCTURE, detail: { note: 'image pixel data' } });
        offset = p;
        continue;
      }
      const len = (bytes[m + 1] << 8) | bytes[m + 2];
      const segEnd = m + 1 + len;
      const payloadStart = m + 3;
      const classified = classifyJPEGSegment(marker, bytes, payloadStart, segEnd);
      segments.push({ marker, start: segStart, end: segEnd, category: classified.category, detail: classified.detail });
      offset = segEnd;
    }
    return segments;
  }

  function rebuildFromSegments(bytes, segments, removeCategories) {
    const removeSet = new Set(removeCategories);
    const parts = [];
    for (const seg of segments) { if (removeSet.has(seg.category)) continue; parts.push(bytes.subarray(seg.start, seg.end)); }
    let total = 0; for (const p of parts) total += p.length;
    const out = new Uint8Array(total);
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  function classifyPNGChunk(type, bytes, dataStart, dataEnd) {
    if (type === 'eXIf') return { category: CATEGORY.EXIF, detail: parseExifSummary(bytes.subarray(dataStart, dataEnd)) };
    if (type === 'iCCP') return { category: CATEGORY.ICC, detail: { bytes: dataEnd - dataStart } };
    if (type === 'caBX') return { category: CATEGORY.C2PA, detail: { bytes: dataEnd - dataStart } };
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

  function parsePNG(bytes) {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (bytes.length < 8 || !sig.every((b, i) => bytes[i] === b)) throw new Error('Not a PNG file (bad signature).');
    const chunks = [{ marker: 'SIGNATURE', start: 0, end: 8, category: CATEGORY.STRUCTURE, detail: null }];
    let offset = 8;
    while (offset + 8 <= bytes.length) {
      const length = readUint32BE(bytes, offset);
      const type = asciiAt(bytes, offset + 4, 4).padEnd(4, '\0');
      const dataStart = offset + 8, dataEnd = dataStart + length, crcEnd = dataEnd + 4;
      if (crcEnd > bytes.length) {
        chunks.push({ marker: type, start: offset, end: bytes.length, category: CATEGORY.STRUCTURE, detail: null });
        break;
      }
      const classified = classifyPNGChunk(type, bytes, dataStart, dataEnd);
      chunks.push({ marker: type, start: offset, end: crcEnd, category: classified.category, detail: classified.detail });
      offset = crcEnd;
      if (type === 'IEND') break;
    }
    return chunks;
  }

  function classifyWebPChunk(fourcc) {
    const t = fourcc.trim().toUpperCase();
    if (t === 'EXIF') return CATEGORY.EXIF;
    if (t === 'XMP') return CATEGORY.XMP;
    if (t === 'ICCP') return CATEGORY.ICC;
    if (t === 'C2PA') return CATEGORY.C2PA;
    return CATEGORY.STRUCTURE;
  }

  function parseWebP(bytes) {
    if (bytes.length < 12 || !bytesStartWith(bytes, 0, 'RIFF') || !bytesStartWith(bytes, 8, 'WEBP'))
      throw new Error('Not a WebP file (missing RIFF/WEBP header).');
    const chunks = [{ marker: 'RIFF-HEADER', start: 0, end: 12, category: CATEGORY.STRUCTURE, detail: null }];
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const fourcc = asciiAt(bytes, offset, 4);
      const size = readUint32LE(bytes, offset + 4);
      const dataStart = offset + 8, dataEnd = dataStart + size;
      const pad = size % 2 === 1 ? 1 : 0;
      const chunkEnd = dataEnd + pad;
      if (chunkEnd > bytes.length) {
        chunks.push({ marker: fourcc, start: offset, end: bytes.length, category: CATEGORY.STRUCTURE, detail: null });
        break;
      }
      let detail = null;
      const category = classifyWebPChunk(fourcc);
      if (category === CATEGORY.EXIF) detail = parseExifSummary(bytes.subarray(dataStart, dataEnd));
      else if (category !== CATEGORY.STRUCTURE) detail = { bytes: size };
      chunks.push({ marker: fourcc, start: offset, end: chunkEnd, category, detail });
      offset = chunkEnd;
    }
    return chunks;
  }

  function rebuildWebP(bytes, chunks, removeCategories) {
    const rebuilt = rebuildFromSegments(bytes, chunks, removeCategories);
    const view = new DataView(rebuilt.buffer, rebuilt.byteOffset, rebuilt.byteLength);
    view.setUint32(4, rebuilt.length - 8, true);
    return rebuilt;
  }

  function analyze(bytes) {
    const format = detectFormat(bytes);
    let segments;
    if (format === 'jpeg') segments = parseJPEG(bytes);
    else if (format === 'png') segments = parsePNG(bytes);
    else if (format === 'webp') segments = parseWebP(bytes);
    else throw new Error('Unsupported or unrecognized image format. This tool reads JPEG, PNG, and WebP.');
    const found = {};
    for (const cat of REMOVABLE_CATEGORIES) found[cat] = [];
    for (const seg of segments) { if (found[seg.category]) found[seg.category].push(seg); }
    return { format, segments, found, byteLength: bytes.length };
  }

  function clean(bytes, removeCategories) {
    const format = detectFormat(bytes);
    let segments;
    if (format === 'jpeg') segments = parseJPEG(bytes);
    else if (format === 'png') segments = parsePNG(bytes);
    else if (format === 'webp') segments = parseWebP(bytes);
    else throw new Error('Unsupported or unrecognized image format.');
    if (format === 'webp') return { format, bytes: rebuildWebP(bytes, segments, removeCategories) };
    return { format, bytes: rebuildFromSegments(bytes, segments, removeCategories) };
  }

  const api = { CATEGORY, REMOVABLE_CATEGORIES, detectFormat, analyze, clean };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.ProvenanceCore = api;
  }
})();