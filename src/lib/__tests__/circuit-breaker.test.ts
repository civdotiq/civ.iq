import { CircuitBreaker, CircuitBreakerState } from '../circuit-breaker';

// Mock stale response cache
const mockGetStaleResponse = jest.fn();
const mockStoreResponse = jest.fn();

jest.mock('@/lib/cache/stale-response-cache', () => ({
  getStaleResponse: (...args: unknown[]) => mockGetStaleResponse(...args),
  storeResponse: (...args: unknown[]) => mockStoreResponse(...args),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  __esModule: true,
}));

function createBreaker(
  overrides?: Partial<Parameters<typeof CircuitBreaker.prototype.getStats>[0]>
) {
  return new CircuitBreaker({
    name: 'test-service',
    failureThreshold: 2,
    recoveryTimeout: 1000,
    monitoringWindow: 5000,
    successThreshold: 1,
    ...overrides,
  });
}

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStoreResponse.mockResolvedValue(undefined);
  });

  describe('execute without cacheKey (backward compatibility)', () => {
    it('returns result directly on success', async () => {
      const breaker = createBreaker();
      const result = await breaker.execute(() => Promise.resolve('ok'));
      expect(result).toBe('ok');
    });

    it('throws on failure', async () => {
      const breaker = createBreaker();
      await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow(
        'fail'
      );
    });

    it('opens after failure threshold and fails fast', async () => {
      const breaker = createBreaker();

      // Trip the breaker
      await breaker.execute(() => Promise.reject(new Error('f1'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('f2'))).catch(() => {});

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      await expect(breaker.execute(() => Promise.resolve('should not run'))).rejects.toThrow(
        'OPEN - failing fast'
      );
    });
  });

  describe('execute with cacheKey (stale fallback)', () => {
    it('returns wrapped result on success and stores response', async () => {
      const breaker = createBreaker();
      const result = await breaker.execute(() => Promise.resolve({ bills: [1, 2] }), {
        cacheKey: 'congress:bills',
      });

      expect(result).toEqual({
        data: { bills: [1, 2] },
        stale: false,
      });
      expect(mockStoreResponse).toHaveBeenCalledWith(
        'congress:bills',
        { bills: [1, 2] },
        'test-service'
      );
    });

    it('uses custom cacheSource when provided', async () => {
      const breaker = createBreaker();
      await breaker.execute(() => Promise.resolve('data'), {
        cacheKey: 'k',
        cacheSource: 'custom-source',
      });

      expect(mockStoreResponse).toHaveBeenCalledWith('k', 'data', 'custom-source');
    });

    it('serves stale response when breaker is OPEN and cache has data', async () => {
      const breaker = createBreaker();

      // Trip the breaker
      await breaker.execute(() => Promise.reject(new Error('f1'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('f2'))).catch(() => {});
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      mockGetStaleResponse.mockResolvedValueOnce({
        data: { bills: [1] },
        fetchedAt: '2026-03-20T00:00:00.000Z',
        source: 'test-service',
      });

      const result = await breaker.execute(() => Promise.resolve('should not run'), {
        cacheKey: 'congress:bills',
      });

      expect(result).toEqual({
        data: { bills: [1] },
        stale: true,
        staleSince: '2026-03-20T00:00:00.000Z',
      });
      expect(mockGetStaleResponse).toHaveBeenCalledWith('congress:bills');
    });

    it('throws when breaker is OPEN and no stale data exists', async () => {
      const breaker = createBreaker();

      // Trip the breaker
      await breaker.execute(() => Promise.reject(new Error('f1'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('f2'))).catch(() => {});

      mockGetStaleResponse.mockResolvedValueOnce(null);

      await expect(
        breaker.execute(() => Promise.resolve('nope'), { cacheKey: 'congress:bills' })
      ).rejects.toThrow('OPEN - failing fast');
    });

    it('does not call stale cache when breaker is CLOSED', async () => {
      const breaker = createBreaker();
      await breaker.execute(() => Promise.resolve('ok'), { cacheKey: 'k' });

      expect(mockGetStaleResponse).not.toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    it('moves to HALF_OPEN after recovery timeout', async () => {
      const breaker = createBreaker({ recoveryTimeout: 10 });

      // Trip the breaker
      await breaker.execute(() => Promise.reject(new Error('f1'))).catch(() => {});
      await breaker.execute(() => Promise.reject(new Error('f2'))).catch(() => {});
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for recovery timeout
      await new Promise(r => setTimeout(r, 15));

      // Should transition to HALF_OPEN and execute
      const result = await breaker.execute(() => Promise.resolve('recovered'));
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('forceOpen and forceClose work', () => {
      const breaker = createBreaker();
      breaker.forceOpen();
      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
      breaker.forceClose();
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('getStats returns expected shape', () => {
      const breaker = createBreaker();
      const stats = breaker.getStats();
      expect(stats).toEqual({
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        recentFailures: 0,
        lastFailureTime: 0,
        name: 'test-service',
      });
    });
  });
});
