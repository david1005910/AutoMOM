import http from 'http';
import app from './app';
import { config } from './config';
import { createSocketServer } from './socket';
import { logger } from './utils/logger';

const httpServer = http.createServer(app);
createSocketServer(httpServer);

httpServer.listen(config.PORT, () => {
  logger.info(`AutoMOM 서버 시작 — PORT ${config.PORT} / ${config.NODE_ENV}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});
