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

type RedisCacheCtor = typeof import('@/lib/cache/redis-client').RedisCache;

const UPSTASH = 'https://fake-db.upstash.io';

describe('RedisCache.ttl over Upstash REST', () => {
  let RedisCache: RedisCacheCtor;
  const realFetch = global.fetch;
  let requested: string[] = [];

  // Answer every Upstash call with `reply`, or fail it when reply is an Error.
  const upstashReplies = (reply: number | Error): void => {
    requested = [];
    global.fetch = jest.fn(async (url: unknown) => {
      requested.push(String(url));
      if (reply instanceof Error) throw reply;
      return { ok: true, status: 200, json: async () => ({ result: reply }) } as Response;
    }) as unknown as typeof fetch;
  };

  beforeAll(async () => {
    process.env.UPSTASH_REDIS_REST_URL = UPSTASH;
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    jest.useFakeTimers(); // RedisCache's cleanup interval is never unref'd
    RedisCache = (await import('@/lib/cache/redis-client')).RedisCache;
  });

  afterAll(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  it('returns the seconds left on the prefixed key', async () => {
    upstashReplies(3600);

    expect(await new RedisCache().ttl('congress-legislators-current')).toBe(3600);
    expect(requested).toEqual([`${UPSTASH}/ttl/civiq%3Acongress-legislators-current`]);
  });

  it('returns null for a missing key (-2) or one with no expiry (-1)', async () => {
    upstashReplies(-2);
    expect(await new RedisCache().ttl('gone')).toBeNull();

    upstashReplies(-1);
    expect(await new RedisCache().ttl('forever')).toBeNull();
  });

  it('returns null when Upstash cannot be reached', async () => {
    upstashReplies(new Error('network down'));

    expect(await new RedisCache().ttl('congress-legislators-current')).toBeNull();
  });
});

describe('FileCache.set with an age', () => {
  const SIX_HOURS = 6 * 60 * 60;
  let dir: string;

  // Read `key` as if `msLater` milliseconds had passed.
  async function readLater(cache: FileCache, key: string, msLater: number): Promise<unknown> {
    const realNow = Date.now;
    Date.now = () => realNow() + msLater;
    try {
      return await cache.get(key);
    } finally {
      Date.now = realNow;
    }
  }

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-tier-age-'));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('expires when the source entry would, not a full TTL after the copy', async () => {
    const cache = new FileCache(dir);

    // Already 5h59m59s into a 6h TTL: one second left.
    await cache.set('roster', ['A000001'], SIX_HOURS, SIX_HOURS - 1);

    await expect(cache.get('roster')).resolves.toEqual(['A000001']);
    await expect(readLater(cache, 'roster', 2000)).resolves.toBeNull();
  });

  it('keeps a full TTL for data written fresh', async () => {
    const cache = new FileCache(dir);

    await cache.set('roster', ['A000001'], SIX_HOURS);

    await expect(readLater(cache, 'roster', 5 * 60 * 60 * 1000)).resolves.toEqual(['A000001']);
  });
});
