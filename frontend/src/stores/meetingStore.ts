import { create } from 'zustand';
import type { Meeting } from '@/types/meeting';

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

interface MeetingState {
  currentMeeting: Meeting | null;
  recordingState: RecordingState;
  uploadProgress: number;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  setRecordingState: (state: RecordingState) => void;
  setUploadProgress: (progress: number) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  currentMeeting: null,
  recordingState: 'idle',
  uploadProgress: 0,
  setCurrentMeeting: (meeting) => set({ currentMeeting: meeting }),
  setRecordingState: (recordingState) => set({ recordingState }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
}));
