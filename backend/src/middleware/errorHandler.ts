import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, retryable: err.retryable },
    });
  }

  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력값이 올바르지 않습니다.',
        retryable: false,
        details: err.errors,
      },
    });
  }

  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.', retryable: true },
  });
}
