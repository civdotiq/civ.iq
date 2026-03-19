import {
  CivIQError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
} from './errors.js';
export class HttpClient {
  constructor(options) {
    this.baseUrl = (options?.baseUrl ?? 'https://civdotiq.org/api').replace(/\/$/, '');
    this.fetchFn = options?.fetch ?? globalThis.fetch;
  }
  async get(path, params, signal) {
    const url = this.buildUrl(path, params);
    const response = await this.fetchFn(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    return this.handleResponse(response);
  }
  async post(path, body, signal) {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    return this.handleResponse(response);
  }
  buildUrl(path, params) {
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
  async handleResponse(response) {
    if (response.ok) {
      return await response.json();
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
//# sourceMappingURL=http.js.map
