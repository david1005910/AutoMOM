import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ApiError } from '../utils/apiError';

interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized();
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, config.JWT_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as JwtPayload;

    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(ApiError.unauthorized('토큰이 만료되었습니다.'));
    }
    if (error instanceof ApiError) {
      return next(error);
    }
    next(ApiError.unauthorized());
  }
}
