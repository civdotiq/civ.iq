/**
 * scanKeys() lists keys with SCAN because Upstash disables KEYS once the
 * store is large ("ERR KEYS command is disabled because total number of keys
 * is too large, please use SCAN"). The old keys() call swallowed that error
 * and fell back to the empty in-memory cache, so /api/nostr/verify reported
 * `published: 0` while Redis held 725 dedup records.
 */

const REST_URL = 'https://fake-db.upstash.io';
const REST_TOKEN = 'test-token';

type RedisCacheCtor = typeof import('@/lib/cache/redis-client').RedisCache;

const okJson = (body: unknown): Response =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('RedisCache.scanKeys over Upstash REST', () => {
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

  it('follows the cursor to the end and strips the cache key prefix', async () => {
    const commands: string[][] = [];
    global.fetch = jest.fn(async (_url: unknown, init?: { body?: unknown }) => {
      const command = JSON.parse(String(init?.body)) as string[];
      commands.push(command);
      return command[1] === '0'
        ? okJson({ result: ['42', ['civiq:nostr:published:bill-1']] })
        : okJson({ result: ['0', ['civiq:nostr:published:vote-2']] });
    }) as unknown as typeof fetch;

    const keys = await new RedisCache().scanKeys('nostr:published:');

    expect(keys).toEqual(['nostr:published:bill-1', 'nostr:published:vote-2']);
    expect(commands).toEqual([
      ['SCAN', '0', 'MATCH', 'civiq:nostr:published:*', 'COUNT', '10000'],
      ['SCAN', '42', 'MATCH', 'civiq:nostr:published:*', 'COUNT', '10000'],
    ]);
  });

  it('returns null, not an empty list, when Upstash answers with an error', async () => {
    global.fetch = jest.fn(async () =>
      okJson({ error: 'ERR SCAN failed' })
    ) as unknown as typeof fetch;

    expect(await new RedisCache().scanKeys('nostr:published:')).toBeNull();
  });

  it('returns null when the request fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    expect(await new RedisCache().scanKeys('nostr:published:')).toBeNull();
  });
});
