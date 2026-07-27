/**
 * Regression tests for Redis reachability reporting.
 *
 * The bug these lock down: Upstash suspended the production database on
 * 2026-07-21 for exceeding its budget, and `/api/health/redis` reported
 * `"status":"healthy"` for six days. Every cache operation degrades to an
 * in-memory fallback and returns success, so the health check — which was
 * built on those same operations — could not see the outage.
 *
 * `probe()` exists to be the one path that does NOT fall back.
 */

const REST_URL = 'https://fake-db.upstash.io';
const REST_TOKEN = 'test-token';

/** Upstash's verbatim response body when a database is suspended over budget. */
const SUSPENDED =
  'ERR This database has been suspended for exceeding the defined budget limit. ' +
  'Please increase budget or switch to a Fixed plan on Upstash Console';

type RedisCacheCtor = typeof import('@/lib/cache/redis-client').RedisCache;

const okJson = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const failure = (status: number, text: string): Response =>
  ({
    ok: false,
    status,
    json: async () => ({}),
    text: async () => text,
  }) as unknown as Response;

describe('RedisCache reachability reporting', () => {
  let RedisCache: RedisCacheCtor;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // The constructor schedules a 5-minute cleanup interval that is never
    // unref'd; fake timers keep it from holding the test run open.
    jest.useFakeTimers();
    process.env.UPSTASH_REDIS_REST_URL = REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REST_TOKEN;
    ({ RedisCache } = await import('@/lib/cache/redis-client'));
  });

  afterAll(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('when the database is reachable', () => {
    beforeEach(() => {
      let written = '';
      global.fetch = jest.fn(async (url: unknown, init?: { body?: unknown }) => {
        const href = String(url);
        if (href.includes('/setex/')) {
          written = String(init?.body ?? '');
          return okJson({ result: 'OK' });
        }
        if (href.includes('/get/')) return okJson({ result: written });
        if (href.includes('/del/')) return okJson({ result: 1 });
        return failure(404, 'unexpected');
      }) as unknown as typeof fetch;
    });

    it('reports reachable after a verified write/read round-trip', async () => {
      const probe = await new RedisCache().probe();

      expect(probe.reachable).toBe(true);
      expect(probe.transport).toBe('rest');
      expect(probe.error).toBeUndefined();
    });

    it('does not report reachable when the value fails to read back', async () => {
      global.fetch = jest.fn(async (url: unknown) => {
        const href = String(url);
        if (href.includes('/setex/')) return okJson({ result: 'OK' });
        // Write "succeeds" but the value is not there — a silent data-loss
        // shape that a write-only probe would score as healthy.
        if (href.includes('/get/')) return okJson({ result: null });
        return okJson({ result: 1 });
      }) as unknown as typeof fetch;

      const probe = await new RedisCache().probe();

      expect(probe.reachable).toBe(false);
      expect(probe.error).toMatch(/did not read back/);
    });
  });

  describe('when the database is suspended', () => {
    beforeEach(() => {
      global.fetch = jest.fn(async () => failure(500, SUSPENDED)) as unknown as typeof fetch;
    });

    it('reports unreachable and surfaces the upstream reason verbatim', async () => {
      const probe = await new RedisCache().probe();

      expect(probe.reachable).toBe(false);
      // The operator has to be able to tell "cache is cold" from "you are
      // over budget". That means the upstream text has to survive.
      expect(probe.error).toContain('suspended');
      expect(probe.error).toContain('budget');
    });

    it('still reports success from set(), which is why probe() has to exist', async () => {
      const cache = new RedisCache();

      // This is the pre-existing, deliberate behaviour: serving traffic
      // should degrade rather than fail. It is also exactly why the old
      // health check could not detect the outage.
      await expect(cache.set('k', { v: 1 }, 60)).resolves.toBe(true);
    });

    it('flags the instance as degraded once an operation has fallen back', async () => {
      const cache = new RedisCache();
      expect(cache.getStatus().degraded).toBe(false);

      await cache.set('k', { v: 1 }, 60);

      const status = cache.getStatus();
      expect(status.degraded).toBe(true);
      expect(status.restFailureCount).toBeGreaterThan(0);
      expect(status.lastRestFailure?.op).toBe('set');
      expect(status.lastRestFailure?.message).toContain('suspended');
    });
  });

  describe('when the network is unavailable', () => {
    it('reports unreachable rather than throwing', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('ECONNREFUSED');
      }) as unknown as typeof fetch;

      const probe = await new RedisCache().probe();

      expect(probe.reachable).toBe(false);
      expect(probe.error).toContain('ECONNREFUSED');
    });
  });
});
