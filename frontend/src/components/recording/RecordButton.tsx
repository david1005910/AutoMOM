import React from 'react';
import { Mic, Pause, Play, Square } from 'lucide-react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface RecordButtonProps {
  state: RecordingState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function RecordButton({ state, onStart, onPause, onResume, onStop, disabled }: RecordButtonProps) {
  if (state === 'idle') {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors disabled:opacity-50"
      >
        <Mic className="w-5 h-5" />
        녹음 시작
      </button>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex gap-3">
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Pause className="w-4 h-4" />
          일시정지
        </button>
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
        >
          <Square className="w-4 h-4" />
          정지
        </button>
      </div>
    );
  }

  if (state === 'paused') {
    return (
      <div className="flex gap-3">
        <button
          onClick={onResume}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          <Play className="w-4 h-4" />
          계속 녹음
        </button>
        <button
          onClick={onStop}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
        >
          <Square className="w-4 h-4" />
          정지
        </button>
      </div>
    );
  }

  return null;
}
