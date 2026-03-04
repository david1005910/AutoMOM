import React from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Mic } from 'lucide-react';
import { useSharedMeeting } from '@/hooks/useMeeting';
import { ActionItemList } from '@/components/meeting/ActionItemList';
import { TranscriptViewer } from '@/components/meeting/TranscriptViewer';
import type { MinutesJSON } from '@/types/meeting';

export function SharedMeetingPage() {
  const { token } = useParams<{ token: string }>();
  const { data: meeting, isLoading, error } = useSharedMeeting(token!);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-gray-500">공유 링크가 만료되었거나 유효하지 않습니다.</p>
        </div>
      </div>
    );
  }

  const minutes = meeting.minutes as MinutesJSON | null;

  return (
    <div className="min-h-screen bg-muted">
      <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-2">
        <Mic className="w-5 h-5 text-primary" />
        <span className="font-bold text-primary">AutoMOM</span>
        <span className="text-gray-300 mx-2">|</span>
        <span className="text-sm text-gray-500">공유된 회의록</span>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h1 className="text-2xl font-bold mb-1">{meeting.title}</h1>
          <p className="text-gray-500 text-sm">
            {new Date(meeting.metAt).toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })}
          </p>
        </div>

        {minutes && (
          <div className="space-y-6">
            <Section title="요약">
              <p className="text-sm text-gray-700 leading-relaxed">{minutes.summary}</p>
            </Section>

            <Section title="참석자">
              <div className="flex flex-wrap gap-2">
                {minutes.attendees.map((a, i) => (
                  <span key={i} className="px-3 py-1 bg-secondary rounded-full text-sm">
                    {a.name}{a.role && ` · ${a.role}`}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="안건">
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                {minutes.agenda.map((a, i) => <li key={i}>{a}</li>)}
              </ol>
            </Section>

            <Section title="논의 내용">
              <div className="space-y-4">
                {minutes.discussions.map((d, i) => (
                  <div key={i}>
                    <h4 className="font-medium text-sm mb-1">{d.topic}</h4>
                    <p className="text-sm text-gray-600 mb-2">{d.summary}</p>
                    <ul className="list-disc list-inside text-sm text-gray-500 space-y-0.5">
                      {d.key_points.map((p, j) => <li key={j}>{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="결정 사항">
              <ul className="space-y-1 text-sm text-gray-700">
                {minutes.decisions.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">✓</span>
                    <span>{d.item} <span className="text-gray-400">(담당: {d.owner})</span></span>
                  </li>
                ))}
              </ul>
            </Section>

            <Section title="액션 아이템">
              <ActionItemList items={minutes.action_items} />
            </Section>

            {minutes.next_meeting && (
              <Section title="다음 회의">
                <p className="text-sm text-gray-700">{minutes.next_meeting}</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
