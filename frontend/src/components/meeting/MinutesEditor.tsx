import React, { useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import type { MinutesJSON } from '@/types/meeting';
import { ActionItemList } from './ActionItemList';
import { TranscriptViewer } from './TranscriptViewer';
import { useUpdateMeeting } from '@/hooks/useMeeting';

interface MinutesEditorProps {
  meetingId: string;
  minutes: MinutesJSON;
  transcript?: string | null;
}

function minutesToHtml(m: MinutesJSON): string {
  const lines: string[] = [
    `<h1>${m.title}</h1>`,
    `<p><strong>일시:</strong> ${m.date}${m.location ? ` | <strong>장소:</strong> ${m.location}` : ''}</p>`,
    `<h2>참석자</h2>`,
    `<ul>${m.attendees.map((a) => `<li>${a.name} (${a.role})</li>`).join('')}</ul>`,
    `<h2>안건</h2>`,
    `<ul>${m.agenda.map((a) => `<li>${a}</li>`).join('')}</ul>`,
    `<h2>논의 내용</h2>`,
    ...m.discussions.flatMap((d) => [
      `<h3>${d.topic}</h3>`,
      `<p>${d.summary}</p>`,
      `<ul>${d.key_points.map((p) => `<li>${p}</li>`).join('')}</ul>`,
    ]),
    `<h2>결정 사항</h2>`,
    `<ul>${m.decisions.map((d) => `<li>${d.item} (담당: ${d.owner})</li>`).join('')}</ul>`,
    `<h2>요약</h2>`,
    `<p>${m.summary}</p>`,
    m.next_meeting ? `<p><strong>다음 회의:</strong> ${m.next_meeting}</p>` : '',
  ];
  return lines.join('');
}

export function MinutesEditor({ meetingId, minutes, transcript }: MinutesEditorProps) {
  const update = useUpdateMeeting(meetingId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback((htmlContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      // 자동 저장 (HTML 콘텐츠를 minutes.summary에 반영 — MVP)
      update.mutate({ minutes: { ...minutes, summary: htmlContent } });
    }, 2000);
  }, [update, minutes]);

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, Bold, Heading.configure({ levels: [1, 2, 3] }), BulletList, ListItem],
    content: minutesToHtml(minutes),
    onUpdate: ({ editor }) => handleSave(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(minutesToHtml(minutes));
    }
  }, [minutes, editor]);

  return (
    <div className="space-y-6">
      <div className="prose prose-slate max-w-none border border-border rounded-lg p-6 bg-white min-h-96 focus-within:ring-2 focus-within:ring-primary/20">
        <EditorContent editor={editor} />
      </div>

      {minutes.action_items.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-3">액션 아이템</h3>
          <ActionItemList items={minutes.action_items} />
        </div>
      )}

      {transcript && <TranscriptViewer transcript={transcript} />}
    </div>
  );
}
