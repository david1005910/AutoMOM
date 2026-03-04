import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { MeetingStatus, Prisma } from '@prisma/client';
import { MeetingService } from '../services/meetingService';
import { StorageService } from '../services/storageService';
import { transcribeQueue } from '../workers/queues';
import { sttLimiter } from '../middleware/rateLimiter';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/apiError';

const router = Router();
const meetingService = new MeetingService();
const storageService = new StorageService();

const CreateMeetingSchema = z.object({
  title: z.string().min(1).max(300),
  metAt: z.string().datetime(),
  attendees: z.array(z.object({
    name: z.string().min(1).max(100),
    role: z.string().max(100).optional(),
  })).max(50).optional(),
  agenda: z.string().max(2000).optional(),
});

const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  metAt: z.string().datetime().optional(),
  attendees: z.array(z.object({
    name: z.string().min(1).max(100),
    role: z.string().max(100).optional(),
  })).max(50).optional(),
  agenda: z.string().max(2000).optional(),
  minutes: z.record(z.unknown()).optional(),
}).strict();

const UploadRequestSchema = z.object({
  filename: z.string().min(1),
  // codecs 파라미터 포함 허용 (예: audio/webm;codecs=opus)
  contentType: z.string().refine(
    (v) => ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/webm', 'video/mp4'].some(
      (allowed) => v === allowed || v.startsWith(allowed + ';')
    ),
    { message: '지원하지 않는 오디오 형식입니다.' }
  ),
  fileSize: z.number().max(500 * 1024 * 1024, '파일 크기는 500MB를 초과할 수 없습니다.'),
});

const TranscribeSchema = z.object({ fileKey: z.string().min(1) });

const ExportSchema = z.object({ format: z.enum(['pdf', 'docx', 'md']) });

const ShareSchema = z.object({ expiresIn: z.enum(['7d', '30d', 'never']) });

// POST /api/meetings
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = CreateMeetingSchema.parse(req.body);
    const meeting = await meetingService.createMeeting({ ...body, userId: req.user!.id });
    res.status(201).json({ data: { meeting } });
  } catch (error) {
    next(error);
  }
});

// GET /api/meetings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, search, from, to, status } = req.query;
    const result = await meetingService.listMeetings({
      userId: req.user!.id,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      status: status as MeetingStatus | undefined,
    });
    res.json({ data: result.meetings, meta: result.meta });
  } catch (error) {
    next(error);
  }
});

// GET /api/meetings/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id, req.user!.id);
    res.json({ data: { meeting } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/meetings/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = UpdateMeetingSchema.parse(req.body);
    const meeting = await meetingService.updateMeeting(
      req.params.id,
      req.user!.id,
      body as Prisma.MeetingUpdateInput
    );
    res.json({ data: { meeting } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/meetings/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileKey = await meetingService.deleteMeeting(req.params.id, req.user!.id);
    if (fileKey) {
      storageService.deleteFile(fileKey).catch(() => {});
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/upload
router.post('/:id/upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await meetingService.getMeetingById(req.params.id, req.user!.id);
    const body = UploadRequestSchema.parse(req.body);

    const ext = body.filename.split('.').pop() ?? 'webm';
    const fileKey = `audio/${req.user!.id}/${req.params.id}/${Date.now()}.${ext}`;

    const uploadUrl = await storageService.generateUploadUrl(fileKey, body.contentType);
    res.json({ data: { uploadUrl, fileKey } });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/transcribe
router.post('/:id/transcribe', sttLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id, req.user!.id);
    const { fileKey } = TranscribeSchema.parse(req.body);

    if (meeting.status === MeetingStatus.processing) {
      throw new ApiError(409, 'ALREADY_PROCESSING', '이미 처리 중인 회의입니다.', false);
    }

    await prisma.meeting.update({
      where: { id: req.params.id },
      data: { fileKey, status: MeetingStatus.pending },
    });

    await transcribeQueue.add(
      { meetingId: req.params.id, fileKey, userId: req.user!.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 100 }
    );

    res.json({ data: { message: 'STT 처리가 시작되었습니다.' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/export
router.post('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id, req.user!.id);
    const { format } = ExportSchema.parse(req.body);

    if (meeting.status !== MeetingStatus.done || !meeting.minutes) {
      throw new ApiError(422, 'NOT_READY', '회의록 생성이 완료되지 않았습니다.', false);
    }

    const { ExportService } = await import('../services/exportService');
    const exportService = new ExportService();
    const { downloadUrl } = await exportService.export(meeting, format);

    res.json({ data: { downloadUrl } });
  } catch (error) {
    next(error);
  }
});

// POST /api/meetings/:id/share
router.post('/:id/share', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await meetingService.getMeetingById(req.params.id, req.user!.id);
    const { expiresIn } = ShareSchema.parse(req.body);

    const token = crypto.randomBytes(32).toString('hex');
    let expiresAt: Date | null = null;
    if (expiresIn === '7d') expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (expiresIn === '30d') expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.meeting.update({
      where: { id: req.params.id },
      data: { shareToken: token, shareExpiresAt: expiresAt },
    });

    res.json({ data: { shareToken: token, shareUrl: `/shared/${token}` } });
  } catch (error) {
    next(error);
  }
});

export default router;
