import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { config } from '../config';
import { ApiError } from '../utils/apiError';
import { authenticate } from '../middleware/authGuard';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '패스워드는 최소 8자 이상이어야 합니다.'),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/(?=.*[A-Z])(?=.*[0-9])/, '대문자와 숫자를 포함해야 합니다.'),
  name: z.string().min(1).max(100),
});

function issueTokens(userId: string, email: string) {
  const privateKey = config.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');

  const accessToken = jwt.sign({ sub: userId, email }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ sub: userId, type: 'refresh' }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
}

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      throw new ApiError(409, 'EMAIL_CONFLICT', '이미 사용 중인 이메일입니다.', false);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { email: body.email, name: body.name, passwordHash, provider: 'email' },
      select: { id: true, email: true, name: true, plan: true },
    });

    const { accessToken, refreshToken } = issueTokens(user.id, user.email);
    setRefreshCookie(res, refreshToken);

    res.status(201).json({ data: { user, accessToken } });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized('이메일 또는 패스워드가 올바르지 않습니다.');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw ApiError.unauthorized('이메일 또는 패스워드가 올바르지 않습니다.');
    }

    const { accessToken, refreshToken } = issueTokens(user.id, user.email);
    setRefreshCookie(res, refreshToken);

    res.json({
      data: {
        user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw ApiError.unauthorized('리프레시 토큰이 없습니다.');

    const publicKey = config.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
    const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as {
      sub: string;
      type: string;
    };

    if (payload.type !== 'refresh') throw ApiError.unauthorized('유효하지 않은 토큰입니다.');

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) throw ApiError.unauthorized();

    const { accessToken, refreshToken } = issueTokens(user.id, user.email);
    setRefreshCookie(res, refreshToken);

    res.json({ data: { accessToken } });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError(401, 'INVALID_REFRESH_TOKEN', '리프레시 토큰이 유효하지 않습니다.', false));
    }
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ data: { message: '로그아웃 완료' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, plan: true, createdAt: true },
    });
    if (!user) throw ApiError.unauthorized();
    res.json({ data: { user } });
  } catch (error) {
    next(error);
  }
});

export default router;
