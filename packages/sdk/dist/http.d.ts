export interface HttpClientOptions {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
}
export declare class HttpClient {
  private readonly baseUrl;
  private readonly fetchFn;
  constructor(options?: HttpClientOptions);
  get<T>(path: string, params?: Record<string, unknown>, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T>;
  private buildUrl;
  private handleResponse;
}
//# sourceMappingURL=http.d.ts.map
