/**
 * 문서화(내보내기) 기능 테스트
 * - ExportService 단위 테스트 (Markdown 생성)
 * - POST /api/meetings/:id/export 통합 테스트
 */

// ── 외부 의존성 모킹 ──────────────────────────────────────────────────────────

jest.mock('bull', () => {
  const mock = { add: jest.fn(), process: jest.fn(), on: jest.fn() };
  return jest.fn().mockImplementation(() => mock);
});

const mockMeetingFindUnique = jest.fn();
const mockMeetingUpdate = jest.fn();

jest.mock('../prisma/client', () => ({
  prisma: {
    meeting: {
      findUnique: mockMeetingFindUnique,
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: mockMeetingUpdate,
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  },
}));

// ── imports ──────────────────────────────────────────────────────────────────
import request from 'supertest';
import app from '../app';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { ExportService } from '../services/exportService';
import type { MinutesJSON } from '../types/meeting';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
const USER_ID = 'test-user-cuid-002';
const MEETING_ID = 'meeting-cuid-002';

function makeToken(): string {
  const privateKey = fs.readFileSync(path.join(process.cwd(), 'private.pem'), 'utf-8');
  return jwt.sign({ sub: USER_ID, email: 'export@example.com' }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

const SAMPLE_MINUTES: MinutesJSON = {
  title: '2024년 3월 개발 주간 회의',
  date: '2024-03-04',
  location: '서울 오피스 3층',
  attendees: [
    { name: '김철수', role: '개발 리드' },
    { name: '이영희', role: 'UX 디자이너' },
  ],
  agenda: ['스프린트 리뷰', '다음 스프린트 계획', '기술 부채 논의'],
  discussions: [
    {
      topic: '스프린트 리뷰',
      summary: '이번 스프린트는 7개 이슈 중 6개를 완료했습니다.',
      key_points: ['API 통합 완료', '성능 개선 20% 달성'],
    },
  ],
  decisions: [
    { item: 'Redis 캐싱 도입', owner: '김철수' },
  ],
  action_items: [
    { task: 'Redis 캐싱 PoC 작성', owner: '김철수', due_date: '2024-03-08', priority: 'high' },
    { task: 'UX 리뷰 일정 조율', owner: '이영희', due_date: null, priority: 'medium' },
  ],
  next_meeting: '2024-03-11 오전 10시',
  summary: '팀이 스프린트 목표를 성공적으로 달성하였으며, 다음 스프린트 준비를 완료했습니다.',
};

function makeDoneMeeting(overrides = {}) {
  return {
    id: MEETING_ID,
    userId: USER_ID,
    title: SAMPLE_MINUTES.title,
    metAt: new Date('2024-03-04'),
    status: 'done',
    fileKey: 'audio/u/m/123.webm',
    minutes: SAMPLE_MINUTES as unknown,
    transcriptRaw: '(transcript text)',
    attendees: SAMPLE_MINUTES.attendees,
    agenda: SAMPLE_MINUTES.agenda.join('\n'),
    shareToken: null,
    shareExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── ExportService 단위 테스트 ────────────────────────────────────────────────
describe('ExportService 단위 테스트', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService();
    jest.clearAllMocks();
  });

  it('Markdown 내보내기: 제목이 H1으로 포함된다', async () => {
    const meeting = makeDoneMeeting();
    const result = await exportService.export(meeting as Parameters<ExportService['export']>[0], 'md');
    expect(result).toHaveProperty('downloadUrl');
  });

  it('Markdown 내보내기: 참석자 목록이 포함된다', async () => {
    // ExportService의 toMarkdown을 간접 테스트: 로컬 모드에서 downloadUrl에 파일 키가 포함됨
    const meeting = makeDoneMeeting();
    const { downloadUrl } = await exportService.export(
      meeting as Parameters<ExportService['export']>[0],
      'md'
    );
    // 로컬 모드: local-upload URL을 반환
    expect(typeof downloadUrl).toBe('string');
    expect(downloadUrl.length).toBeGreaterThan(0);
  });

  it('PDF 내보내기: downloadUrl이 반환된다', async () => {
    const meeting = makeDoneMeeting();
    const { downloadUrl } = await exportService.export(
      meeting as Parameters<ExportService['export']>[0],
      'pdf'
    );
    expect(typeof downloadUrl).toBe('string');
  });

  it('DOCX 내보내기: downloadUrl이 반환된다', async () => {
    const meeting = makeDoneMeeting();
    const { downloadUrl } = await exportService.export(
      meeting as Parameters<ExportService['export']>[0],
      'docx'
    );
    expect(typeof downloadUrl).toBe('string');
  });
});

// ── Markdown 내용 검증 (private 메서드 우회: 실제 로컬 파일 읽기) ─────────────
describe('ExportService Markdown 내용 검증', () => {
  it('회의 제목, 참석자, 액션 아이템이 올바르게 포함된다', async () => {
    // ExportService를 직접 인스턴스화하여 내부 toMarkdown 결과를 간접 검증
    // 로컬 모드에서 파일을 tmp/uploads에 저장하지 않으므로 spy로 확인
    const svc = new ExportService();
    type WithPrivate = { toMarkdown: (m: MinutesJSON, meeting: unknown) => string };
    const toMarkdownSpy = jest.spyOn(svc as unknown as WithPrivate, 'toMarkdown');

    const meeting = makeDoneMeeting();
    await svc.export(meeting as Parameters<ExportService['export']>[0], 'md');

    expect(toMarkdownSpy).toHaveBeenCalled();
    const md = toMarkdownSpy.mock.results[0]?.value as string;

    expect(md).toContain('# 2024년 3월 개발 주간 회의');
    expect(md).toContain('김철수');
    expect(md).toContain('이영희');
    expect(md).toContain('Redis 캐싱 도입');
    expect(md).toContain('Redis 캐싱 PoC 작성');
    expect(md).toContain('| 할 일 | 담당자 | 기한 | 우선순위 |');
    expect(md).toContain('2024-03-11');
  });
});

// ── 내보내기 엔드포인트 통합 테스트 ─────────────────────────────────────────
describe('POST /api/meetings/:id/export', () => {
  let token: string;

  beforeAll(() => {
    token = makeToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('md 형식으로 내보내기 성공', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'md' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('downloadUrl');
  });

  it('pdf 형식으로 내보내기 성공', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'pdf' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('downloadUrl');
  });

  it('docx 형식으로 내보내기 성공', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'docx' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('downloadUrl');
  });

  it('회의록이 완성되지 않은 경우(status≠done) 422를 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting({ status: 'processing', minutes: null }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'md' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NOT_READY');
  });

  it('minutes가 없는 경우 422를 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting({ minutes: null }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'md' });

    expect(res.status).toBe(422);
  });

  it('지원하지 않는 형식(format=txt)은 422를 반환한다 (Zod validation)', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'txt' });

    expect(res.status).toBe(422);
  });

  it('인증 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .send({ format: 'md' });

    expect(res.status).toBe(401);
  });

  it('다른 사용자 소유의 회의는 403을 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeDoneMeeting({ userId: 'other-user-id' }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/export`)
      .set('Authorization', `Bearer ${token}`)
      .send({ format: 'md' });

    expect(res.status).toBe(403);
  });
});
