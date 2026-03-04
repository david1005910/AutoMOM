import { MeetingStatus } from '@prisma/client';
import { summarizeQueue } from './queues';
import { AiService } from '../services/aiService';
import { prisma } from '../prisma/client';
import { emitProgress, emitReady, emitError } from '../socket/meetingSocket';
import { logger } from '../utils/logger';

const aiService = new AiService();

summarizeQueue.process(async (job) => {
  const { meetingId, transcript, meetingMeta } = job.data as {
    meetingId: string;
    transcript: string;
    meetingMeta: {
      title?: string;
      attendees?: { name: string; role?: string }[];
      agenda?: string;
      metAt?: string;
    };
  };

  try {
    emitProgress(meetingId, 'summarizing', 10);
    logger.info(`[${meetingId}] AI 회의록 생성 시작`);

    const minutes = await aiService.generateMinutes(transcript, {
      ...meetingMeta,
      metAt: meetingMeta.metAt ? new Date(meetingMeta.metAt).toISOString() : undefined,
    });

    emitProgress(meetingId, 'summarizing', 90);

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { minutes: minutes as object, status: MeetingStatus.done },
    });

    emitReady(meetingId);
    logger.info(`[${meetingId}] 회의록 생성 완료`);
  } catch (error) {
    logger.error(`[${meetingId}] AI 요약 실패:`, error);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.failed },
    });
    emitError(meetingId, 'AI 회의록 생성 중 오류가 발생했습니다.', true);
    throw error;
  }
});

summarizeQueue.on('failed', (job, err) => {
  logger.error(`[summarizeQueue] Job ${job.id} 최종 실패:`, err);
});
