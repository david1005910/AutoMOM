import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createWriteStream, existsSync, mkdirSync, createReadStream, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

// 로컬 개발용 업로드 디렉터리
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'tmp', 'uploads');

function isLocalMode(): boolean {
  // AWS 자격증명이 없거나 placeholder이면 로컬 모드
  return (
    config.NODE_ENV !== 'production' &&
    (!config.AWS_ACCESS_KEY_ID || config.AWS_ACCESS_KEY_ID === 'your-access-key')
  );
}

function ensureLocalDir() {
  if (!existsSync(LOCAL_UPLOAD_DIR)) {
    mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
}

function localPath(fileKey: string): string {
  const filePath = path.join(LOCAL_UPLOAD_DIR, fileKey.replace(/\//g, '_'));
  return filePath;
}

export class StorageService {
  private s3: S3Client | null;

  constructor() {
    if (!isLocalMode()) {
      this.s3 = new S3Client({
        region: config.S3_REGION,
        credentials: config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: config.AWS_ACCESS_KEY_ID, secretAccessKey: config.AWS_SECRET_ACCESS_KEY }
          : undefined,
      });
    } else {
      this.s3 = null;
      ensureLocalDir();
      logger.info('[StorageService] 로컬 파일 저장 모드 (AWS 자격증명 없음)');
    }
  }

  async generateUploadUrl(fileKey: string, contentType: string): Promise<string> {
    if (isLocalMode()) {
      // 로컬 모드: 백엔드의 로컬 업로드 엔드포인트 URL 반환
      const encodedKey = encodeURIComponent(fileKey);
      return `http://localhost:${config.PORT}/api/local-upload/${encodedKey}`;
    }

    const command = new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: fileKey,
      ContentType: contentType,
    });
    return getSignedUrl(this.s3!, command, { expiresIn: 15 * 60 });
  }

  async generateDownloadUrl(fileKey: string): Promise<string> {
    if (isLocalMode()) {
      const encodedKey = encodeURIComponent(fileKey);
      return `http://localhost:${config.PORT}/api/local-upload/${encodedKey}`;
    }

    const command = new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey });
    return getSignedUrl(this.s3!, command, { expiresIn: 60 * 60 });
  }

  async downloadFile(fileKey: string, destPath: string): Promise<void> {
    if (isLocalMode()) {
      const src = localPath(fileKey);
      if (!existsSync(src)) throw new Error(`로컬 파일 없음: ${src}`);
      await pipeline(createReadStream(src), createWriteStream(destPath));
      return;
    }

    const command = new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey });
    const response = await this.s3!.send(command);
    if (!response.Body) throw new Error('S3에서 파일 다운로드 실패');
    await pipeline(response.Body as Readable, createWriteStream(destPath));
  }

  async deleteFile(fileKey: string): Promise<void> {
    if (isLocalMode()) {
      const filePath = localPath(fileKey);
      if (existsSync(filePath)) unlinkSync(filePath);
      return;
    }

    const command = new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: fileKey });
    await this.s3!.send(command);
  }

  // 로컬 모드 전용: 파일 저장 경로 반환
  getLocalPath(fileKey: string): string {
    return localPath(fileKey);
  }
}
