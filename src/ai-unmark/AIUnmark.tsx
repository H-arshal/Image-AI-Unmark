import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze, clean, CATEGORY } from '../core';
import type { Analysis, Category, ImageFormat, Segment } from '../core';
import { humanBytes, mimeFor } from '../shared/bytes';
import { Disclaimer } from '../shared/Disclaimer';
import './styles.css';

const LABELS: Record<Category, string> = {
  EXIF: 'EXIF', XMP: 'XMP', IPTC: 'IPTC', ICC: 'ICC',
  C2PA: 'C2PA', COMMENT: 'Comment', TEXT: 'Text', STRUCTURE: ''
};

const CATEGORY_ORDER: Category[] = [
  CATEGORY.EXIF, CATEGORY.XMP, CATEGORY.IPTC, CATEGORY.ICC,
  CATEGORY.C2PA, CATEGORY.COMMENT, CATEGORY.TEXT
];

interface DetailLineProps {
  category: Category;
  seg: Segment;
}

function detailLine({ category, seg }: DetailLineProps): string {
  const d = seg.detail;
  if (!d) return '';
  if (category === 'EXIF') {
    const bits: string[] = [];
    if (d.make || d.model) bits.push([d.make, d.model].filter(Boolean).join(' '));
    if (d.software) bits.push('via ' + d.software);
    if (d.hasGPS) bits.push('includes GPS');
    if (d.dateTime) bits.push(d.dateTime);
    return bits.length ? bits.join(' · ') : `${d.fieldCount ?? 0} fields`;
  }
  if (category === 'XMP') return d.extended ? 'extended XMP packet' : 'XMP packet present';
  if (category === 'C2PA') return 'JUMBF/Content Credentials container — structure detected, not cryptographically verified';
  if (category === 'IPTC') return 'Photoshop IRB / IPTC block';
  if (category === 'ICC') return 'embedded color profile';
  if (category === 'COMMENT' && d.text) return `"${d.text}"`;
  if (category === 'TEXT' && d.keyword) return 'keyword: ' + d.keyword;
  return '';
}

function segBytes(seg: Segment): number {
  return seg.end - seg.start;
}

interface FileState {
  file: File;
  bytes: Uint8Array;
  analysis: Analysis;
}

export function AIUnmark() {
  const [state, setState] = useState<FileState | null>(null);
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [error, setError] = useState<string>('');
  const [cleaned, setCleaned] = useState<{ bytes: Uint8Array; format: ImageFormat } | null>(null);
  const [preset, setPreset] = useState<'privacy' | 'full' | 'custom'>('custom');

  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const verifyPanelRef = useRef<HTMLElement>(null);
  const thumbBeforeRef = useRef<HTMLCanvasElement>(null);
  const thumbAfterRef = useRef<HTMLCanvasElement>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const downloadUrlRef = useRef<string | null>(null);

  const showError = useCallback((msg: string) => setError(msg), []);
  const clearError = useCallback(() => setError(''), []);

  const resetAll = useCallback(() => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setState(null);
    setSelected(new Set());
    setCleaned(null);
    setPreset('custom');
    clearError();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [clearError]);

  const handleFile = useCallback(async (file: File | undefined) => {
    clearError();
    if (!file) return;
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showError('File is larger than 30 MB — please choose a smaller image for this build.');
      return;
    }

    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const analysis = analyze(buf);
      setState({ file, bytes: buf, analysis });
      setSelected(new Set());
      setPreset('custom');
      setCleaned(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(msg);
    }
  }, [clearError, showError]);

  // Drag & drop
  useEffect(() => {
    const dz = dropzoneRef.current;
    if (!dz) return;
    const onClick = () => fileInputRef.current?.click();
    const onDragOver = (e: DragEvent) => { e.preventDefault(); dz.classList.add('drag'); };
    const onDragLeave = () => dz.classList.remove('drag');
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dz.classList.remove('drag');
      const f = e.dataTransfer?.files?.[0];
      if (f) void handleFile(f);
    };
    dz.addEventListener('click', onClick);
    dz.addEventListener('dragover', onDragOver);
    dz.addEventListener('dragenter', onDragOver);
    dz.addEventListener('dragleave', onDragLeave);
    dz.addEventListener('drop', onDrop);
    return () => {
      dz.removeEventListener('click', onClick);
      dz.removeEventListener('dragover', onDragOver);
      dz.removeEventListener('dragenter', onDragOver);
      dz.removeEventListener('dragleave', onDragLeave);
      dz.removeEventListener('drop', onDrop);
    };
  }, [handleFile]);

  const toggleCategory = useCallback((cat: Category) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
    setPreset('custom');
  }, []);

  const applyPreset = useCallback((name: 'privacy' | 'full') => {
    if (!state) return;
    const found = state.analysis.found;
    const availableCats = CATEGORY_ORDER.filter(c => found[c] && found[c].length > 0);
    let selection: Category[];
    if (name === 'privacy') {
      selection = availableCats.filter(c => c === 'EXIF' || c === 'ICC' || c === 'COMMENT');
    } else {
      selection = availableCats;
    }
    setSelected(new Set(selection));
    setPreset(name);
  }, [state]);

  const handleClean = useCallback(async () => {
    if (!state) return;
    clearError();
    try {
      const removeCats = [...selected];
      const { bytes: cleanedBytes, format } = clean(state.bytes, removeCats);

      // Set download URL
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const mime = mimeFor(format);
      const blob = new Blob([cleanedBytes.slice().buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;

      setCleaned({ bytes: cleanedBytes, format });

      // After render, draw thumbs
      requestAnimationFrame(async () => {
        await Promise.all([
          drawThumb(thumbBeforeRef.current, state.bytes, mime),
          drawThumb(thumbAfterRef.current, cleanedBytes, mime)
        ]);
        if (downloadRef.current) {
          downloadRef.current.href = url;
          const origName = state.file.name.replace(/\.[^.]+$/, '');
          const ext = format === 'jpeg' ? 'jpg' : format;
          downloadRef.current.setAttribute('download', `${origName}-clean.${ext}`);
        }
        verifyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError('Could not generate a clean copy: ' + msg);
    }
  }, [state, selected, clearError, showError]);

  const afterAnalysis = cleaned ? analyze(cleaned.bytes) : null;

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Image AI-Unmark</h1>
          <p>Inspect declared metadata, then strip the parts you don't want. Verify the result — privately, in your browser.</p>
        </div>
        <div className="build-tag mono">local-first<br />no upload · no server</div>
      </header>

      <div ref={dropzoneRef} className="dropzone">
        <div className="icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M12 3v12M7 10l5-5 5 5M4 21h16" />
          </svg>
        </div>
        <div className="primary">Drop a JPEG, PNG, or WebP — or click to choose one</div>
        <div className="secondary">Nothing leaves this browser tab.</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>

      {state && (
        <div className="filestrip show">
          <div>
            <div className="name mono">{state.file.name}</div>
            <div className="meta mono">{humanBytes(state.file.size)} · {state.file.type || 'unknown type'}</div>
          </div>
          <button onClick={resetAll}>Load a different image</button>
        </div>
      )}

      <div className={`error-box ${error ? 'show' : ''}`}>{error}</div>

      {state && (
        <section className="panel show">
          <div className="panel-head">
            <h2>Inspection</h2>
            <span className="sub mono">{state.analysis.format.toUpperCase()} · {humanBytes(state.analysis.byteLength)}</span>
          </div>
          <div className="readout">
            {CATEGORY_ORDER.map(cat => {
              const segs = state.analysis.found[cat] || [];
              const isFound = segs.length > 0;
              const totalBytes = segs.reduce((sum, s) => sum + segBytes(s), 0);
              const detail = isFound ? segs.map(s => detailLine({ category: cat, seg: s })).filter(Boolean).join(' / ') : '';
              return (
                <div key={cat} className={`row ${isFound ? 'found' : ''}`}>
                  <span className="dot" />
                  <span className="label">{LABELS[cat]}</span>
                  <span className="state mono">{isFound ? 'FOUND' : 'not found'}</span>
                  <span className="detail mono" title={detail}>{detail}</span>
                  <span className="bytes mono">{isFound ? humanBytes(totalBytes) : ''}</span>
                  <span className="toggle">
                    {isFound && (
                      <input
                        type="checkbox"
                        checked={selected.has(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {state && (
        <section className="panel show">
          <div className="panel-head">
            <h2>Select what to remove</h2>
          </div>
          <div className="presets">
            <button
              className={`preset-btn ${preset === 'privacy' ? 'active' : ''}`}
              onClick={() => applyPreset('privacy')}
            >Privacy clean</button>
            <button
              className={`preset-btn ${preset === 'full' ? 'active' : ''}`}
              onClick={() => applyPreset('full')}
            >Full clean</button>
            <button
              className={`preset-btn ${preset === 'custom' ? 'active' : ''}`}
              onClick={() => setPreset('custom')}
            >Custom (use checkboxes above)</button>
          </div>
          <button
            className="go-btn"
            disabled={selected.size === 0}
            onClick={handleClean}
          >
            {selected.size === 0
              ? 'Select at least one item to remove'
              : `Generate clean copy — remove ${selected.size} item${selected.size > 1 ? 's' : ''}`}
          </button>
        </section>
      )}

      {cleaned && afterAnalysis && state && (
        <section ref={verifyPanelRef} className="panel show">
          <div className="panel-head">
            <h2>Verification</h2>
            <span className="sub mono">re-scanned output</span>
          </div>
          <div className="thumbs">
            <div className="thumb"><canvas ref={thumbBeforeRef} /><div className="cap">original</div></div>
            <div className="thumb"><canvas ref={thumbAfterRef} /><div className="cap">cleaned copy</div></div>
          </div>
          <div>
            {CATEGORY_ORDER.map(cat => {
              const wasFound = state.analysis.found[cat].length > 0;
              if (!wasFound) return null;
              const stillFound = afterAnalysis.found[cat].length > 0;
              return (
                <div key={cat} className="diff-row">
                  <span className="label">{LABELS[cat]}</span>
                  <span className="before">found</span>
                  <span className="arrow">→</span>
                  <span className={`after ${stillFound ? 'kept' : 'removed'}`}>
                    {stillFound ? 'still present (kept)' : 'removed'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="size-line mono">
            <span>original: <b>{humanBytes(state.bytes.length)}</b></span>
            <span>cleaned: <b>{humanBytes(cleaned.bytes.length)}</b></span>
          </div>
          <Disclaimer label="Honest scope">
            <p><b>What this does and doesn't prove.</b> Removing EXIF/XMP/IPTC/C2PA metadata deletes the disclosed provenance record embedded in the file. It is not proof the image was never AI-generated or edited, and it is not equivalent to defeating pixel-level or invisible watermarking, which this tool cannot detect or touch.</p>
            <p>C2PA detection here is structural (presence of a Content Credentials manifest container) — this tool does not parse assertions or verify cryptographic signatures.</p>
          </Disclaimer>
          <a ref={downloadRef} className="download-btn" download>Download clean copy</a>
        </section>
      )}
    </>
  );
}

async function drawThumb(canvas: HTMLCanvasElement | null, bytes: Uint8Array, mime: string): Promise<void> {
  if (!canvas) return;
  return new Promise(resolve => {
    const blob = new Blob([bytes.slice().buffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const maxW = 300, maxH = 160;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    img.src = url;
  });
}