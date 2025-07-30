/**
 * Base API service for civic-intel-hub
 * Provides common functionality for all API requests
 */

export interface ApiOptions extends RequestInit {
  timeout?: number;
}

/**
 * Base API request function with error handling and timeout
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { timeout = 10000, ...fetchOptions } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`/api${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }

    throw new Error('Unknown API error');
  }
}

/**
 * GET request helper
 */
export const apiGet = <T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> =>
  apiRequest<T>(endpoint, { ...options, method: 'GET' });

/**
 * POST request helper
 */
export const apiPost = <T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> =>
  apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

/**
 * PUT request helper
 */
export const apiPut = <T = unknown>(
  endpoint: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> =>
  apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });

/**
 * DELETE request helper
 */
export const apiDelete = <T = unknown>(endpoint: string, options?: ApiOptions): Promise<T> =>
  apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
