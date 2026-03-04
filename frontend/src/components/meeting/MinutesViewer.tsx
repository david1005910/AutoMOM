import React, { useState } from 'react';
import {
  Users, ListChecks, MessageSquare, CheckSquare,
  Zap, FileText, Calendar, MapPin, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { MinutesJSON, ActionItem } from '@/types/meeting';

const PRIORITY_CONFIG: Record<ActionItem['priority'], { label: string; cls: string }> = {
  high:   { label: '높음', cls: 'bg-red-100 text-red-700 border border-red-200' },
  medium: { label: '보통', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  low:    { label: '낮음', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50 bg-gray-50/60">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

interface Props {
  minutes: MinutesJSON;
  transcript?: string | null;
}

export function MinutesViewer({ minutes, transcript }: Props) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const toggleItem = (i: number) =>
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="space-y-4">

      {/* 요약 배너 */}
      <div className="bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/15 rounded-2xl px-6 py-5">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary/70 uppercase tracking-wide mb-1">회의 요약</p>
            <p className="text-sm text-gray-700 leading-relaxed">{minutes.summary}</p>
          </div>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">일시</p>
            <p className="text-sm font-medium text-gray-800">{minutes.date}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <MapPin className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">장소</p>
            <p className="text-sm font-medium text-gray-800">{minutes.location ?? '미정'}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">참석자</p>
            <p className="text-sm font-medium text-gray-800">{minutes.attendees.length}명</p>
          </div>
        </div>
      </div>

      {/* 참석자 */}
      <Section icon={<Users className="w-4 h-4" />} title="참석자">
        <div className="flex flex-wrap gap-2">
          {minutes.attendees.map((a, i) => (
            <span key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                {a.name.charAt(0).toUpperCase()}
              </span>
              <span className="font-medium text-gray-700">{a.name}</span>
              {a.role && <span className="text-gray-400 text-xs">· {a.role}</span>}
            </span>
          ))}
        </div>
      </Section>

      {/* 안건 */}
      {minutes.agenda.length > 0 && (
        <Section icon={<ListChecks className="w-4 h-4" />} title="안건">
          <ol className="space-y-2">
            {minutes.agenda.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700 pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* 논의 내용 */}
      {minutes.discussions.length > 0 && (
        <Section icon={<MessageSquare className="w-4 h-4" />} title="논의 내용">
          <div className="space-y-5">
            {minutes.discussions.map((d, i) => (
              <div key={i} className={i < minutes.discussions.length - 1 ? 'pb-5 border-b border-gray-50' : ''}>
                <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{d.topic}</h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{d.summary}</p>
                {d.key_points.length > 0 && (
                  <ul className="space-y-1.5">
                    {d.key_points.map((p, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 결정 사항 */}
      {minutes.decisions.length > 0 && (
        <Section icon={<CheckSquare className="w-4 h-4" />} title="결정 사항">
          <div className="space-y-2">
            {minutes.decisions.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{d.item}</p>
                  <p className="text-xs text-gray-500 mt-0.5">담당: {d.owner}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 액션 아이템 */}
      {minutes.action_items.length > 0 && (
        <Section icon={<Zap className="w-4 h-4" />} title="액션 아이템">
          <div className="space-y-2">
            {minutes.action_items.map((item, i) => {
              const done = checkedItems.has(i);
              const pc = PRIORITY_CONFIG[item.priority];
              return (
                <label
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    done ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggleItem(i)}
                    className="mt-0.5 rounded border-gray-300 text-primary accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.task}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">👤 {item.owner}</span>
                      {item.due_date && <span className="text-xs text-gray-400">📅 {item.due_date}</span>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${pc.cls}`}>
                    {pc.label}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>
      )}

      {/* 다음 회의 */}
      {minutes.next_meeting && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-6 py-4">
          <Calendar className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide">다음 회의</p>
            <p className="text-sm text-gray-700 mt-0.5">{minutes.next_meeting}</p>
          </div>
        </div>
      )}

      {/* 원문 전사 */}
      {transcript && (
        <div className="rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setTranscriptOpen((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-600 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              원문 전사 텍스트
            </span>
            {transcriptOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {transcriptOpen && (
            <div className="bg-white px-6 py-4 max-h-80 overflow-y-auto">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{transcript}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
