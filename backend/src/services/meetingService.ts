import { MeetingStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/apiError';

export interface CreateMeetingInput {
  userId: string;
  title: string;
  metAt: string;
  attendees?: { name: string; role?: string }[];
  agenda?: string;
}

export interface ListMeetingsInput {
  userId: string;
  page?: number;
  limit?: number;
  search?: string;
  from?: string;
  to?: string;
  status?: MeetingStatus;
}

export class MeetingService {
  async createMeeting(input: CreateMeetingInput) {
    const user = await prisma.user.findUnique({ where: { id: input.userId } });
    if (user?.plan === 'free') {
      const count = await this.getMonthlyCount(input.userId);
      if (count >= 5) throw ApiError.planLimitExceeded();
    }

    return prisma.meeting.create({
      data: {
        userId: input.userId,
        title: input.title,
        metAt: new Date(input.metAt),
        attendees: (input.attendees ?? []) as Prisma.InputJsonValue,
        agenda: input.agenda,
        status: MeetingStatus.pending,
      },
      select: { id: true, title: true, metAt: true, status: true, createdAt: true },
    });
  }

  async listMeetings(input: ListMeetingsInput) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.MeetingWhereInput = { userId: input.userId };

    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: 'insensitive' } },
        { agenda: { contains: input.search, mode: 'insensitive' } },
      ];
    }

    if (input.from || input.to) {
      where.metAt = {};
      if (input.from) where.metAt.gte = new Date(input.from);
      if (input.to) where.metAt.lte = new Date(input.to);
    }

    if (input.status) where.status = input.status;

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, title: true, metAt: true, status: true,
          attendees: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.meeting.count({ where }),
    ]);

    return { meetings, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getMeetingById(id: string, userId: string) {
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) throw ApiError.notFound('회의');
    if (meeting.userId !== userId) throw ApiError.forbidden();
    return meeting;
  }

  async updateMeeting(id: string, userId: string, data: Prisma.MeetingUpdateInput) {
    await this.getMeetingById(id, userId);
    return prisma.meeting.update({ where: { id }, data });
  }

  async deleteMeeting(id: string, userId: string) {
    const meeting = await this.getMeetingById(id, userId);
    await prisma.meeting.delete({ where: { id } });
    return meeting.fileKey;
  }

  async getMeetingByShareToken(token: string) {
    const meeting = await prisma.meeting.findUnique({
      where: { shareToken: token },
      select: {
        id: true, title: true, metAt: true, status: true,
        minutes: true, attendees: true, agenda: true,
        shareExpiresAt: true,
      },
    });
    if (!meeting) throw ApiError.notFound('공유 회의록');
    if (meeting.shareExpiresAt && meeting.shareExpiresAt < new Date()) {
      throw new ApiError(410, 'SHARE_EXPIRED', '공유 링크가 만료되었습니다.', false);
    }
    return meeting;
  }

  private async getMonthlyCount(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return prisma.meeting.count({
      where: { userId, createdAt: { gte: startOfMonth } },
    });
  }
}
