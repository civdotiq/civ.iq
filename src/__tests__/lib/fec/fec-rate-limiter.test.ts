/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC rate limiter tests.
 *
 * Verifies the shared per-minute budget gives live traffic priority over crons
 * and fails open when Redis is unavailable. @upstash/redis is mocked with an
 * in-memory counter so INCR/DECR semantics can be exercised deterministically.
 */

const mockState = { counter: 0 };
const mockRedisClient = {
  incr: jest.fn(async () => ++mockState.counter),
  decr: jest.fn(async () => --mockState.counter),
  expire: jest.fn(async () => 1),
};

jest.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => mockRedisClient },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

type LimiterModule = typeof import('@/lib/fec/fec-rate-limiter');

const ORIGINAL_ENV = { ...process.env };

async function loadLimiter(opts: {
  withRedis: boolean;
  cronBudget?: number;
}): Promise<LimiterModule> {
  jest.resetModules();
  mockState.counter = 0;
  process.env = { ...ORIGINAL_ENV };
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.FEC_CRON_BUDGET_PER_MIN;
  if (opts.withRedis) {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  }
  if (opts.cronBudget !== undefined) {
    process.env.FEC_CRON_BUDGET_PER_MIN = String(opts.cronBudget);
  }
  return import('@/lib/fec/fec-rate-limiter');
}

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('fec-rate-limiter', () => {
  it('fails open (allows) when Redis is not configured', async () => {
    const { reserveFecCall } = await loadLimiter({ withRedis: false });
    const result = await reserveFecCall('cron');
    expect(result.allowed).toBe(true);
    expect(mockRedisClient.incr).not.toHaveBeenCalled();
  });

  it('defaults priority to live and propagates cron via runWithFecPriority', async () => {
    const { getFecPriority, runWithFecPriority } = await loadLimiter({ withRedis: false });
    expect(getFecPriority()).toBe('live');
    const inner = await runWithFecPriority('cron', async () => getFecPriority());
    expect(inner).toBe('cron');
    // Context does not leak back out.
    expect(getFecPriority()).toBe('live');
  });

  it('never blocks live calls, even past the cron ceiling', async () => {
    const { reserveFecCall } = await loadLimiter({ withRedis: true, cronBudget: 2 });
    const results = await Promise.all(Array.from({ length: 10 }, () => reserveFecCall('live')));
    expect(results.every(r => r.allowed)).toBe(true);
  });

  it('allows cron calls while under the ceiling', async () => {
    const { reserveFecCall } = await loadLimiter({ withRedis: true, cronBudget: 5 });
    const first = await reserveFecCall('cron');
    expect(first.allowed).toBe(true);
    expect(first.count).toBe(1);
  });

  it('yields cron calls once the minute budget is spent', async () => {
    jest.useFakeTimers();
    try {
      const { reserveFecCall } = await loadLimiter({ withRedis: true, cronBudget: 1 });
      // Burn the single cron slot with a live call so the counter sits at the ceiling.
      await reserveFecCall('live'); // counter -> 1
      const pending = reserveFecCall('cron'); // 2 > ceiling 1 -> paces then yields
      await jest.advanceTimersByTimeAsync(800 * 6);
      const result = await pending;
      expect(result.allowed).toBe(false);
      // Token handed back on each rejection — counter never runs away past live's use.
      expect(mockState.counter).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
