import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { initMeetingSocket } from './meetingSocket';
import { logger } from '../utils/logger';

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

  // JWT 인증 미들웨어
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('UNAUTHORIZED'));

      const publicKey = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as {
        sub: string;
        email: string;
      };

      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket 연결: ${socket.data.userId}`);

    socket.on('meeting:subscribe', ({ meetingId }: { meetingId: string }) => {
      socket.join(`meeting:${meetingId}`);
      logger.debug(`Socket Room 입장: meeting:${meetingId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket 연결 해제: ${socket.data.userId}`);
    });
  });

  initMeetingSocket(io);
  return io;
}
