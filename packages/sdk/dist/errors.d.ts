export declare class CivIQError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: string;
  constructor(message: string, status: number, code?: string, details?: string);
}
export declare class BadRequestError extends CivIQError {
  constructor(message: string, details?: string);
}
export declare class NotFoundError extends CivIQError {
  constructor(message: string, details?: string);
}
export declare class RateLimitError extends CivIQError {
  readonly retryAfter?: number;
  constructor(retryAfter?: number);
}
export declare class UpstreamError extends CivIQError {
  constructor(message: string);
}
//# sourceMappingURL=errors.d.ts.map
