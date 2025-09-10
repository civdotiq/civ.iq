#!/usr/bin/env npx tsx

/**
 * Production Monitoring Script for Phase 2-4 Deployment
 * Monitors cache performance, XML parsing success, and user experience metrics
 */

async function monitorDeployment() {
  console.log('🔍 Monitoring Phase 2-4 Deployment Status...\n');

  // 1. Redis Health Check
  console.log('📊 1. REDIS HEALTH CHECK');
  try {
    const response = await fetch('http://localhost:3000/api/health/redis');
    const health = await response.json();

    if (response.ok) {
      console.log('✅ Redis Status:', health.status);
      console.log(`   Connected: ${health.redis.connected}`);
      console.log(`   Response Time: ${health.cache.performance.responseTimeMs}ms`);
      console.log(`   Performance: ${health.cache.performance.status}`);
    } else {
      console.log('❌ Redis Health Check Failed:', health.error);
    }
  } catch (error) {
    console.log('❌ Redis Health Check Error:', (error as Error).message);
  }

  // 2. Cache Status Check
  console.log('\n📊 2. CACHE STATUS CHECK');
  try {
    const response = await fetch('http://localhost:3000/api/cache/status');
    const status = await response.json();

    if (response.ok) {
      console.log('✅ Cache System Status:');
      console.log(`   Redis entries: ${status.redis?.totalEntries || 'Unknown'}`);
      console.log(`   Fallback entries: ${status.fallback?.totalEntries || 'Unknown'}`);
      console.log(`   Hit rate: ${(status.combined?.hitRate * 100).toFixed(1)}%`);
    } else {
      console.log('❌ Cache Status Failed');
    }
  } catch (error) {
    console.log('❌ Cache Status Error:', (error as Error).message);
  }

  // 3. House Voting Test (Phase 3 Validation)
  console.log('\n📊 3. HOUSE VOTING VALIDATION');
  const testBioguideId = 'P000034'; // Nancy Pelosi - reliable test case

  try {
    const startTime = Date.now();
    const response = await fetch(
      `http://localhost:3000/api/representative/${testBioguideId}/votes`
    );
    const endTime = Date.now();

    if (response.ok) {
      const data = await response.json();
      console.log('✅ House Voting Data:');
      console.log(`   Response time: ${endTime - startTime}ms`);
      console.log(`   Votes returned: ${data.votes?.length || 0}`);
      console.log(`   Data source: ${data.dataSource}`);
      console.log(`   Success: ${data.success ? '✓' : '✗'}`);

      if (data.votes?.length > 0) {
        console.log('🎉 Phase 3 XML Parsing: WORKING!');
      } else {
        console.log('⚠️  Phase 3 XML Parsing: No votes returned (may be expected)');
      }
    } else {
      console.log('❌ House Voting Test Failed:', response.status);
    }
  } catch (error) {
    console.log('❌ House Voting Test Error:', (error as Error).message);
  }

  // 4. Batch API Test (Phase 2 Validation)
  console.log('\n📊 4. BATCH API VALIDATION');
  try {
    const startTime = Date.now();
    const response = await fetch(
      `http://localhost:3000/api/representative/${testBioguideId}/batch`
    );
    const endTime = Date.now();

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Batch API Performance:');
      console.log(`   Response time: ${endTime - startTime}ms`);
      console.log(`   Endpoints loaded: ${Object.keys(data.data || {}).length}`);
      console.log(`   Cache hits: ${data.cacheHits || 'Unknown'}`);
      console.log(
        `   Success rate: ${((data.successfulEndpoints / data.totalEndpoints) * 100).toFixed(1)}%`
      );
    } else {
      console.log('❌ Batch API Test Failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Batch API Test Error:', (error as Error).message);
  }

  // 5. Performance Summary
  console.log('\n📊 5. DEPLOYMENT SUMMARY');
  console.log('='.repeat(50));
  console.log('Phase 2-4 Monitoring Complete');
  console.log('');
  console.log('Key Metrics to Track:');
  console.log('📈 Cache Hit Rate: Target >80%');
  console.log('⚡ API Response Time: Target <2000ms');
  console.log('🎯 House Voting Success: Target >0 votes');
  console.log('🔄 Error Rates: Monitor defensive UI triggers');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Monitor user feedback on defensive UI');
  console.log('2. Track House voting data completeness');
  console.log('3. Watch cache performance under load');
  console.log('4. Monitor XML parsing success rates');
}

// Auto-run if called directly
if (require.main === module) {
  monitorDeployment().catch(console.error);
}

export { monitorDeployment };
