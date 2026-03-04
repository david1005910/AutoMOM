import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Test1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'test@automom.app' },
    update: {},
    create: {
      email: 'test@automom.app',
      name: '테스트 사용자',
      passwordHash,
      provider: 'email',
      plan: 'free',
    },
  });

  await prisma.meeting.upsert({
    where: { id: 'seed-meeting-01' },
    update: {},
    create: {
      id: 'seed-meeting-01',
      userId: user.id,
      title: '주간 개발 회의 (샘플)',
      metAt: new Date('2025-01-15T14:00:00Z'),
      status: 'done',
      attendees: [{ name: '홍길동', role: '팀장' }, { name: '김철수', role: '개발자' }],
      agenda: '스프린트 리뷰, 다음 스프린트 계획',
      transcriptRaw: '홍길동: 안녕하세요. 오늘 주간 회의를 시작하겠습니다...',
      minutes: {
        title: '주간 개발 회의',
        date: '2025-01-15',
        location: null,
        attendees: [{ name: '홍길동', role: '팀장' }, { name: '김철수', role: '개발자' }],
        agenda: ['스프린트 리뷰', '다음 스프린트 계획'],
        discussions: [{ topic: '스프린트 리뷰', summary: '이번 스프린트 목표 달성률 85%', key_points: ['주요 기능 완료', '버그 3건 수정'] }],
        decisions: [{ item: '다음 스프린트 시작일 확정', owner: '홍길동' }],
        action_items: [{ task: 'API 문서 업데이트', owner: '김철수', due_date: '2025-01-20', priority: 'high' }],
        next_meeting: '2025-01-22 14:00',
        summary: '이번 스프린트를 성공적으로 마무리하고 다음 스프린트를 준비하는 회의였습니다.',
      },
    },
  });

  console.log('시드 데이터 생성 완료:', user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
