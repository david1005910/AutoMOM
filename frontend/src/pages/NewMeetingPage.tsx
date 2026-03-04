import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useCreateMeeting, useUploadUrl, useTranscribe } from '@/hooks/useMeeting';
import { useRecorder } from '@/hooks/useRecorder';
import { useFileUpload } from '@/hooks/useFileUpload';
import { meetingsApi } from '@/api/meetings';
import { ConsentModal } from '@/components/recording/ConsentModal';
import { RecordButton } from '@/components/recording/RecordButton';
import { RecordingTimer } from '@/components/recording/RecordingTimer';
import { Waveform } from '@/components/recording/Waveform';
import type { Attendee } from '@/types/meeting';

export function NewMeetingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [metAt, setMetAt] = useState(new Date().toISOString().slice(0, 16));
  const [agenda, setAgenda] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: '', role: '' }]);
  const [showConsent, setShowConsent] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'record' | 'upload'>('form');
  const [uploadError, setUploadError] = useState('');
  const [titleError, setTitleError] = useState(false);

  const createMeeting = useCreateMeeting();
  const getUploadUrl = useUploadUrl(meetingId ?? '');
  const transcribe = useTranscribe(meetingId ?? '');
  const { upload, uploading } = useFileUpload();
  const recorder = useRecorder();

  const addAttendee = () => setAttendees((a) => [...a, { name: '', role: '' }]);
  const removeAttendee = (i: number) => setAttendees((a) => a.filter((_, idx) => idx !== i));
  const updateAttendee = (i: number, field: keyof Attendee, value: string) =>
    setAttendees((a) => a.map((att, idx) => (idx === i ? { ...att, [field]: value } : att)));

  const handleCreateAndRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setTitleError(true); return; }
    setTitleError(false);
    try {
      const meeting = await createMeeting.mutateAsync({
        title: title.trim(),
        metAt: new Date(metAt).toISOString(),
        attendees: attendees.filter((a) => a.name.trim()),
        agenda: agenda || undefined,
      });
      setMeetingId(meeting.id);
      setShowConsent(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      alert(msg ?? '회의 생성에 실패했습니다.');
    }
  };

  const handleConsentAccept = async () => {
    setShowConsent(false);
    setStep('record');
    await recorder.startRecording();
    // 마이크 오류 시 recorder.error가 설정됨 — 'record' step의 error UI에서 파일 업로드 제공
  };

  const handleStopAndUpload = async () => {
    const blob = await recorder.stopRecording();
    if (!blob || !meetingId) return;

    setStep('upload');
    setUploadError('');

    try {
      const mimeType = blob.type || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const { uploadUrl, fileKey } = await getUploadUrl.mutateAsync({
        filename: `recording.${ext}`,
        contentType: mimeType,
        fileSize: blob.size,
      });

      await upload(uploadUrl, blob, mimeType);
      await transcribe.mutateAsync(fileKey);
      navigate(`/meeting/${meetingId}/processing`);
    } catch {
      setUploadError('업로드에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setStep('upload');

    try {
      // meetingId가 없으면 먼저 미팅 생성
      let currentMeetingId = meetingId;
      if (!currentMeetingId) {
        const meeting = await createMeeting.mutateAsync({
          title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
          metAt: new Date(metAt).toISOString(),
          attendees: attendees.filter((a) => a.name.trim()),
          agenda: agenda || undefined,
        });
        currentMeetingId = meeting.id;
        setMeetingId(currentMeetingId);
      }

      const uploadResp = await meetingsApi.getUploadUrl(currentMeetingId, {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });
      const { uploadUrl, fileKey } = uploadResp.data.data;

      await upload(uploadUrl, file, file.type);
      await meetingsApi.transcribe(currentMeetingId, fileKey);
      navigate(`/meeting/${currentMeetingId}/processing`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      setUploadError(msg || '파일 업로드에 실패했습니다.');
      setStep('form');
    }
  };

  if (step === 'upload') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <div className="text-4xl mb-4">⏫</div>
          <h2 className="text-lg font-semibold mb-2">업로드 중...</h2>
          <p className="text-sm text-gray-500 mb-4">잠시만 기다려주세요.</p>
          {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
        </div>
      </div>
    );
  }

  if (step === 'record') {
    // 마이크 오류 발생 시 파일 업로드로 대체 안내
    if (recorder.error) {
      return (
        <div className="p-6 max-w-lg mx-auto">
          <div className="bg-white rounded-xl border border-border p-8 text-center">
            <div className="text-4xl mb-4">🎙️</div>
            <h2 className="text-lg font-semibold mb-2 text-destructive">마이크 접근 오류</h2>
            <p className="text-sm text-gray-600 mb-6">{recorder.error}</p>
            <div className="space-y-3">
              <label className="block">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                  📁 음성 파일 직접 업로드
                </span>
              </label>
              <button
                onClick={() => { recorder.reset(); setStep('form'); }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-border p-8">
          <h2 className="text-lg font-semibold mb-6 text-center">회의 녹음 중</h2>

          <div className="flex justify-center mb-4">
            <RecordingTimer duration={recorder.duration} />
          </div>

          <Waveform analyserNode={recorder.analyserNode} isRecording={recorder.state === 'recording'} />

          <div className="flex justify-center mt-6">
            <RecordButton
              state={recorder.state}
              onStart={() => {}}
              onPause={recorder.pauseRecording}
              onResume={recorder.resumeRecording}
              onStop={handleStopAndUpload}
            />
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            최대 4시간 녹음 가능 • 정지 후 자동 업로드됩니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showConsent && (
        <ConsentModal
          onAccept={handleConsentAccept}
          onCancel={() => setShowConsent(false)}
        />
      )}

      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">새 회의</h1>

        <form onSubmit={handleCreateAndRecord} className="space-y-6">
          <div className="bg-white rounded-xl border border-border p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">회의 제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(false); }}
                maxLength={300}
                className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${titleError ? 'border-red-400 ring-1 ring-red-300' : 'border-border'}`}
                placeholder="주간 개발 회의"
              />
              {titleError && <p className="text-xs text-red-500 mt-1">회의 제목을 입력해주세요.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">회의 일시 *</label>
              <input
                type="datetime-local"
                value={metAt}
                onChange={(e) => setMetAt(e.target.value)}
                required
                className="border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">안건 (선택)</label>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                maxLength={2000}
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="스프린트 리뷰, 다음 스프린트 계획..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">참석자 (선택)</label>
              <div className="space-y-2">
                {attendees.map((att, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={att.name}
                      onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                      placeholder="이름"
                      className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <input
                      type="text"
                      value={att.role ?? ''}
                      onChange={(e) => updateAttendee(i, 'role', e.target.value)}
                      placeholder="역할"
                      className="w-28 border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {attendees.length > 1 && (
                      <button type="button" onClick={() => removeAttendee(i)} className="p-1.5 text-gray-300 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addAttendee} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80">
                  <Plus className="w-4 h-4" />
                  참석자 추가
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMeeting.isPending}
              className="flex-1 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              🎙 녹음 시작
            </button>

            <label className="flex-1">
              <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
              <span className="flex items-center justify-center gap-2 py-3 border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                파일 업로드
              </span>
            </label>
          </div>
        </form>
      </div>
    </>
  );
}
