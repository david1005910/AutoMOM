import React from 'react';

interface RecordingTimerProps {
  duration: number; // 초
}

export function RecordingTimer({ duration }: RecordingTimerProps) {
  const h = Math.floor(duration / 3600);
  const m = Math.floor((duration % 3600) / 60);
  const s = duration % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className="font-mono text-lg tabular-nums">
      {h > 0 && `${pad(h)}:`}{pad(m)}:{pad(s)}
    </span>
  );
}
