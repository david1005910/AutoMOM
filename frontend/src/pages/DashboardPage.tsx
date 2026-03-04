import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useMeetings, useDeleteMeeting } from '@/hooks/useMeeting';
import type { Meeting, MeetingStatus } from '@/types/meeting';

const STATUS_CONFIG: Record<MeetingStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: '대기', icon: <Clock className="w-3 h-3" />, color: 'bg-gray-100 text-gray-600' },
  processing: { label: '처리 중', icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'bg-blue-100 text-blue-600' },
  done: { label: '완료', icon: <CheckCircle2 className="w-3 h-3" />, color: 'bg-green-100 text-green-600' },
  failed: { label: '실패', icon: <AlertCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-600' },
};

export function DashboardPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const deleteMeeting = useDeleteMeeting();

  const { data, isLoading } = useMeetings({ search: search || undefined, page, limit: 20 });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('이 회의를 삭제하시겠습니까?')) return;
    await deleteMeeting.mutateAsync(id);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">회의 목록</h1>
        <Link
          to="/meeting/new"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 회의
        </Link>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="회의 제목, 안건 검색..."
          className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !data?.data?.length ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">회의가 없습니다</p>
          <p className="text-sm mt-1">상단의 "새 회의" 버튼으로 시작해보세요.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.data.map((meeting: Meeting) => {
            const cfg = STATUS_CONFIG[meeting.status];
            return (
              <Link
                key={meeting.id}
                to={(meeting.status === 'processing' || meeting.status === 'failed') ? `/meeting/${meeting.id}/processing` : `/meeting/${meeting.id}`}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-border hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.icon}{cfg.label}
                    </span>
                  </div>
                  <h3 className="font-medium text-gray-900 truncate">{meeting.title}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(meeting.metAt).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                    })}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDelete(meeting.id, e)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0"
                >
                  삭제
                </button>
              </Link>
            );
          })}
        </div>
      )}

      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-3 py-1 text-sm border rounded disabled:opacity-40">
            이전
          </button>
          <span className="px-3 py-1 text-sm">{page} / {data.meta.totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages} className="px-3 py-1 text-sm border rounded disabled:opacity-40">
            다음
          </button>
        </div>
      )}
    </div>
  );
}
