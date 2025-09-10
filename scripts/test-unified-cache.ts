#!/usr/bin/env npx tsx

/**
 * Test script for the unified cache service
 */

import { unifiedCache } from '../src/services/cache/unified-cache.service';

async function testUnifiedCache() {
  console.log('🧪 Testing Unified Cache Service...\n');

  // Test 1: Basic set/get
  console.log('1. Testing basic set/get...');
  await unifiedCache.set('test:basic', { message: 'hello world' }, { source: 'test-script' });
  const result = await unifiedCache.get('test:basic');
  console.log('✅ Basic set/get:', result?.message === 'hello world' ? 'PASS' : 'FAIL');

  // Test 2: Cache statistics
  console.log('\n2. Testing cache statistics...');
  try {
    const stats = await unifiedCache.getStats();
    console.log('✅ Cache stats structure:', {
      redis: !!stats.redis,
      fallback: !!stats.fallback,
      combined: !!stats.combined,
    });

    console.log('📊 Current stats:');
    console.log(`   Redis entries: ${stats.redis.totalEntries}`);
    console.log(`   Fallback entries: ${stats.fallback.totalEntries}`);
    console.log(`   Combined entries: ${stats.combined.totalEntries}`);
    console.log(`   Redundancy: ${stats.combined.redundancy}`);
  } catch (error) {
    console.log('❌ Cache stats failed:', (error as Error).message);
  }

  // Test 3: Pattern invalidation
  console.log('\n3. Testing pattern invalidation...');
  await unifiedCache.set('test:pattern:1', { id: 1 }, { source: 'test-script' });
  await unifiedCache.set('test:pattern:2', { id: 2 }, { source: 'test-script' });
  await unifiedCache.set('other:data', { id: 3 }, { source: 'test-script' });

  const invalidationResult = await unifiedCache.invalidatePattern('test:pattern');
  console.log('✅ Pattern invalidation result:', invalidationResult);

  // Verify invalidation worked
  const shouldBeNull1 = await unifiedCache.get('test:pattern:1');
  const shouldBeNull2 = await unifiedCache.get('test:pattern:2');
  const shouldExist = await unifiedCache.get('other:data');

  console.log('✅ Pattern invalidation verification:');
  console.log(`   test:pattern:1 (should be null): ${shouldBeNull1 === null ? 'PASS' : 'FAIL'}`);
  console.log(`   test:pattern:2 (should be null): ${shouldBeNull2 === null ? 'PASS' : 'FAIL'}`);
  console.log(`   other:data (should exist): ${shouldExist !== null ? 'PASS' : 'FAIL'}`);

  // Test 4: TTL functionality
  console.log('\n4. Testing TTL functionality...');
  await unifiedCache.set(
    'test:ttl',
    { message: 'expires soon' },
    { ttl: 1000, source: 'test-script' }
  );
  const beforeExpiry = await unifiedCache.get('test:ttl');
  console.log('✅ Before expiry:', beforeExpiry !== null ? 'PASS' : 'FAIL');

  await new Promise(resolve => setTimeout(resolve, 1100));
  const afterExpiry = await unifiedCache.get('test:ttl');
  console.log('✅ After expiry:', afterExpiry === null ? 'PASS' : 'FAIL');

  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await unifiedCache.clear('test:');
  await unifiedCache.clear('other:');

  console.log('\n✅ Unified Cache Service test completed!');
}

if (require.main === module) {
  testUnifiedCache().catch(console.error);
}

export { testUnifiedCache };
