/* eslint-disable no-console */
// One-shot probe that verifies RedisCache.set/get/delete roundtrip against
// Upstash REST. Use after touching src/lib/cache/redis-client.ts:
//
//   npx tsx --env-file=.env.local scripts/verify-upstash-roundtrip.ts
//
// Exits 0 if the JSON-with-slashes payload roundtrips cleanly, 1 otherwise.

import { getRedisCache } from '@/lib/cache/redis-client';

async function main(): Promise<number> {
  const cache = getRedisCache();
  const key = `probe:verify:${Date.now()}`;
  const value = {
    zip: '94590',
    reportUrl: 'https://civdotiq.org/money-report/CA/32',
    generatedAt: new Date().toISOString(),
    flags: { stale: false, partial: true },
  };

  console.log('status before set:', cache.getStatus());

  const setOk = await cache.set(key, value, 120);
  console.log('set returned:', setOk);

  const got = await cache.get<typeof value>(key);
  console.log('get returned:', got);

  const matches = got != null && got.reportUrl === value.reportUrl;
  console.log(matches ? 'ROUNDTRIP OK' : 'ROUNDTRIP FAILED');

  const delOk = await cache.delete(key);
  console.log('delete returned:', delOk);

  const after = await cache.get<typeof value>(key);
  console.log('post-delete get:', after);

  await cache.disconnect();

  return matches && delOk && after === null ? 0 : 1;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
