import React, { useEffect, useRef } from 'react';

interface WaveformProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
}

export function Waveform({ analyserNode, isRecording }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isRecording) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#6366f1';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode, isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full rounded-md bg-slate-50"
    />
  );
}
