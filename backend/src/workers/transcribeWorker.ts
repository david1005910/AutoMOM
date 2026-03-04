import * as tmp from 'tmp-promise';
import { MeetingStatus } from '@prisma/client';
import { transcribeQueue, summarizeQueue } from './queues';
import { SttService } from '../services/sttService';
import { StorageService } from '../services/storageService';
import { prisma } from '../prisma/client';
import { emitProgress, emitError } from '../socket/meetingSocket';
import { logger } from '../utils/logger';

const sttService = new SttService();
const storageService = new StorageService();

transcribeQueue.process(async (job) => {
  const { meetingId, fileKey, userId } = job.data as {
    meetingId: string;
    fileKey: string;
    userId: string;
  };

  const tmpFile = await tmp.file({ postfix: '.webm' });

  try {
    // 1. 상태 업데이트
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.processing },
    });

    // 2. S3 다운로드
    emitProgress(meetingId, 'downloading', 10);
    await storageService.downloadFile(fileKey, tmpFile.path);
    logger.info(`[${meetingId}] S3 다운로드 완료`);

    // 3. STT 처리 (청크별 진행률 업데이트: 30%→80%)
    emitProgress(meetingId, 'transcribing', 30);
    const transcript = await sttService.transcribe(tmpFile.path, (done, total) => {
      const pct = 30 + Math.round((done / total) * 50);
      emitProgress(meetingId, 'transcribing', pct);
    });
    logger.info(`[${meetingId}] STT 완료 — ${transcript.length}자`);

    // 4. DB 저장
    emitProgress(meetingId, 'transcribing', 85);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { transcriptRaw: transcript },
    });

    // 5. 요약 Job 등록
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      select: { title: true, attendees: true, agenda: true, metAt: true },
    });

    await summarizeQueue.add({ meetingId, transcript, meetingMeta: meeting });
    emitProgress(meetingId, 'transcribing', 100);
    logger.info(`[${meetingId}] STT 완료 → 요약 큐 등록`);
  } catch (error) {
    logger.error(`[${meetingId}] STT 실패:`, error);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.failed },
    });
    emitError(meetingId, 'STT 처리 중 오류가 발생했습니다.', true);
    throw error;
  } finally {
    await tmpFile.cleanup();
  }
});

transcribeQueue.on('failed', (job, err) => {
  logger.error(`[transcribeQueue] Job ${job.id} 최종 실패:`, err);
});
