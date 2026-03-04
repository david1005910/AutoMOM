import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Share2, ArrowLeft, Loader2, AlertCircle, Check } from 'lucide-react';
import { useMeeting } from '@/hooks/useMeeting';
import { MinutesViewer } from '@/components/meeting/MinutesViewer';
import { meetingsApi } from '@/api/meetings';
import type { MinutesJSON } from '@/types/meeting';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: meeting, isLoading, error } = useMeeting(id!);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const handleExport = async (format: 'pdf' | 'docx' | 'md') => {
    if (!id) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const res = await meetingsApi.export(id, format);
      window.open(res.data.data.downloadUrl, '_blank');
    } catch {
      alert('내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    try {
      const res = await meetingsApi.share(id, '7d');
      const url = `${window.location.origin}/shared/${res.data.data.shareToken}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('공유 링크 생성에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <p className="text-gray-500">회의를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const minutes = meeting.minutes as MinutesJSON | null;

  const dateStr = new Date(meeting.metAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  });

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{meeting.title}</h1>
            <p className="text-xs text-gray-400">{dateStr}</p>
          </div>

          {meeting.status === 'done' && (
            <div className="flex items-center gap-2 shrink-0">
              {/* 내보내기 드롭다운 */}
              <div className="relative">
                <button
                  onClick={() => setExportOpen((v) => !v)}
                  disabled={exporting}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {exporting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />}
                  내보내기
                </button>
                {exportOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1.5 z-20 min-w-28">
                      {(['md', 'pdf', 'docx'] as const).map((fmt) => (
                        <button
                          key={fmt}
                          onClick={() => handleExport(fmt)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 공유 */}
              <button
                onClick={handleShare}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  copied
                    ? 'bg-emerald-500 text-white border border-emerald-500'
                    : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? '복사됨' : '공유'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 본문 */}
      {meeting.status !== 'done' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          {meeting.status === 'processing' ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-gray-500 text-sm">회의록을 생성하고 있습니다...</p>
            </>
          ) : meeting.status === 'failed' ? (
            <>
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
              <p className="text-gray-500 text-sm">처리에 실패했습니다. 파일을 다시 업로드해주세요.</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">음성 파일을 업로드하면 회의록이 자동 생성됩니다.</p>
          )}
        </div>
      ) : minutes ? (
        <MinutesViewer minutes={minutes} transcript={meeting.transcriptRaw} />
      ) : null}
    </div>
  );
}
