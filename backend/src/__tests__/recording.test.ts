/**
 * 녹음 기능 테스트
 * - POST /api/meetings/:id/upload  — 업로드 URL 발급
 * - POST /api/meetings/:id/transcribe — STT 큐 등록
 */

// ── 외부 의존성 모킹 (앱 import 전에 선언되어야 함) ──────────────────────────

// Bull: Redis 연결 방지
jest.mock('bull', () => {
  const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
  const mockProcess = jest.fn();
  const mockOn = jest.fn();
  return jest.fn().mockImplementation(() => ({ add: mockAdd, process: mockProcess, on: mockOn }));
});

// Prisma 클라이언트
const mockMeetingFindUnique = jest.fn();
const mockMeetingUpdate = jest.fn();
const mockMeetingCreate = jest.fn();
const mockUserFindUnique = jest.fn();

jest.mock('../prisma/client', () => ({
  prisma: {
    meeting: {
      findUnique: mockMeetingFindUnique,
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      create: mockMeetingCreate,
      update: mockMeetingUpdate,
      delete: jest.fn(),
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

// ── imports ──────────────────────────────────────────────────────────────────
import request from 'supertest';
import app from '../app';
import { transcribeQueue } from '../workers/queues';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// ── 헬퍼 ────────────────────────────────────────────────────────────────────
const USER_ID = 'test-user-cuid-001';
const MEETING_ID = 'meeting-cuid-001';

function makeToken(): string {
  const privateKey = fs.readFileSync(path.join(process.cwd(), 'private.pem'), 'utf-8');
  return jwt.sign({ sub: USER_ID, email: 'test@example.com' }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h',
  });
}

function makeMeeting(overrides = {}) {
  return {
    id: MEETING_ID,
    userId: USER_ID,
    title: '테스트 회의',
    metAt: new Date().toISOString(),
    status: 'pending',
    fileKey: null,
    minutes: null,
    transcriptRaw: null,
    attendees: [],
    agenda: null,
    shareToken: null,
    shareExpiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── 테스트 ───────────────────────────────────────────────────────────────────
describe('녹음 기능: POST /api/meetings/:id/upload', () => {
  let token: string;

  beforeAll(() => {
    token = makeToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('유효한 오디오 형식으로 업로드 URL을 발급한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'recording.webm', contentType: 'audio/webm', fileSize: 1024 * 1024 });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('uploadUrl');
    expect(res.body.data).toHaveProperty('fileKey');
    expect(res.body.data.fileKey).toMatch(/^audio\//);
  });

  it('codecs 파라미터 포함 Content-Type을 허용한다 (audio/webm;codecs=opus)', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'recording.webm',
        contentType: 'audio/webm;codecs=opus',
        fileSize: 5 * 1024 * 1024,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.uploadUrl).toContain('local-upload');
  });

  it('500MB를 초과하는 파일 크기는 거부한다 (422 Zod validation)', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'huge.webm',
        contentType: 'audio/webm',
        fileSize: 600 * 1024 * 1024, // 600MB
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('지원하지 않는 오디오 형식은 거부한다 (422 Zod validation)', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'recording.flac', contentType: 'audio/flac', fileSize: 1024 });

    expect(res.status).toBe(422);
  });

  it('존재하지 않는 회의 ID는 404를 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/meetings/nonexistent-id/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ filename: 'recording.webm', contentType: 'audio/webm', fileSize: 1024 });

    expect(res.status).toBe(404);
  });

  it('인증 토큰 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/upload`)
      .send({ filename: 'recording.webm', contentType: 'audio/webm', fileSize: 1024 });

    expect(res.status).toBe(401);
  });
});

describe('녹음 기능: POST /api/meetings/:id/transcribe', () => {
  let token: string;

  beforeAll(() => {
    token = makeToken();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('유효한 fileKey로 STT 큐에 작업을 등록한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting({ status: 'pending' }));
    mockMeetingUpdate.mockResolvedValue(makeMeeting({ status: 'pending', fileKey: 'audio/u/m/123.webm' }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fileKey: 'audio/u/m/123.webm' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toContain('STT');
    // Bull transcribeQueue.add가 호출되었는지 확인
    expect(transcribeQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ meetingId: MEETING_ID, fileKey: 'audio/u/m/123.webm' }),
      expect.any(Object)
    );
  });

  it('이미 처리 중인 회의는 409를 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting({ status: 'processing' }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fileKey: 'audio/u/m/123.webm' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_PROCESSING');
  });

  it('fileKey 없이 요청하면 422를 반환한다 (Zod validation)', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting());

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('다른 사용자 소유의 회의는 403을 반환한다', async () => {
    mockMeetingFindUnique.mockResolvedValue(makeMeeting({ userId: 'other-user-id' }));

    const res = await request(app)
      .post(`/api/meetings/${MEETING_ID}/transcribe`)
      .set('Authorization', `Bearer ${token}`)
      .send({ fileKey: 'audio/u/m/123.webm' });

    expect(res.status).toBe(403);
  });
});
