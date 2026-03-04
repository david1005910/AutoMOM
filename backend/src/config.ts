import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  S3_BUCKET: z.string().min(1),
  S3_REGION: z.string().default('ap-northeast-2'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  COOKIE_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('환경변수 설정 오류:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
