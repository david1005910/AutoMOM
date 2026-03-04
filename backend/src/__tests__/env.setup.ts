import fs from 'fs';
import path from 'path';

// Jest가 backend/ 디렉토리에서 실행됨을 가정
const backendRoot = process.cwd();

const privateKey = fs.readFileSync(path.join(backendRoot, 'private.pem'), 'utf-8');
const publicKey = fs.readFileSync(path.join(backendRoot, 'public.pem'), 'utf-8');

process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_REGION = 'ap-northeast-2';
process.env.OPENAI_API_KEY = 'sk-placeholder-test-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key-placeholder';
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.COOKIE_SECRET = 'test-cookie-secret-must-be-32-chars!!';
process.env.NODE_ENV = 'test';
