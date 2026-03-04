import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { logger } from '../utils/logger';
import { MinutesSchema, MinutesJSON } from '../types/meeting';
import { MINUTES_SYSTEM_PROMPT, MAP_REDUCE_CHUNK_PROMPT } from '../constants/prompts';

const TOKEN_THRESHOLD = 30000;
// 한국어 평균 약 1.5자/토큰으로 추정
const CHARS_PER_TOKEN = 1.5;
const CHUNK_SIZE_CHARS = 5000 * CHARS_PER_TOKEN; // ~5000 토큰 청크

interface MeetingMeta {
  title?: string;
  attendees?: { name: string; role?: string }[];
  agenda?: string;
  metAt?: string;
}

function isMockMode(): boolean {
  return config.ANTHROPIC_API_KEY.startsWith('sk-ant-placeholder');
}

export class AiService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }

  async generateMinutes(transcript: string, meta: MeetingMeta): Promise<MinutesJSON> {
    if (isMockMode()) {
      logger.info('[AiService] Mock 모드 — 가짜 회의록 반환 (ANTHROPIC_API_KEY 미설정)');
      await new Promise((r) => setTimeout(r, 2000));
      const now = meta.metAt ? new Date(meta.metAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      return {
        title: meta.title ?? '회의',
        date: now,
        location: null,
        attendees: (meta.attendees ?? [{ name: '참석자', role: '' }]).map((a) => ({
          name: a.name,
          role: a.role ?? '',
        })),
        agenda: meta.agenda ? [meta.agenda] : ['프로젝트 진행 현황 공유', '팀 일정 조율'],
        discussions: [
          {
            topic: '프로젝트 진행 현황',
            summary: '현재 개발 진행률은 약 70%이며, 다음 주 배포를 목표로 하고 있습니다.',
            key_points: ['개발 진행률 70%', '다음 주 배포 목표', '주요 기능 완성'],
          },
          {
            topic: '팀 일정 조율',
            summary: '다음 회의 일정 및 개인 업무 일정을 조율했습니다.',
            key_points: ['다음 회의 2주 후 예정', '개인 업무 일정 공유'],
          },
        ],
        decisions: [
          { item: '다음 주 배포 진행', owner: meta.attendees?.[0]?.name ?? '팀 전체' },
        ],
        action_items: [
          {
            task: '배포 준비 완료',
            owner: meta.attendees?.[0]?.name ?? '담당자',
            due_date: now,
            priority: 'high',
          },
        ],
        next_meeting: null,
        summary: `${meta.title ?? '회의'}에서 프로젝트 진행 현황을 공유하고 팀 일정을 조율했습니다. (Mock 데이터 — 실제 API 키 설정 후 실제 회의록이 생성됩니다)`,
      };
    }

    const estimatedTokens = Math.ceil(transcript.length / CHARS_PER_TOKEN);
    logger.info(`회의록 생성 시작 — 추정 토큰: ${estimatedTokens}`);

    if (estimatedTokens < TOKEN_THRESHOLD) {
      return this.generateSingle(transcript, meta);
    }

    logger.info('Map-Reduce 모드로 전환');
    return this.generateMapReduce(transcript, meta);
  }

  private async generateSingle(transcript: string, meta: MeetingMeta): Promise<MinutesJSON> {
    const userMessage = this.buildUserMessage(transcript, meta);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          temperature: 0,
          system: MINUTES_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const parsed = JSON.parse(text.trim());
        return MinutesSchema.parse(parsed);
      } catch (error) {
        logger.warn(`회의록 생성 시도 ${attempt + 1} 실패:`, error);
        if (attempt < 2) await this.sleep(1000 * (attempt + 1));
      }
    }

    throw new Error('AI 회의록 생성에 3회 모두 실패했습니다.');
  }

  private async generateMapReduce(transcript: string, meta: MeetingMeta): Promise<MinutesJSON> {
    // Map: 청크별 중간 요약 병렬 생성
    const chunks = this.splitIntoChunks(transcript, CHUNK_SIZE_CHARS);
    logger.info(`Map 단계: ${chunks.length}개 청크 병렬 처리`);

    const chunkSummaries = await Promise.all(
      chunks.map((chunk, i) => this.summarizeChunk(chunk, i))
    );

    // Reduce: 중간 요약 합본으로 최종 회의록 생성
    const combinedSummary = JSON.stringify(chunkSummaries, null, 2);
    const reducePrompt = `다음은 긴 회의의 구간별 중간 요약입니다. 이를 종합하여 최종 회의록 JSON을 작성하세요:\n\n${combinedSummary}`;

    return this.generateSingle(reducePrompt, meta);
  }

  private async summarizeChunk(chunk: string, index: number): Promise<unknown> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0,
        system: MAP_REDUCE_CHUNK_PROMPT,
        messages: [{ role: 'user', content: `[구간 ${index + 1}]\n${chunk}` }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      return JSON.parse(text.trim());
    } catch {
      return { summary: `구간 ${index + 1} 처리 실패` };
    }
  }

  private buildUserMessage(transcript: string, meta: MeetingMeta): string {
    const attendeeStr = meta.attendees?.map((a) => `${a.name}(${a.role ?? ''})`).join(', ') ?? '불명';
    return `회의 정보:
- 제목: ${meta.title ?? '미정'}
- 일시: ${meta.metAt ?? '미정'}
- 예상 참석자: ${attendeeStr}
- 사전 안건: ${meta.agenda ?? '없음'}

전사 텍스트:
${transcript}`.trim();
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
