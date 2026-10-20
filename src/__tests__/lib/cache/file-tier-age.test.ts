/**
 * The congress file tier copies values out of Redis. It used to stamp each
 * copy with the time of the copy, so a value with one minute left in Redis
 * got a fresh six hours on disk, and the file tier could serve data up to two
 * full TTLs old. These tests pin the two pieces of the fix: reading how long
 * a Redis entry has left, and writing a file entry that is already that old.
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { FileCache } from '@/lib/cache/file-cache';

const REST_URL = 'https://fake-db.upstash.io';
const REST_TOKEN = 'test-token';

type RedisCacheCtor = typeof import('@/lib/cache/redis-client').RedisCache;

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('RedisCache.ttl over Upstash REST', () => {
  let RedisCache: RedisCacheCtor;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    // The constructor schedules a cleanup interval that is never unref'd.
    jest.useFakeTimers();
    process.env.UPSTASH_REDIS_REST_URL = REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = REST_TOKEN;
    ({ RedisCache } = await import('@/lib/cache/redis-client'));
  });

  afterAll(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('returns the seconds left on the prefixed key', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (url: unknown) => {
      urls.push(String(url));
      return okJson({ result: 3600 });
    }) as unknown as typeof fetch;

    expect(await new RedisCache().ttl('congress-legislators-current')).toBe(3600);
    expect(urls).toEqual([`${REST_URL}/ttl/civiq%3Acongress-legislators-current`]);
  });

  it('returns null for a missing key (-2) or one with no expiry (-1)', async () => {
    global.fetch = jest.fn(async () => okJson({ result: -2 })) as unknown as typeof fetch;
    expect(await new RedisCache().ttl('gone')).toBeNull();

    global.fetch = jest.fn(async () => okJson({ result: -1 })) as unknown as typeof fetch;
    expect(await new RedisCache().ttl('forever')).toBeNull();
  });

  it('returns null when Upstash cannot be reached', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    expect(await new RedisCache().ttl('congress-legislators-current')).toBeNull();
  });
});

describe('FileCache.set with an age', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-tier-age-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('expires when the source entry would, not a full TTL after the copy', async () => {
    const cache = new FileCache(dir);

    // 6h TTL, already 5h59m59s old: one second left.
    await cache.set('roster', ['A000001'], 6 * 60 * 60, 6 * 60 * 60 - 1);
    await expect(cache.get('roster')).resolves.toEqual(['A000001']);

    const realNow = Date.now;
    Date.now = () => realNow() + 2000;
    try {
      await expect(cache.get('roster')).resolves.toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it('keeps a full TTL for data written fresh', async () => {
    const cache = new FileCache(dir);

    await cache.set('roster', ['A000001'], 6 * 60 * 60);

    const realNow = Date.now;
    Date.now = () => realNow() + 5 * 60 * 60 * 1000;
    try {
      await expect(cache.get('roster')).resolves.toEqual(['A000001']);
    } finally {
      Date.now = realNow;
    }
  });
});
