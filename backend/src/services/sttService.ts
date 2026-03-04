import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import { createReadStream, statSync } from 'fs';
import * as tmp from 'tmp-promise';
import { config } from '../config';
import { logger } from '../utils/logger';

const MAX_CHUNK_BYTES = 24 * 1024 * 1024; // 24MB

interface TranscriptChunk {
  text: string;
  offset: number; // 초 단위
}

function isMockMode(): boolean {
  return config.OPENAI_API_KEY.startsWith('sk-placeholder');
}

export class SttService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  }

  async transcribe(
    filePath: string,
    onChunkComplete?: (completed: number, total: number) => void
  ): Promise<string> {
    if (isMockMode()) {
      logger.info('[SttService] Mock 모드 — 가짜 전사 결과 반환 (OPENAI_API_KEY 미설정)');
      await new Promise((r) => setTimeout(r, 1500));
      return '[00:00] 안녕하세요. 오늘 회의를 시작하겠습니다.\n[00:10] 첫 번째 안건으로 프로젝트 진행 현황을 공유하겠습니다.\n[00:30] 현재 개발 진행률은 약 70%이며, 다음 주 배포를 목표로 하고 있습니다.\n[01:00] 두 번째 안건으로 팀 일정을 조율하겠습니다.\n[01:20] 다음 회의는 2주 후로 잡겠습니다.\n[01:30] 이상으로 회의를 마치겠습니다.';
    }

    const fileSize = statSync(filePath).size;

    if (fileSize <= MAX_CHUNK_BYTES) {
      return this.transcribeFile(filePath, 0);
    }

    logger.info(`파일 크기 ${fileSize}바이트 — 청크 분할 처리`);
    return this.transcribeInChunks(filePath, onChunkComplete);
  }

  private async transcribeFile(filePath: string, offsetSeconds: number): Promise<string> {
    const response = await this.openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model: 'whisper-1',
      language: 'ko',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const result = response as unknown as {
      text: string;
      segments?: { start: number; end: number; text: string }[];
    };

    if (result.segments && offsetSeconds > 0) {
      return result.segments
        .map((s) => `[${this.formatTime(s.start + offsetSeconds)}] ${s.text.trim()}`)
        .join('\n');
    }

    return result.text;
  }

  private async transcribeInChunks(
    filePath: string,
    onChunkComplete?: (completed: number, total: number) => void
  ): Promise<string> {
    const chunkDuration = 600; // 10분 청크
    const chunks = await this.splitAudio(filePath, chunkDuration);
    const total = chunks.length;
    let completed = 0;

    logger.info(`[SttService] ${total}개 청크 병렬 전사 시작`);

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const text = await this.transcribeFile(chunk.path, chunk.offset);
        completed++;
        onChunkComplete?.(completed, total);
        logger.info(`[SttService] 청크 완료 ${completed}/${total}`);
        return text;
      })
    );

    await Promise.all(chunks.map((c) => c.cleanup()));
    return results.join('\n');
  }

  // 청크 분할을 병렬로 처리 (기존 순차 → 병렬)
  private splitAudio(
    filePath: string,
    chunkDuration: number
  ): Promise<{ path: string; offset: number; cleanup: () => Promise<void> }[]> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);

        const totalDuration = metadata.format.duration ?? 0;
        const offsets: number[] = [];
        for (let offset = 0; offset < totalDuration; offset += chunkDuration) {
          offsets.push(offset);
        }

        logger.info(`[SttService] ${offsets.length}개 청크 병렬 분할 시작 (총 ${Math.round(totalDuration)}초)`);

        // 순차 for-await 제거 → Promise.all 병렬 처리
        Promise.all(
          offsets.map(async (offset) => {
            const tmpFile = await tmp.file({ postfix: '.webm' });

            await new Promise<void>((res, rej) => {
              ffmpeg(filePath)
                .setStartTime(offset)
                .setDuration(Math.min(chunkDuration, totalDuration - offset))
                .output(tmpFile.path)
                .on('end', () => res())
                .on('error', rej)
                .run();
            });

            return {
              path: tmpFile.path,
              offset,
              cleanup: () => tmpFile.cleanup(),
            };
          })
        )
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
}
