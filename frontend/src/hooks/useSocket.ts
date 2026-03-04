import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

interface ProgressEvent { meetingId: string; stage: string; percent: number }
interface MeetingEvent { meetingId: string }
interface ErrorEvent { meetingId: string; error: string; retryable: boolean }

interface UseSocketOptions {
  meetingId: string;
  onProgress?: (e: ProgressEvent) => void;
  onReady?: (e: MeetingEvent) => void;
  onError?: (e: ErrorEvent) => void;
}

export function useSocket({ meetingId, onProgress, onReady, onError }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAuthStore((s) => s.accessToken);

  const subscribe = useCallback(() => {
    socketRef.current?.emit('meeting:subscribe', { meetingId });
  }, [meetingId]);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io({ auth: { token: accessToken }, transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', subscribe);
    socket.on('meeting:progress', (e: ProgressEvent) => onProgress?.(e));
    socket.on('meeting:ready', (e: MeetingEvent) => onReady?.(e));
    socket.on('meeting:error', (e: ErrorEvent) => onError?.(e));

    return () => {
      socket.off('connect', subscribe);
      socket.disconnect();
    };
  }, [accessToken, subscribe, onProgress, onReady, onError]);
}
