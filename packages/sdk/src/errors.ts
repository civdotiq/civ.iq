export class CivIQError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: string;

  constructor(message: string, status: number, code?: string, details?: string) {
    super(message);
    this.name = 'CivIQError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends CivIQError {
  constructor(message: string, details?: string) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends CivIQError {
  constructor(message: string, details?: string) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends CivIQError {
  readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super('Rate limit exceeded (60 requests/minute)', 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class UpstreamError extends CivIQError {
  constructor(message: string) {
    super(message, 502, 'UPSTREAM_ERROR');
    this.name = 'UpstreamError';
  }
}
