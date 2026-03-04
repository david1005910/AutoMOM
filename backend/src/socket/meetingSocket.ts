import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initMeetingSocket(socketServer: SocketServer) {
  io = socketServer;
}

export function emitProgress(meetingId: string, stage: string, percent: number) {
  io?.to(`meeting:${meetingId}`).emit('meeting:progress', { meetingId, stage, percent });
}

export function emitReady(meetingId: string) {
  io?.to(`meeting:${meetingId}`).emit('meeting:ready', { meetingId });
}

export function emitError(meetingId: string, error: string, retryable: boolean) {
  io?.to(`meeting:${meetingId}`).emit('meeting:error', { meetingId, error, retryable });
}
