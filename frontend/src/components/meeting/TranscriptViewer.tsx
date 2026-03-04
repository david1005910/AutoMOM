import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface TranscriptViewerProps {
  transcript: string;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-secondary text-sm font-medium transition-colors"
      >
        <span>원문 전사 텍스트</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 max-h-96 overflow-y-auto bg-white">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {transcript}
          </pre>
        </div>
      )}
    </div>
  );
}
