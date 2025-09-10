#!/usr/bin/env npx tsx

/**
 * FEC Finance API Optimizations Test Script
 * Tests the restored FEC finance system performance and data accuracy
 */

interface FECTestResult {
  bioguideId: string;
  name: string;
  hasFecMapping: boolean;
  firstCallTime: number;
  cachedCallTime: number;
  success: boolean;
  totalRaised: number;
  dataConfidence: string;
  cacheEffective: boolean;
  error?: string;
}

async function testFECOptimizations() {
  console.log('💰 Testing FEC Finance API Optimizations...\n');

  const fecTestCases = [
    // Representatives WITH FEC mappings
    { bioguideId: 'P000197', name: 'Nancy Pelosi', expectedMapping: true },
    { bioguideId: 'S000148', name: 'Chuck Schumer', expectedMapping: true },
    { bioguideId: 'M000355', name: 'Mitch McConnell', expectedMapping: true },

    // Representatives WITHOUT FEC mappings (should handle gracefully)
    { bioguideId: 'K000367', name: 'Amy Klobuchar', expectedMapping: false },
    { bioguideId: 'S001181', name: 'Jeanne Shaheen', expectedMapping: false },
  ];

  const results: FECTestResult[] = [];

  for (const testCase of fecTestCases) {
    console.log(`💳 Testing ${testCase.name} (${testCase.bioguideId})`);

    try {
      // First call - uncached
      const firstCallStart = Date.now();
      const firstResponse = await fetch(
        `http://localhost:3000/api/representative/${testCase.bioguideId}/finance`
      );
      const firstCallTime = Date.now() - firstCallStart;
      const firstData = await firstResponse.json();

      // Wait a moment then make cached call
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second call - should be cached
      const cachedCallStart = Date.now();
      const cachedResponse = await fetch(
        `http://localhost:3000/api/representative/${testCase.bioguideId}/finance`
      );
      const cachedCallTime = Date.now() - cachedCallStart;
      const cachedData = await cachedResponse.json();

      const result: FECTestResult = {
        bioguideId: testCase.bioguideId,
        name: testCase.name,
        hasFecMapping: firstData.metadata?.hasFecMapping || false,
        firstCallTime,
        cachedCallTime,
        success: firstResponse.ok && cachedResponse.ok,
        totalRaised: firstData.totalRaised || 0,
        dataConfidence: firstData.dataQuality?.overallDataConfidence || 'unknown',
        cacheEffective:
          cachedData.metadata?.cacheHit === true && cachedCallTime < firstCallTime * 0.5,
      };

      results.push(result);

      console.log(`   FEC mapping: ${result.hasFecMapping ? '✅' : '❌'}`);
      console.log(`   First call: ${firstCallTime}ms`);
      console.log(`   Cached call: ${cachedCallTime}ms`);
      console.log(`   Total raised: $${result.totalRaised.toLocaleString()}`);
      console.log(`   Data confidence: ${result.dataConfidence}`);
      console.log(`   Cache effective: ${result.cacheEffective ? '✅' : '❌'}`);
      console.log(`   Overall success: ${result.success ? '✅' : '❌'}\n`);
    } catch (error) {
      const errorResult: FECTestResult = {
        bioguideId: testCase.bioguideId,
        name: testCase.name,
        hasFecMapping: false,
        firstCallTime: 0,
        cachedCallTime: 0,
        success: false,
        totalRaised: 0,
        dataConfidence: 'error',
        cacheEffective: false,
        error: (error as Error).message,
      };

      results.push(errorResult);
      console.log(`   ❌ Error: ${errorResult.error}\n`);
    }
  }

  // Performance Analysis
  console.log('📊 FEC FINANCE OPTIMIZATION ANALYSIS');
  console.log('═'.repeat(60));

  const successfulTests = results.filter(r => r.success);
  const mappedTests = results.filter(r => r.hasFecMapping);
  const unmappedTests = results.filter(r => !r.hasFecMapping);

  const averageFirstCall =
    successfulTests.reduce((sum, r) => sum + r.firstCallTime, 0) / successfulTests.length;
  const averageCachedCall =
    successfulTests.reduce((sum, r) => sum + r.cachedCallTime, 0) / successfulTests.length;
  const cacheEffectiveCount = results.filter(r => r.cacheEffective).length;
  const totalFinanceData = mappedTests.reduce((sum, r) => sum + r.totalRaised, 0);

  console.log(`Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`Representatives with FEC mapping: ${mappedTests.length}`);
  console.log(`Representatives without FEC mapping: ${unmappedTests.length}`);
  console.log(`Average first call: ${averageFirstCall.toFixed(0)}ms`);
  console.log(`Average cached call: ${averageCachedCall.toFixed(0)}ms`);
  console.log(`Cache effectiveness: ${cacheEffectiveCount}/${results.length} tests`);
  console.log(`Total finance data retrieved: $${totalFinanceData.toLocaleString()}`);
  console.log(
    `Performance improvement: ${((1 - averageCachedCall / averageFirstCall) * 100).toFixed(1)}%`
  );

  // Success Criteria
  console.log('\n🎯 FEC OPTIMIZATION SUCCESS CRITERIA');
  console.log('─'.repeat(50));

  const criteriaChecks = [
    {
      name: 'All FEC API calls successful',
      passed: results.every(r => r.success),
      requirement: 'All tests complete without errors',
    },
    {
      name: 'FEC mappings working correctly',
      passed: mappedTests.every(r => r.hasFecMapping && r.totalRaised > 0),
      requirement: 'Representatives with mappings return real data',
    },
    {
      name: 'No-mapping handling graceful',
      passed: unmappedTests.every(r => !r.hasFecMapping && r.success),
      requirement: 'Representatives without mappings handled gracefully',
    },
    {
      name: 'Cache provides >50% speed improvement',
      passed: 1 - averageCachedCall / averageFirstCall > 0.5,
      requirement: 'Cache effectiveness target',
    },
    {
      name: 'Average response time < 3000ms',
      passed: averageFirstCall < 3000,
      requirement: 'First call performance target',
    },
    {
      name: 'Real FEC data retrieved',
      passed: totalFinanceData > 1000000, // At least $1M in total finance data
      requirement: 'Meaningful financial data returned',
    },
  ];

  criteriaChecks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
    console.log(`   ${check.requirement}`);
  });

  const overallSuccess = criteriaChecks.every(check => check.passed);

  console.log('\n' + '═'.repeat(60));
  console.log(
    `💰 FEC FINANCE API OPTIMIZATIONS: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS WORK'}`
  );
  console.log('═'.repeat(60));

  if (overallSuccess) {
    console.log('🎉 FEC Finance API optimizations are working perfectly!');
    console.log('✨ Key improvements:');
    console.log('   • Restored from emergency hotfix mode');
    console.log('   • Real FEC.gov API integration with proper error handling');
    console.log('   • Intelligent caching with 6-hour TTL for successful responses');
    console.log('   • Graceful handling of representatives without FEC mappings');
    console.log('   • Sub-3-second response times with proper fallbacks');
  } else {
    console.log('⚠️  Some optimization criteria not met. Review the results above.');
  }

  return { results, overallSuccess };
}

// Auto-run if called directly
if (require.main === module) {
  testFECOptimizations()
    .then(({ overallSuccess }) => {
      process.exit(overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ FEC test script error:', error);
      process.exit(1);
    });
}

export { testFECOptimizations };
