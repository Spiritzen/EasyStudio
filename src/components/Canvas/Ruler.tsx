import { useRef, useEffect } from 'react';

interface Props {
  orientation: 'horizontal' | 'vertical';
  length: number;
}

const RULER_SIZE = 20;

export default function Ruler({ orientation, length }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isH = orientation === 'horizontal';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = isH ? length : RULER_SIZE;
    const h = isH ? RULER_SIZE : length;
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a3a52';
    ctx.fillStyle = '#5a5a7a';
    ctx.font = '8px monospace';

    const step10 = 10;
    const step50 = 50;
    const step100 = 100;

    for (let i = 0; i <= length; i += step10) {
      const isMajor = i % step100 === 0;
      const isMid = i % step50 === 0;

      ctx.beginPath();
      if (isH) {
        const tickH = isMajor ? 14 : isMid ? 10 : 6;
        ctx.moveTo(i, RULER_SIZE);
        ctx.lineTo(i, RULER_SIZE - tickH);
        if (isMajor && i > 0) {
          ctx.fillStyle = '#5a5a7a';
          ctx.fillText(`${i}`, i + 2, 10);
        }
      } else {
        const tickW = isMajor ? 14 : isMid ? 10 : 6;
        ctx.moveTo(RULER_SIZE, i);
        ctx.lineTo(RULER_SIZE - tickW, i);
        if (isMajor && i > 0) {
          ctx.save();
          ctx.translate(10, i - 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = '#5a5a7a';
          ctx.fillText(`${i}`, 0, 0);
          ctx.restore();
        }
      }
      ctx.strokeStyle = isMajor ? '#4a4a6a' : '#2e2e46';
      ctx.stroke();
    }
  }, [length, isH]);

  return (
    <canvas
      ref={canvasRef}
      width={isH ? length : RULER_SIZE}
      height={isH ? RULER_SIZE : length}
      style={{ display: 'block', flexShrink: 0 }}
    />
  );
}
