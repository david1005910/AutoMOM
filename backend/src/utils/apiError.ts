export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static unauthorized(message = '인증이 필요합니다.') {
    return new ApiError(401, 'UNAUTHORIZED', message, false);
  }

  static forbidden(message = '접근 권한이 없습니다.') {
    return new ApiError(403, 'FORBIDDEN', message, false);
  }

  static notFound(resource: string) {
    return new ApiError(404, 'NOT_FOUND', `${resource}을(를) 찾을 수 없습니다.`, false);
  }

  static planLimitExceeded() {
    return new ApiError(403, 'PLAN_LIMIT_EXCEEDED', '무료 플랜 한도를 초과했습니다. 업그레이드를 고려해주세요.', false);
  }

  static sttFailed() {
    return new ApiError(500, 'STT_PROCESSING_FAILED', 'STT 처리 중 오류가 발생했습니다.', true);
  }

  static aiFailed() {
    return new ApiError(500, 'AI_GENERATION_FAILED', 'AI 회의록 생성 중 오류가 발생했습니다.', true);
  }
}
