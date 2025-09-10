#!/usr/bin/env npx tsx

/**
 * Redis Performance Test
 * Tests cache performance improvement from Redis implementation
 */

import { redisService } from '../src/services/cache/redis.service';
import { govCache } from '../src/services/cache';

const ENDPOINT_BASE = 'http://localhost:3000/api';
const TEST_REPRESENTATIVE = 'K000367'; // Amy Klobuchar
const TEST_ENDPOINTS = ['representative', 'bills', 'votes'];

interface PerformanceResult {
  endpoint: string;
  firstCallMs: number;
  cachedCallMs: number;
  speedImprovement: string;
  cacheSaved: string;
}

async function clearCache(): Promise<void> {
  console.log('🧹 Clearing Redis cache...');
  try {
    await redisService.flush();
    console.log('✅ Cache cleared');
  } catch (error) {
    console.log('⚠️ Cache clear failed (continuing anyway):', (error as Error).message);
  }
}

async function testEndpoint(endpoint: string): Promise<PerformanceResult> {
  const url = `${ENDPOINT_BASE}/${endpoint}/${TEST_REPRESENTATIVE}`;

  console.log(`\n🔄 Testing ${endpoint} endpoint...`);

  // First call (no cache)
  console.log('  📡 First call (no cache)...');
  const start1 = Date.now();

  try {
    const response1 = await fetch(url);
    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`);
    }
    await response1.json();
  } catch (error) {
    console.log(`  ❌ First call failed: ${(error as Error).message}`);
    throw error;
  }

  const firstCallMs = Date.now() - start1;
  console.log(`  ⏱️  First call: ${firstCallMs}ms`);

  // Small delay to ensure cache is set
  await new Promise(resolve => setTimeout(resolve, 100));

  // Second call (with cache)
  console.log('  🚀 Second call (with cache)...');
  const start2 = Date.now();

  try {
    const response2 = await fetch(url);
    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}: ${response2.statusText}`);
    }
    await response2.json();
  } catch (error) {
    console.log(`  ❌ Second call failed: ${(error as Error).message}`);
    throw error;
  }

  const cachedCallMs = Date.now() - start2;
  console.log(`  ⚡ Second call: ${cachedCallMs}ms`);

  // Calculate improvement
  const improvement = firstCallMs > 0 ? Math.round(firstCallMs / cachedCallMs) : 0;
  const savedMs = firstCallMs - cachedCallMs;

  return {
    endpoint,
    firstCallMs,
    cachedCallMs,
    speedImprovement: improvement > 1 ? `${improvement}x faster` : 'slower',
    cacheSaved: `${savedMs}ms saved`,
  };
}

async function checkRedisConnection(): Promise<boolean> {
  try {
    const status = redisService.getStatus();
    console.log(`📊 Redis Status: ${status.isConnected ? '🟢 Connected' : '🔴 Disconnected'}`);
    console.log(`   Fallback cache size: ${status.fallbackCacheSize} entries`);
    console.log(`   Redis status: ${status.redisStatus}`);
    return status.isConnected;
  } catch (error) {
    console.log(`❌ Redis connection check failed: ${(error as Error).message}`);
    return false;
  }
}

async function checkCacheStats(): Promise<void> {
  try {
    const stats = await govCache.getStats();
    console.log(`\n📈 Cache Statistics:`);
    console.log(`   Total entries: ${stats.totalEntries}`);
    console.log(`   Active entries: ${stats.activeEntries}`);
    console.log(`   Connected: ${stats.isConnected ? '🟢' : '🔴'}`);
  } catch (error) {
    console.log(`⚠️ Cache stats unavailable: ${(error as Error).message}`);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Redis Performance Test');
  console.log('==========================\n');

  // Check if dev server is running
  try {
    const response = await fetch(`${ENDPOINT_BASE}/health`);
    if (!response.ok) {
      throw new Error('Dev server not responding');
    }
    console.log('✅ Dev server is running');
  } catch (error) {
    console.log('❌ Dev server not running! Start with: npm run dev');
    process.exit(1);
  }

  // Check Redis connection
  const redisConnected = await checkRedisConnection();

  if (!redisConnected) {
    console.log('\n⚠️ Redis not connected - will use fallback cache');
    console.log('   To start Redis: sudo service redis-server start');
  }

  // Clear cache to start fresh
  await clearCache();

  const results: PerformanceResult[] = [];

  // Test each endpoint
  for (const endpoint of TEST_ENDPOINTS) {
    try {
      const result = await testEndpoint(endpoint);
      results.push(result);
    } catch (error) {
      console.log(`❌ ${endpoint} test failed: ${(error as Error).message}`);
      results.push({
        endpoint,
        firstCallMs: 0,
        cachedCallMs: 0,
        speedImprovement: 'failed',
        cacheSaved: 'N/A',
      });
    }
  }

  // Show final results
  console.log('\n📊 PERFORMANCE TEST RESULTS');
  console.log('============================');

  results.forEach(result => {
    const { endpoint, firstCallMs, cachedCallMs, speedImprovement, cacheSaved } = result;
    console.log(`\n${endpoint.toUpperCase()}:`);
    console.log(`  First call:  ${firstCallMs}ms`);
    console.log(`  Cached call: ${cachedCallMs}ms`);
    console.log(`  Improvement: ${speedImprovement}`);
    console.log(`  Time saved:  ${cacheSaved}`);
  });

  // Overall summary
  const validResults = results.filter(r => r.firstCallMs > 0 && r.cachedCallMs > 0);
  if (validResults.length > 0) {
    const totalFirst = validResults.reduce((sum, r) => sum + r.firstCallMs, 0);
    const totalCached = validResults.reduce((sum, r) => sum + r.cachedCallMs, 0);
    const overallImprovement = Math.round(totalFirst / totalCached);
    const totalSaved = totalFirst - totalCached;

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Total time without cache: ${totalFirst}ms`);
    console.log(`   Total time with cache:    ${totalCached}ms`);
    console.log(`   Overall improvement:      ${overallImprovement}x faster`);
    console.log(`   Total time saved:         ${totalSaved}ms`);

    if (overallImprovement > 10) {
      console.log(`\n🎉 EXCELLENT! Cache provides ${overallImprovement}x speed improvement!`);
    } else if (overallImprovement > 3) {
      console.log(`\n✅ GOOD! Cache provides ${overallImprovement}x speed improvement`);
    } else {
      console.log(`\n⚠️ Cache improvement is modest: ${overallImprovement}x`);
    }
  }

  await checkCacheStats();

  console.log('\n✅ Performance test complete!');
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}
