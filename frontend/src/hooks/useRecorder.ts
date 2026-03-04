import { useState, useRef, useCallback } from 'react';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export interface UseRecorderReturn {
  state: RecordingState;
  duration: number;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  reset: () => void;
}

const MAX_DURATION = 4 * 60 * 60; // 4시간 (초)

function getSupportedMimeType(): string {
  const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg', 'audio/webm'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useRecorder(): UseRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current = null;
    recorderRef.current = null;
    audioCtxRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('녹음은 HTTPS 환경에서만 사용 가능합니다.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      setAnalyserNode(analyser);

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(1000);
      recorderRef.current = recorder;
      setState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= MAX_DURATION) {
            // 4시간 자동 정지
            recorder.stop();
            cleanup();
            setState('stopped');
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      const domErr = err as DOMException;
      if (domErr.name === 'NotAllowedError' || domErr.name === 'PermissionDeniedError') {
        setError('마이크 권한이 거부되었습니다. 브라우저 주소창 왼쪽 자물쇠 아이콘 → 마이크 허용 후 새로고침해주세요.');
      } else if (domErr.name === 'NotFoundError' || domErr.name === 'DevicesNotFoundError') {
        setError('마이크 장치를 찾을 수 없습니다. 파일 업로드로 대신 진행할 수 있습니다.');
      } else if (domErr.name === 'NotReadableError' || domErr.name === 'TrackStartError') {
        setError('마이크가 다른 프로그램에서 사용 중입니다. 다른 앱을 종료 후 다시 시도해주세요.');
      } else if (domErr.name === 'OverconstrainedError') {
        setError('마이크 설정이 지원되지 않습니다. 다른 마이크를 사용해주세요.');
      } else {
        setError((err as Error).message || '마이크 접근에 실패했습니다. 파일 업로드를 이용해주세요.');
      }
    }
  }, [cleanup]);

  const pauseRecording = useCallback(() => {
    recorderRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setState('paused');
  }, []);

  const resumeRecording = useCallback(() => {
    recorderRef.current?.resume();
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    setState('recording');
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) { resolve(null); return; }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setState('stopped');
        cleanup();
        resolve(blob);
      };

      recorder.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    });
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setState('idle');
    setDuration(0);
    setAudioBlob(null);
    setError(null);
    setAnalyserNode(null);
    chunksRef.current = [];
  }, [cleanup]);

  return { state, duration, audioBlob, analyserNode, error, startRecording, pauseRecording, resumeRecording, stopRecording, reset };
}
