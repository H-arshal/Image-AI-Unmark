import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze, clean, CATEGORY } from '../core';
import type { Analysis, Category, ImageFormat, Segment } from '../core';
import { humanBytes, mimeFor } from '../shared/bytes';
import JSZip from 'jszip';
import { BatchCollage } from './BatchCollage';
import { Disclaimer } from '../shared/Disclaimer';
import './styles.css';
import icon from '../assets/icon.png'
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

async function readImageInfo(file: File): Promise<{ previewUrl: string; width: number; height: number }> {
  const previewUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error('Could not decode image preview.'));
      candidate.src = previewUrl;
    });
    return { previewUrl, width: image.naturalWidth, height: image.naturalHeight };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

interface FileState {
  file: File;
  bytes: Uint8Array;
  analysis: Analysis;
  previewUrl: string;
  width: number;
  height: number;
}

export function AIUnmark() {
  const [state, setState] = useState<FileState | null>(null);
  const [error, setError] = useState<string>('');
  const [cleaned, setCleaned] = useState<{ bytes: Uint8Array; format: ImageFormat } | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchAnalyses, setBatchAnalyses] = useState<Analysis[]>([]);
  const [batchResults, setBatchResults] = useState<{ file: File; cleanedBytes: Uint8Array; format: ImageFormat }[]>([]);

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
    if (state?.previewUrl) URL.revokeObjectURL(state.previewUrl);
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current);
      downloadUrlRef.current = null;
    }
    setState(null);
    setCleaned(null);
    setShowVerification(false);
    setBatchFiles([]);
    setBatchAnalyses([]);
    setBatchResults([]);
    clearError();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [clearError, state]);

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
      const imageInfo = await readImageInfo(file);
      if (state?.previewUrl) URL.revokeObjectURL(state.previewUrl);
      setState({ file, bytes: buf, analysis, ...imageInfo });
      setCleaned(null);
      setBatchFiles([]);
      setBatchAnalyses([]);
      setBatchResults([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(msg);
    }
  }, [clearError, showError, state]);

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

  const handleClean = useCallback(async () => {
    if (!state) return;
    clearError();
    try {
      if (batchFiles.length > 1) {
        const results: { file: File; cleanedBytes: Uint8Array; format: ImageFormat }[] = [];
        for (const file of batchFiles) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const analysis = analyze(bytes);
          const removeCats = CATEGORY_ORDER.filter(category => analysis.found[category].length > 0);
          const { bytes: cleanedBytes, format } = clean(bytes, removeCats);
          results.push({ file, cleanedBytes, format });
        }
        setBatchResults(results);
        return;
      }

      const removeCats = CATEGORY_ORDER.filter(category => state.analysis.found[category].length > 0);
      const { bytes: cleanedBytes, format } = clean(state.bytes, removeCats);

      // Set download URL
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const mime = mimeFor(format);
      const blob = new Blob([cleanedBytes.slice().buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;

      setCleaned({ bytes: cleanedBytes, format });
      setShowVerification(false);

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
        // Auto-scroll removed; user toggles verification manually
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError('Could not generate a clean copy: ' + msg);
    }
  }, [batchFiles, state, clearError, showError]);

  const handleBatch = useCallback(async (files: File[]) => {
    clearError();
    setBatchFiles(files);
    setBatchResults([]);
    if (files.length > 0) {
      const analyses: Analysis[] = [];
      for (const file of files) {
        analyses.push(analyze(new Uint8Array(await file.arrayBuffer())));
      }
      setBatchAnalyses(analyses);
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const imageInfo = await readImageInfo(files[0]);
      setState({ file: files[0], bytes, analysis: analyze(bytes), ...imageInfo });
    }
  }, [clearError]);

  const handleDownloadZip = useCallback(async () => {
    if (batchResults.length === 0) return;
    const zip = new JSZip();
    for (const r of batchResults) {
      const ext = r.format === 'jpeg' ? 'jpg' : r.format;
      const name = r.file.name.replace(/\.[^.]+$/, '') + '-clean.' + ext;
      zip.file(name, r.cleanedBytes);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned-images.zip';
    a.click();
    URL.revokeObjectURL(url);
  }, [batchResults]);

  const afterAnalysis = cleaned ? analyze(cleaned.bytes) : null;
  const batchMetadata = CATEGORY_ORDER.map(category => ({
    category,
    segments: batchAnalyses.flatMap(analysis => analysis.found[category] || [])
  })).filter(item => item.segments.length > 0);
  const hasMetadata = batchFiles.length > 1
    ? batchMetadata.length > 0
    : state ? CATEGORY_ORDER.some(category => state.analysis.found[category].length > 0) : false;

  // Redraw thumbnails when verification panel is shown
  useEffect(() => {
    if (showVerification && cleaned && state) {
      const mime = mimeFor(cleaned.format);
      Promise.all([
        drawThumb(thumbBeforeRef.current, state.bytes, mime),
        drawThumb(thumbAfterRef.current, cleaned.bytes, mime)
      ]);
    }
  }, [showVerification, cleaned, state]);

  return (
    <>
      <header className="app-header">
        <div>
          <div className="brand-lockup">
            <div className="brand-logo-title">
              <img src={icon} alt="" />
              <span>Image AI-Unmark</span></div>
            </div>
          <h1>Image AI-Unmark</h1>
          <p className="subtitle">Inspect declared metadata, then strip the parts you don't want. Verify the result — privately, in your browser.</p>
        </div>
        <div className="status mono">
          <span style={{ color: 'var(--color-success)' }}>●</span> Runs locally<br />No upload · No server
        </div>
      </header>

      {/* <section className="intro">
        <p className="eyebrow">CLEAN IMAGES. STAY PRIVATE.</p>
        <h2>Image AI-Unmark</h2>
        <p>Inspect declared metadata, then strip the parts you don't want. Verify the result — privately, in your browser.</p>
      </section> */}

      <div className="workspace-grid">
        <section className="surface-panel upload-panel">
          <h2>Upload Image</h2>
          <p>Drop an image here or click to choose a file</p>
          <div ref={dropzoneRef} className="dropzone">
            <div className="icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M12 3v12M7 10l5-5 5 5M4 21h16" />
              </svg>
            </div>
            <div className="primary">Drop an image here</div>
            <div className="secondary">or click to choose a file<br />Supports: .jpg .jpeg .png .webp</div>
            <button className="choose-btn" type="button" onClick={event => { event.stopPropagation(); fileInputRef.current?.click(); }}>Choose Image</button>
            <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                // Process first file for single preview, or batch all
                if (files.length === 1) handleFile(files[0]);
                else handleBatch(files);
              }
            }} />
          </div>
        </section>

        <section className="surface-panel selected-panel">
          <div className="selected-top">
            {batchFiles.length > 1 ? (
              <BatchCollage files={batchFiles} />
            ) : state ? (
              <img className="preview" src={state.previewUrl} alt="Selected image preview" />
            ) : (
              <div className="preview" aria-hidden="true" />
            )}
            <div className="selected-meta">
              <h2>{batchFiles.length > 1 ? 'Selected Images' : 'Selected Image'}</h2>
              {state ? <>
                {batchFiles.length > 1 ? <>
                  <strong>{batchFiles.length} images selected</strong>
                  <p className="summary">Ready to inspect and clean as a batch</p>
                </> : <>
                  <strong>{state.file.name}</strong>
                  <p className="summary">{humanBytes(state.file.size)} | {state.width} × {state.height} | {state.file.type || 'unknown type'}</p>
                  <dl className="info-list">
                    <div><dt>File name</dt><dd>{state.file.name}</dd></div>
                    <div><dt>File type</dt><dd>{state.file.type || 'unknown type'}</dd></div>
                    <div><dt>Dimensions</dt><dd>{state.width} × {state.height}</dd></div>
                    <div><dt>File size</dt><dd>{humanBytes(state.file.size)}</dd></div>
                  </dl>
                </>}
              </> : <p>Select an image to inspect its declared metadata.</p>}
            </div>
          </div>
          {state && <button className="change-btn" type="button" onClick={() => fileInputRef.current?.click()}>Change</button>}
        </section>
      </div>

      <div className={`error-box ${error ? 'show' : ''}`}>{error}</div>

      {state && (
        <section className="metadata-panel">
          <div className="panel-head">
            <div><h2>Detected Metadata</h2><span className="section-description">{batchFiles.length > 1 ? `Metadata found across ${batchFiles.length} selected images` : 'Metadata and additional information found in this image.'}</span></div>
            <span className="sub mono">{batchFiles.length > 1 ? `${batchFiles.length} FILES` : state.analysis.format.toUpperCase()} · {humanBytes(state.bytes.length)}</span>
          </div>
          <div className="table-head"><span aria-hidden="true" /><span>Type</span><span>Status</span><span>Details</span><span>Size</span></div>
          <div className="readout">
            {(batchFiles.length > 1 ? batchMetadata : CATEGORY_ORDER
              .filter(cat => state.analysis.found[cat]?.length > 0)
              .map(cat => ({ category: cat, segments: state.analysis.found[cat] || [] })))
              .map(({ category: cat, segments: segs }) => {
              const totalBytes = segs.reduce((sum, s) => sum + segBytes(s), 0);
              const detail = segs.map(s => detailLine({ category: cat, seg: s })).filter(Boolean).join(' / ');
              return (
                <div key={cat} className="row found">
                  <span className="dot" />
                  <span className="label">{LABELS[cat]}</span>
                  <span className="state mono">FOUND</span>
                  <span className="detail mono" title={detail}>{detail}</span>
                  <span className="bytes mono">{humanBytes(totalBytes)}</span>
                </div>
              );
            })}
            {(batchFiles.length > 1 ? batchMetadata.length === 0 : CATEGORY_ORDER.every(cat => state.analysis.found[cat]?.length === 0)) && (
              <div className="metadata-empty">No declared metadata found in this image.</div>
            )}
          </div>
        </section>
      )}

      {state && <section className="removal-panel">
        <div className="panel-head">
          <div><h2>Remove Metadata</h2><span className="section-description">Remove every declared metadata category found in this image.</span></div>
        </div>
      </section>}

      {state && <div className="action-bar">
        <button className="reset-btn" type="button" onClick={resetAll}>Reset</button>
        <button className="go-btn" style={{ background: 'var(--color-primary)', color: '#fff', border: '1px solid var(--color-primary)' }} onClick={handleClean} disabled={!hasMetadata}>
          ✦ &nbsp; {hasMetadata ? 'Remove Metadata' : 'No metadata found'}
        </button>
        {batchResults.length > 0 ? (
          <button className="go-btn" style={{ background: batchResults.length > 0 ? 'var(--color-success)' : 'var(--color-surface-muted)', color: batchResults.length > 0 ? '#fff' : 'var(--color-text-disabled)', border: batchResults.length > 0 ? '1px solid var(--color-success)' : '1px solid var(--color-border)' }} onClick={handleDownloadZip} disabled={batchResults.length === 0}>
            ↓ &nbsp; Download ZIP ({batchResults.length})
          </button>
        ) : (
          <a ref={downloadRef} className={`download-btn ${cleaned ? '' : 'is-disabled'}`} download aria-disabled={!cleaned}>↓ &nbsp; Download cleaned image</a>
        )}
      </div>}

      {(cleaned && afterAnalysis && state && batchResults.length <= 1) && (
        <>
          <div className="action-bar">
            <button
              className="verify-toggle-btn"
              type="button"
              onClick={() => {
                setShowVerification(v => {
                  const next = !v;
                  if (next) {
                    setTimeout(() => verifyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }
                  return next;
                });
              }}
            >
              {showVerification ? 'Hide Verification' : 'Show Verification'}
            </button>
          </div>
          {showVerification && (
            <section ref={verifyPanelRef} className="verification-panel panel show">
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
          <Disclaimer label="Honest scope" accent="amber">
            <p><b>What this does and doesn't prove.</b> EXIF/XMP/IPTC/C2PA metadata removal strips the provenance information recorded within the image itself. This is not evidence that the image has never been generated or modified by an AI, nor can it be considered equivalent to breaking pixel-level or invisible watermarks, which cannot be identified or stripped by this tool.</p>
            <p>The detection of C2PA here is structural (the presence of a Content Credentials manifest container), not semantic (assertions or signatures).</p>
          </Disclaimer>
            </section>
          )}
        </>
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