import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
    },
  },
});

export const sttLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'STT 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
      retryable: true,
    },
  },
});
