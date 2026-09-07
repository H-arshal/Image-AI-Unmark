import { useCallback, useEffect, useRef, useState } from 'react';
import { analyze, CATEGORY } from '../core';
import type { Analysis, Category } from '../core';
import { humanBytes, mimeFor } from '../shared/bytes';
import { Disclaimer } from '../shared/Disclaimer';
import { detectBoxes, buildMask, RegionBox, BrushStroke } from './detector';
import { run, PipelineResult, Stage } from './pipeline';
import './styles.css';
const LABELS: Record<Category, string> = {
  EXIF: 'EXIF', XMP: 'XMP', IPTC: 'IPTC', ICC: 'ICC',
  C2PA: 'C2PA', COMMENT: 'Comment', TEXT: 'Text', STRUCTURE: ''
};
const CATEGORY_ORDER: Category[] = [
  CATEGORY.EXIF, CATEGORY.XMP, CATEGORY.IPTC, CATEGORY.ICC,
  CATEGORY.C2PA, CATEGORY.COMMENT, CATEGORY.TEXT
];
const DEFAULT_ON = new Set<Category>([
  CATEGORY.EXIF, CATEGORY.XMP, CATEGORY.IPTC, CATEGORY.C2PA, CATEGORY.COMMENT, CATEGORY.TEXT
]);

const MODEL_URL = 'https://huggingface.co/onnx-community/lama/resolve/main/onnx/model_fp16.onnx';

interface FileState {
  file: File;
  bytes: Uint8Array;
  analysis: Analysis;
}


function stageMessage(stage: Stage, done: number, total: number, usingFallback: boolean): string {
  switch (stage) {
    case 'decoding': return 'Decoding image…';
    case 'tiling': return 'Preparing tiles…';
    case 'inpainting':
      return usingFallback
        ? `Inpainting tile ${done} of ${total} (fallback fill — model not loaded)…`
        : `Inpainting tile ${done} of ${total}…`;
    case 'assembling': return 'Assembling result…';
    case 'encoding': return 'Encoding output…';
    case 'stripping metadata': return 'Stripping metadata…';
    case 'done': return 'Done.';
    default: return stage;
  }
}

export function Unmark() {
  const [state, setState] = useState<FileState | null>(null);
  const [detected, setDetected] = useState<RegionBox[]>([]);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [brushRadius, setBrushRadius] = useState(24);
  const [brushOpen, setBrushOpen] = useState(false);
  const [skipInpaint, setSkipInpaint] = useState(false);
  const [selected, setSelected] = useState<Set<Category>>(new Set(DEFAULT_ON));
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<{ stage: Stage; done: number; total: number; usingFallback: boolean } | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const dropzoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushCanvasRef = useRef<HTMLCanvasElement>(null);
  const detectPanelRef = useRef<HTMLElement>(null);
  const choosePanelRef = useRef<HTMLElement>(null);
  const progressPanelRef = useRef<HTMLElement>(null);
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
    setDetected([]);
    setExcluded(new Set());
    setBrushStrokes([]);
    setBrushOpen(false);
    setSkipInpaint(false);
    setSelected(new Set(DEFAULT_ON));
    setProgress(null);
    setResult(null);
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
      setSelected(new Set(DEFAULT_ON));
      setSkipInpaint(false);
      setExcluded(new Set());
      setBrushStrokes([]);
      setResult(null);
      setProgress(null);

      // Load to canvas + auto-detect
      await loadImageToCanvas(file);
      const ctx = imageCanvasRef.current?.getContext('2d');
      if (ctx && imageCanvasRef.current) {
        const imgData = ctx.getImageData(0, 0, imageCanvasRef.current.width, imageCanvasRef.current.height);
        setDetected(detectBoxes(imgData));
      }
      requestAnimationFrame(() => detectPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError(msg);
    }
  }, [clearError, showError]);

  const loadImageToCanvas = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const maxSide = 2048;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        if (imageCanvasRef.current) {
          imageCanvasRef.current.width = w;
          imageCanvasRef.current.height = h;
          const ctx = imageCanvasRef.current.getContext('2d');
          ctx?.drawImage(img, 0, 0, w, h);
        }
        if (overlayCanvasRef.current) {
          overlayCanvasRef.current.width = w;
          overlayCanvasRef.current.height = h;
        }
        if (brushCanvasRef.current) {
          brushCanvasRef.current.width = w;
          brushCanvasRef.current.height = h;
          brushCanvasRef.current.style.touchAction = 'none';
        }
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image.')); };
      img.src = url;
    });
  }, []);

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

  // Brush input handlers
  const brushingRef = useRef(false);
  useEffect(() => {
    const canvas = brushCanvasRef.current;
    if (!canvas) return;
    const toCoords = (evt: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      return { x: (evt.clientX - r.left) * sx, y: (evt.clientY - r.top) * sy };
    };
    const onDown = (e: PointerEvent) => {
      if (!brushOpen) return;
      brushingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = toCoords(e);
      setBrushStrokes(prev => [...prev, { x, y, radius: brushRadius, erase: brushMode === 'erase' }]);
    };
    const onMove = (e: PointerEvent) => {
      if (!brushingRef.current) return;
      const { x, y } = toCoords(e);
      setBrushStrokes(prev => [...prev, { x, y, radius: brushRadius, erase: brushMode === 'erase' }]);
    };
    const onUp = () => { brushingRef.current = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [brushOpen, brushRadius, brushMode]);

  // Redraw overlay when detected/excluded change
  useEffect(() => {
    const c = overlayCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    detected.forEach((b, i) => {
      const isExcluded = excluded.has(i);
      ctx.strokeStyle = isExcluded ? 'rgba(95,168,201,0.25)' : '#5FA8C9';
      ctx.lineWidth = isExcluded ? 1 : 1.5;
      ctx.setLineDash(isExcluded ? [4, 4] : []);
      const L = 16;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + L); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + L, b.y);
      ctx.moveTo(b.x + b.w - L, b.y); ctx.lineTo(b.x + b.w, b.y); ctx.lineTo(b.x + b.w, b.y + L);
      ctx.moveTo(b.x, b.y + b.h - L); ctx.lineTo(b.x, b.y + b.h); ctx.lineTo(b.x + L, b.y + b.h);
      ctx.moveTo(b.x + b.w - L, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h); ctx.lineTo(b.x + b.w, b.y + b.h - L);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!isExcluded) {
        ctx.fillStyle = '#5FA8C9';
        ctx.font = '11px IBM Plex Mono, monospace';
        ctx.fillText(b.score.toFixed(2), b.x + 4, b.y + 14);
      }
    });
  }, [detected, excluded]);

  // Redraw brush
  useEffect(() => {
    const c = brushCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(95,168,201,0.45)';
    for (const s of brushStrokes) {
      ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, [brushStrokes]);

  const toggleCategory = useCallback((cat: Category) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  const handleClean = useCallback(async () => {
    if (!state || !imageCanvasRef.current) return;
    clearError();
    setProgress({ stage: 'decoding', done: 0, total: 1, usingFallback: false });
    progressPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const ctx = imageCanvasRef.current.getContext('2d');
      if (!ctx) throw new Error('Could not read image canvas.');
      const width = imageCanvasRef.current.width;
      const height = imageCanvasRef.current.height;

      const mask = skipInpaint
        ? new Uint8Array(width * height)
        : buildMask(
            width, height,
            detected.filter((_, i) => !excluded.has(i)),
            brushStrokes
          );

      const removeCats = [...selected];
      const pipelineResult = await run({
        file: state.file,
        mask,
        removeCategories: removeCats,
        modelUrl: MODEL_URL,
        onProgress: (done, total, stage) => {
          setProgress(p => ({ stage, done, total, usingFallback: p?.usingFallback ?? false }));
        },
        onFallback: (v) => setProgress(p => p ? { ...p, usingFallback: v } : p)
      });
      setResult(pipelineResult);

      // Build download URL
      if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current);
      const mime = mimeFor(pipelineResult.format);
      const blob = new Blob([pipelineResult.cleanedBytes.slice().buffer], { type: mime });
      const url = URL.createObjectURL(blob);
      downloadUrlRef.current = url;

      setProgress(null);
      requestAnimationFrame(async () => {
        await Promise.all([
          drawThumb(thumbBeforeRef.current, state.bytes, mime),
          drawThumb(thumbAfterRef.current, pipelineResult.cleanedBytes, mime)
        ]);
        if (downloadRef.current) {
          downloadRef.current.href = url;
          const origName = state.file.name.replace(/\.[^.]+$/, '');
          const ext = pipelineResult.format === 'jpeg' ? 'jpg' : pipelineResult.format;
          downloadRef.current.setAttribute('download', `${origName}-clean.${ext}`);
        }
        verifyPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      showError('Could not generate a clean copy: ' + msg);
      setProgress(null);
    }
  }, [state, skipInpaint, detected, excluded, brushStrokes, selected, clearError, showError]);

  // Verification stage analysis
  const afterAnalysis = result ? analyze(result.cleanedBytes) : null;

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Image AI-Unmark</h1>
          <p>Remove the visible AI badge. Know what stays.</p>
        </div>
        <div className="build-tag mono">local-first<br />in-browser inpainting · no upload</div>
      </header>

      <Disclaimer label="Honest scope">
        <p><b>Image AI-Unmark does:</b> removes visible "AI generated" badges drawn on the image, and strips declared metadata (C2PA, EXIF, XMP, IPTC, ICC, comments, text chunks) from a copy of your file.</p>
        <p><b>Image AI-Unmark does not do:</b> it does not affect SynthID or any pixel-domain watermark. It does not affect AI-detection classifiers — those read pixels, not metadata. It does not make an image "undetectable."</p>
        <p><b>Original file is never modified.</b> A new copy is generated.</p>
      </Disclaimer>

      <div ref={dropzoneRef} className="dropzone">
        <div className="icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M12 3v12M7 10l5-5 5 5M4 21h16" />
          </svg>
        </div>
        <div className="primary">Drop a JPEG, PNG, or WebP — or click to choose one</div>
        <div className="secondary">Removes visible AI badges and declared metadata. Does not affect pixel-domain watermarks.</div>
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
        <section ref={detectPanelRef} className="panel show">
          <div className="panel-head">
            <h2>1 · Detect badge regions</h2>
            <span className="sub mono">{state.analysis.format.toUpperCase()}</span>
          </div>
          <div className="canvas-wrap">
            <canvas ref={imageCanvasRef} />
            <canvas ref={overlayCanvasRef} className="stage-canvas" />
            <canvas ref={brushCanvasRef} className="stage-canvas" />
          </div>
          <div className="region-list">
            {detected.length === 0 ? (
              <div className="region-row">
                <span className="pos">No regions auto-detected. Use the brush tool below to mark any visible badge.</span>
              </div>
            ) : detected.map((b, i) => {
              const isExcluded = excluded.has(i);
              return (
                <div key={i} className={`region-row ${isExcluded ? 'excluded' : ''}`}>
                  <span className="pos">{b.name}</span>
                  <span className="mono" style={{ color: 'var(--text-faint)', fontSize: '11.5px' }}>
                    {b.x},{b.y} · {b.w}×{b.h}
                  </span>
                  <span className="score">{b.score.toFixed(2)}</span>
                  <button onClick={() => {
                    setExcluded(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    });
                  }}>{isExcluded ? 'Re-include' : 'Exclude'}</button>
                </div>
              );
            })}
          </div>

          <div className={`brush-toolbar ${brushOpen ? 'show' : ''}`}>
            <div className="mode">
              <button
                data-mode="paint"
                className={brushMode === 'paint' ? 'active' : ''}
                onClick={() => setBrushMode('paint')}
              >Paint</button>
              <button
                data-mode="erase"
                className={brushMode === 'erase' ? 'active' : ''}
                onClick={() => setBrushMode('erase')}
              >Erase</button>
            </div>
            <label>radius</label>
            <input
              type="range"
              min={8}
              max={64}
              step={2}
              value={brushRadius}
              onChange={e => setBrushRadius(Number(e.target.value))}
            />
            <button onClick={() => setBrushStrokes([])}>Reset mask</button>
            <button onClick={() => setBrushOpen(false)}>Done</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button
              className="go-btn go-btn--slate"
              style={{ flex: 1, marginTop: 0 }}
              onClick={() => setBrushOpen(true)}
            >Brush additional regions</button>
            <button
              className="go-btn go-btn--ghost"
              style={{ flex: 1, marginTop: 0 }}
              onClick={() => { setSkipInpaint(true); choosePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
            >Skip inpainting (metadata only)</button>
          </div>
        </section>
      )}

      {state && (
        <section ref={choosePanelRef} className="panel show">
          <div className="panel-head">
            <h2>2 · Choose what to strip</h2>
          </div>
          <div className="cat-list">
            {CATEGORY_ORDER.map(cat => {
              const segs = state.analysis.found[cat] || [];
              const isFound = segs.length > 0;
              const totalBytes = segs.reduce((sum, s) => sum + (s.end - s.start), 0);
              const detail = isFound ? `${humanBytes(totalBytes)} in this file` : 'not present';
              const isOn = selected.has(cat) && isFound;
              return (
                <div key={cat} className={`cat-row ${isOn ? 'on' : ''}`}>
                  <span className="dot" />
                  <span className="label">{LABELS[cat]}</span>
                  <span className="detail mono">{detail}</span>
                  <input
                    type="checkbox"
                    disabled={!isFound}
                    checked={isOn}
                    onChange={() => toggleCategory(cat)}
                  />
                </div>
              );
            })}
          </div>
          <button
            className="go-btn go-btn--slate"
            onClick={handleClean}
            disabled={selected.size === 0 && activeMaskRegionCount() === 0}
          >
            Generate clean copy
          </button>
        </section>
      )}

      {progress && (
        <section ref={progressPanelRef} className="panel show">
          <div className="panel-head">
            <h2>3 · Generating clean copy</h2>
          </div>
          <div className="progress">
            <div className="status mono">{stageMessage(progress.stage, progress.done, progress.total, progress.usingFallback)}</div>
            <div className="bar"><div className="bar-fill" style={{
              width: (progress.stage === 'inpainting' ? (progress.done / progress.total) * 100
                     : progress.stage === 'done' ? 100 : 50) + '%'
            }} /></div>
          </div>
          <Disclaimer label="Heads-up" accent="amber">
            <p>Pixels outside the masked regions are unchanged. If the inpainting model failed to load, a lower-quality fallback is in use — the UI will say so.</p>
          </Disclaimer>
        </section>
      )}

      {result && afterAnalysis && state && (
        <section ref={verifyPanelRef} className="panel show">
          <div className="panel-head">
            <h2>4 · Verification</h2>
            <span className="sub mono">{result.format.toUpperCase()} · cleaned</span>
          </div>
          <div className="region-diff">
            <div className="crop"><canvas ref={thumbBeforeRef} /><div className="cap">original</div></div>
            <div className="crop"><canvas ref={thumbAfterRef} /><div className="cap">cleaned copy</div></div>
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
                    {stillFound ? 'kept' : 'removed'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="size-line mono">
            <span>original: <b>{humanBytes(state.bytes.length)}</b></span>
            <span>cleaned: <b>{humanBytes(result.cleanedBytes.length)}</b></span>
          </div>
          <Disclaimer label="What this tool does not affect">
            <p>SynthID and other pixel-domain watermarks. Semantic / statistical signals detectors read from pixels. Removing declared metadata only removes the <b>declared</b> provenance record — it does not change what the pixels are.</p>
          </Disclaimer>
          <a ref={downloadRef} className="download-btn" download>Download clean copy</a>
        </section>
      )}
    </>
  );
}

function activeMaskRegionCount(): number { return 0; }

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