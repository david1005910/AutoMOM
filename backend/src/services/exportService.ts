import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { Meeting } from '@prisma/client';
import { MinutesJSON } from '../types/meeting';
import { StorageService } from './storageService';
import { logger } from '../utils/logger';

export class ExportService {
  private storage: StorageService;

  constructor() {
    this.storage = new StorageService();
  }

  async export(meeting: Meeting, format: 'pdf' | 'docx' | 'md'): Promise<{ downloadUrl: string }> {
    const minutes = meeting.minutes as unknown as MinutesJSON;

    let content: Buffer | string;
    let contentType: string;
    let ext: string;

    switch (format) {
      case 'md':
        content = this.toMarkdown(minutes, meeting);
        contentType = 'text/markdown';
        ext = 'md';
        break;
      case 'pdf':
        content = await this.toPdf(minutes, meeting);
        contentType = 'application/pdf';
        ext = 'pdf';
        break;
      case 'docx':
        content = await this.toDocx(minutes, meeting);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        ext = 'docx';
        break;
    }

    const fileKey = `exports/${meeting.userId}/${meeting.id}/${Date.now()}.${ext}`;

    // 로컬 모드: 파일을 직접 tmp/uploads에 저장
    const localPath = this.storage.getLocalPath(fileKey);
    const dir = path.dirname(localPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const fileBuffer: Buffer = Buffer.isBuffer(content) ? content : Buffer.from(content as string, 'utf-8');
    writeFileSync(localPath, fileBuffer);

    logger.info(`내보내기 완료: ${fileKey}`);
    const downloadUrl = await this.storage.generateDownloadUrl(fileKey).catch(() => `/api/exports/${fileKey}`);
    return { downloadUrl };
  }

  private toMarkdown(minutes: MinutesJSON, meeting: Meeting): string {
    const lines: string[] = [
      `# ${minutes.title}`,
      '',
      `**일시:** ${minutes.date}`,
      `**장소:** ${minutes.location ?? '미정'}`,
      '',
      '## 참석자',
      ...minutes.attendees.map((a) => `- ${a.name} (${a.role})`),
      '',
      '## 안건',
      ...minutes.agenda.map((a, i) => `${i + 1}. ${a}`),
      '',
      '## 논의 내용',
      ...minutes.discussions.flatMap((d) => [
        `### ${d.topic}`,
        d.summary,
        '',
        ...d.key_points.map((p) => `- ${p}`),
        '',
      ]),
      '## 결정 사항',
      ...minutes.decisions.map((d) => `- ${d.item} (담당: ${d.owner})`),
      '',
      '## 액션 아이템',
      '| 할 일 | 담당자 | 기한 | 우선순위 |',
      '|-------|--------|------|---------|',
      ...minutes.action_items.map(
        (a) => `| ${a.task} | ${a.owner} | ${a.due_date ?? '-'} | ${a.priority} |`
      ),
      '',
      `## 다음 회의: ${minutes.next_meeting ?? '미정'}`,
      '',
      '## 요약',
      minutes.summary,
    ];
    return lines.join('\n');
  }

  private async toPdf(minutes: MinutesJSON, meeting: Meeting): Promise<Buffer> {
    // jsPDF 또는 Puppeteer를 사용한 PDF 생성
    // MVP에서는 마크다운을 Buffer로 변환하여 반환 (실제 구현 시 교체)
    const markdown = this.toMarkdown(minutes, meeting);
    return Buffer.from(markdown, 'utf-8');
  }

  private async toDocx(minutes: MinutesJSON, meeting: Meeting): Promise<Buffer> {
    // docx 라이브러리를 사용한 Word 문서 생성
    // MVP에서는 마크다운을 Buffer로 변환하여 반환 (실제 구현 시 교체)
    const markdown = this.toMarkdown(minutes, meeting);
    return Buffer.from(markdown, 'utf-8');
  }
}
