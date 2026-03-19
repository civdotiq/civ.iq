export class CivIQError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'CivIQError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
export class BadRequestError extends CivIQError {
  constructor(message, details) {
    super(message, 400, 'BAD_REQUEST', details);
    this.name = 'BadRequestError';
  }
}
export class NotFoundError extends CivIQError {
  constructor(message, details) {
    super(message, 404, 'NOT_FOUND', details);
    this.name = 'NotFoundError';
  }
}
export class RateLimitError extends CivIQError {
  constructor(retryAfter) {
    super('Rate limit exceeded (60 requests/minute)', 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
export class UpstreamError extends CivIQError {
  constructor(message) {
    super(message, 502, 'UPSTREAM_ERROR');
    this.name = 'UpstreamError';
  }
}
//# sourceMappingURL=errors.js.map
