/**
 * Cache Status API Route
 * Test endpoint to verify cache is working
 * Access at: http://localhost:3000/api/cache-status
 */

import { NextResponse } from 'next/server';
import { govCache } from '@/services/cache';

export async function GET() {
  // Get cache statistics
  const stats = govCache.getStats();
  
  // Test setting and getting cache
  const testKey = 'test:cache:verify';
  const testData = {
    message: 'Cache is working!',
    timestamp: new Date().toISOString(),
  };
  
  // Set test data
  govCache.set(testKey, testData, {
    ttl: 60000, // 1 minute
    source: 'test',
  });
  
  // Get test data back
  const retrieved = govCache.get(testKey);
  
  return NextResponse.json({
    status: 'operational',
    cache: {
      implementation: 'simple-government-cache',
      type: 'in-memory',
      ...stats,
      testVerification: {
        success: retrieved !== null,
        dataMatches: JSON.stringify(retrieved) === JSON.stringify(testData),
      },
    },
    message: 'CIV.IQ cache service is operational',
    note: 'This is an in-memory cache. Data will be lost on server restart. Consider Redis for production.',
    timestamp: new Date().toISOString(),
  });
}
