import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useMeeting, useTranscribe } from '@/hooks/useMeeting';

const STAGE_LABEL: Record<string, string> = {
  downloading: 'S3에서 파일 다운로드 중',
  transcribing: 'Whisper AI로 음성 변환 중',
  summarizing: 'Claude AI로 회의록 생성 중',
};

export function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const { data: meeting } = useMeeting(id!);
  const transcribe = useTranscribe(id!);

  // 이미 failed 상태로 로드된 경우 오류 표시
  React.useEffect(() => {
    if (meeting?.status === 'failed' && !error) {
      setError('STT 처리 중 오류가 발생했습니다.');
    }
  }, [meeting?.status]);

  const handleRetry = async () => {
    if (!meeting?.fileKey) return;
    setError('');
    try {
      await transcribe.mutateAsync(meeting.fileKey);
    } catch {
      setError('재시도 요청에 실패했습니다.');
    }
  };

  const onProgress = useCallback(
    (e: { meetingId: string; stage: string; percent: number }) => {
      if (e.meetingId === id) { setProgress(e.percent); setStage(e.stage); }
    },
    [id]
  );

  const onReady = useCallback(
    (e: { meetingId: string }) => {
      if (e.meetingId === id) navigate(`/meeting/${id}`);
    },
    [id, navigate]
  );

  const onError = useCallback(
    (e: { meetingId: string; error: string }) => {
      if (e.meetingId === id) setError(e.error);
    },
    [id]
  );

  useSocket({ meetingId: id!, onProgress, onReady, onError });

  // 이미 완료된 경우 리다이렉트
  if (meeting?.status === 'done') {
    navigate(`/meeting/${id}`);
    return null;
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">처리 실패</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              {meeting?.fileKey && (
                <button
                  onClick={handleRetry}
                  disabled={transcribe.isPending}
                  className="flex items-center gap-2 mx-auto px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  다시 시도
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 mx-auto px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-lg font-semibold mb-2">회의록 생성 중</h2>
            <p className="text-sm text-gray-500 mb-6">
              {stage ? STAGE_LABEL[stage] ?? stage : '처리를 시작하고 있습니다...'}
            </p>

            <div className="w-full bg-secondary rounded-full h-2 mb-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-400">{progress}%</p>

            <div className="mt-8 grid grid-cols-3 gap-2 text-xs text-gray-400">
              {['downloading', 'transcribing', 'summarizing'].map((s) => (
                <div
                  key={s}
                  className={`py-1 rounded ${stage === s ? 'text-primary font-medium' : ''}`}
                >
                  {STAGE_LABEL[s]}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
