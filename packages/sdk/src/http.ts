import {
  CivIQError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
} from './errors.js';

// Bump manually when packages/sdk/package.json bumps so the User-Agent
// signature reflects the installed SDK build. There is no automated drift
// check yet — the Phase 5.C release checklist includes it as a manual step.
export const SDK_VERSION = '0.2.0';
export const SDK_USER_AGENT = `@civiq/sdk/${SDK_VERSION}`;

export interface HttpClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  /**
   * Extra token to append to the default User-Agent string (e.g., an app name
   * and version). Appears after the SDK signature so operators can still see
   * the SDK version even when callers pass their own identifier:
   *   "@civiq/sdk/0.2.0 myapp/1.0"
   * Has no effect in browsers — the fetch spec forbids setting User-Agent
   * from client-side code.
   */
  userAgent?: string;
}

// Node / Bun / Deno set `process.versions.node` or equivalent; browsers do not.
// We use this to decide whether it's safe to send a User-Agent header at all —
// browsers silently drop it, and some throw.
function canSetUserAgent(): boolean {
  if (typeof process !== 'undefined' && process.versions?.node) return true;
  // Deno is a non-browser runtime that exposes Deno on globalThis
  if (typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined') return true;
  return false;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof globalThis.fetch;
  private readonly userAgent: string | null;

  constructor(options?: HttpClientOptions) {
    this.baseUrl = (options?.baseUrl ?? 'https://civdotiq.org/api').replace(/\/$/, '');
    this.fetchFn = options?.fetch ?? globalThis.fetch;
    if (canSetUserAgent()) {
      this.userAgent = options?.userAgent
        ? `${SDK_USER_AGENT} ${options.userAgent}`
        : SDK_USER_AGENT;
    } else {
      this.userAgent = null;
    }
  }

  async get<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: this.buildHeaders(),
      signal,
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: this.buildHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
      signal,
    });
    return this.handleResponse<T>(response);
  }

  private buildHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(extra ?? {}),
    };
    if (this.userAgent) headers['User-Agent'] = this.userAgent;
    return headers;
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = `${this.baseUrl}${path}`;
    if (!params) return url;

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    return qs ? `${url}?${qs}` : url;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.ok) {
      return (await response.json()) as T;
    }

    let errorMessage = response.statusText;
    try {
      const body = await response.json();
      if (body?.error?.message) {
        errorMessage = body.error.message;
      }
    } catch {
      // Body not JSON, use statusText
    }

    switch (response.status) {
      case 400:
        throw new BadRequestError(errorMessage);
      case 404:
        throw new NotFoundError(errorMessage);
      case 429: {
        const retryAfter = response.headers.get('Retry-After');
        throw new RateLimitError(retryAfter ? parseInt(retryAfter, 10) : undefined);
      }
      case 502:
      case 503:
        throw new UpstreamError(errorMessage);
      default:
        throw new CivIQError(errorMessage, response.status);
    }
  }
}
