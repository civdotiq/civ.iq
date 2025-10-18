/**
 * Clear FEC cache for Representative Shri Thanedar (H2MI13204)
 * This script clears all cached FEC data to force fresh API calls
 */

import { govCache } from '@/services/cache';
import { enhancedFECService } from '@/lib/fec/enhanced-fec-service';
import logger from '@/lib/logging/simple-logger';

async function clearThahedarCache(): Promise<void> {
  const candidateId = 'H2MI13204'; // Shri Thanedar FEC ID

  console.log('🧹 Clearing FEC cache for Shri Thanedar (H2MI13204)...\n');

  try {
    // Clear Redis/unified cache for FEC data
    console.log('1. Clearing unified cache (Redis + fallback)...');
    await govCache.invalidatePattern(candidateId);
    await govCache.invalidatePattern('fec:');
    console.log('   ✅ Unified cache cleared\n');

    // Clear enhanced FEC service in-memory cache
    console.log('2. Clearing enhanced FEC service cache...');
    enhancedFECService.clearCaches();
    console.log('   ✅ Enhanced FEC service cache cleared\n');

    // Get cache stats
    console.log('3. Checking cache stats...');
    const stats = await govCache.getStats();
    console.log('   Cache Status:');
    console.log(`   - Redis entries: ${stats.redis.totalEntries}`);
    console.log(`   - Fallback entries: ${stats.fallback.totalEntries}`);
    console.log(`   - Redis connected: ${stats.redis.isConnected}\n`);

    console.log('✅ Cache cleared successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Restart the dev server if running');
    console.log('   2. Visit http://localhost:3000/representative/T000488');
    console.log('   3. Check Finance tab for corrected contribution data\n');
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }

  process.exit(0);
}

clearThahedarCache();
