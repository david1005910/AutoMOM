import React from 'react';
import { Mic } from 'lucide-react';

interface ConsentModalProps {
  onAccept: () => void;
  onCancel: () => void;
}

export function ConsentModal({ onAccept, onCancel }: ConsentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">음성 데이터 처리 동의</h2>
        </div>

        <div className="text-sm text-gray-600 space-y-2 mb-6">
          <p>녹음을 시작하기 전에 아래 내용에 동의해주세요.</p>
          <ul className="list-disc list-inside space-y-1 text-gray-500">
            <li>회의 음성이 AI 분석을 위해 서버로 전송됩니다.</li>
            <li>음성 파일은 STT 완료 후 30일 뒤 자동 삭제됩니다.</li>
            <li>생성된 회의록은 계정 삭제 시 완전히 삭제됩니다.</li>
            <li>참석자 전원이 녹음에 동의했음을 확인합니다.</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            동의하고 녹음 시작
          </button>
        </div>
      </div>
    </div>
  );
}
