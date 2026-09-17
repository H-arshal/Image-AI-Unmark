import { useEffect, useRef } from 'react';
import './BatchCollage.css';

export function BatchCollage({ files }: { files: File[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || files.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = Math.ceil(Math.sqrt(files.length));
    const rows = Math.ceil(files.length / cols);
    const thumbW = 76;
    const thumbH = 76;
    const gap = 4;
    canvas.width = cols * (thumbW + gap) + gap;
    canvas.height = rows * (thumbH + gap) + gap;

    let loaded = 0;
    files.forEach((file, i) => {
      const img = new Image();
      img.onload = () => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(img, col * (thumbW + gap), row * (thumbH + gap), thumbW, thumbH);
        loaded++;
      };
      img.src = URL.createObjectURL(file);
    });
  }, [files]);

  return <canvas ref={canvasRef} className="batch-collage" />;
}
