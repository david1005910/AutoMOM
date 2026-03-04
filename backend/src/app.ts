import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createWriteStream, mkdirSync, existsSync, createReadStream } from 'fs';
import path from 'path';
import { config } from './config';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { authenticate } from './middleware/authGuard';
import { logger } from './utils/logger';
import authRouter from './routes/auth';
import meetingsRouter from './routes/meetings';

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');
if (!existsSync(LOCAL_UPLOAD_DIR)) mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });

// Workers 등록 (앱 시작 시 큐 프로세서 활성화)
import './workers/transcribeWorker';
import './workers/summarizeWorker';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(cookieParser(config.COOKIE_SECRET));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));

app.use('/api', apiLimiter);

app.use('/api/auth', authRouter);
app.use('/api/meetings', authenticate, meetingsRouter);

// 로컬 개발용 파일 업로드/다운로드 (S3 대체)
app.put('/api/local-upload/:fileKey', (req, res) => {
  const fileKey = decodeURIComponent(req.params.fileKey);
  const safeName = fileKey.replace(/\//g, '_');
  const filePath = path.join(LOCAL_UPLOAD_DIR, safeName);
  const writeStream = createWriteStream(filePath);

  req.pipe(writeStream);
  writeStream.on('finish', () => {
    logger.info(`[LocalUpload] 저장 완료: ${filePath}`);
    res.status(200).send('OK');
  });
  writeStream.on('error', (err) => {
    logger.error('[LocalUpload] 저장 실패:', err);
    res.status(500).send('Upload failed');
  });
});

app.get('/api/local-upload/:fileKey', (req, res) => {
  const fileKey = decodeURIComponent(req.params.fileKey);
  const safeName = fileKey.replace(/\//g, '_');
  const filePath = path.join(LOCAL_UPLOAD_DIR, safeName);
  if (!existsSync(filePath)) { res.status(404).send('Not found'); return; }
  res.setHeader('Content-Type', 'application/octet-stream');
  createReadStream(filePath).pipe(res);
});

// 공유 회의록 (인증 불필요)
app.get('/api/shared/:token', async (req, res, next) => {
  try {
    const { MeetingService } = await import('./services/meetingService');
    const svc = new MeetingService();
    const meeting = await svc.getMeetingByShareToken(req.params.token);
    res.json({ data: { meeting } });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

export default app;
