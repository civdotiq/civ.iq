#!/usr/bin/env npx tsx

/**
 * Senate Voting Optimizations Test Script
 * Tests the enhanced Senate voting system performance and accuracy
 */

interface TestResult {
  bioguideId: string;
  name: string;
  firstCallTime: number;
  cachedCallTime: number;
  votesReturned: number;
  success: boolean;
  cacheEffective: boolean;
  error?: string;
}

async function testSenateOptimizations() {
  console.log('🏛️  Testing Senate Voting Optimizations...\n');

  const senateTestCases = [
    { bioguideId: 'K000367', name: 'Amy Klobuchar' },
    { bioguideId: 'S001181', name: 'Jeanne Shaheen' },
    { bioguideId: 'W000817', name: 'Elizabeth Warren' },
  ];

  const results: TestResult[] = [];

  for (const testCase of senateTestCases) {
    console.log(`📊 Testing ${testCase.name} (${testCase.bioguideId})`);

    try {
      // First call - uncached
      const firstCallStart = Date.now();
      const firstResponse = await fetch(
        `http://localhost:3000/api/representative/${testCase.bioguideId}/votes`
      );
      const firstCallTime = Date.now() - firstCallStart;
      const firstData = await firstResponse.json();

      // Wait a moment then make cached call
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second call - should be cached
      const cachedCallStart = Date.now();
      const cachedResponse = await fetch(
        `http://localhost:3000/api/representative/${testCase.bioguideId}/votes`
      );
      const cachedCallTime = Date.now() - cachedCallStart;
      const cachedData = await cachedResponse.json();

      const result: TestResult = {
        bioguideId: testCase.bioguideId,
        name: testCase.name,
        firstCallTime,
        cachedCallTime,
        votesReturned: firstData.votes?.length || 0,
        success: firstData.success && cachedData.success,
        cacheEffective: cachedCallTime < firstCallTime * 0.3, // Cache should be >70% faster
      };

      results.push(result);

      console.log(`   First call: ${firstCallTime}ms`);
      console.log(`   Cached call: ${cachedCallTime}ms`);
      console.log(`   Votes returned: ${result.votesReturned}`);
      console.log(`   Cache effective: ${result.cacheEffective ? '✅' : '❌'}`);
      console.log(`   Overall success: ${result.success ? '✅' : '❌'}\n`);
    } catch (error) {
      const errorResult: TestResult = {
        bioguideId: testCase.bioguideId,
        name: testCase.name,
        firstCallTime: 0,
        cachedCallTime: 0,
        votesReturned: 0,
        success: false,
        cacheEffective: false,
        error: (error as Error).message,
      };

      results.push(errorResult);
      console.log(`   ❌ Error: ${errorResult.error}\n`);
    }
  }

  // Performance Analysis
  console.log('📈 SENATE OPTIMIZATION ANALYSIS');
  console.log('═'.repeat(50));

  const successfulTests = results.filter(r => r.success);
  const averageFirstCall =
    successfulTests.reduce((sum, r) => sum + r.firstCallTime, 0) / successfulTests.length;
  const averageCachedCall =
    successfulTests.reduce((sum, r) => sum + r.cachedCallTime, 0) / successfulTests.length;
  const cacheEffectiveCount = results.filter(r => r.cacheEffective).length;

  console.log(`Successful tests: ${successfulTests.length}/${results.length}`);
  console.log(`Average first call: ${averageFirstCall.toFixed(0)}ms`);
  console.log(`Average cached call: ${averageCachedCall.toFixed(0)}ms`);
  console.log(`Cache effectiveness: ${cacheEffectiveCount}/${results.length} tests`);
  console.log(
    `Performance improvement: ${((1 - averageCachedCall / averageFirstCall) * 100).toFixed(1)}%`
  );

  // Optimization Success Criteria
  console.log('\n🎯 OPTIMIZATION SUCCESS CRITERIA');
  console.log('─'.repeat(40));

  const criteriaChecks = [
    {
      name: 'All Senate API calls successful',
      passed: results.every(r => r.success),
      requirement: 'All tests return voting data',
    },
    {
      name: 'Average response time < 2000ms',
      passed: averageFirstCall < 2000,
      requirement: 'First call performance target',
    },
    {
      name: 'Cache provides >70% speed improvement',
      passed: 1 - averageCachedCall / averageFirstCall > 0.7,
      requirement: 'Cache effectiveness target',
    },
    {
      name: 'All tests return voting data',
      passed: successfulTests.every(r => r.votesReturned > 0),
      requirement: 'Data availability check',
    },
  ];

  criteriaChecks.forEach(check => {
    console.log(`${check.passed ? '✅' : '❌'} ${check.name}`);
    console.log(`   ${check.requirement}`);
  });

  const overallSuccess = criteriaChecks.every(check => check.passed);

  console.log('\n' + '═'.repeat(50));
  console.log(
    `🏛️  SENATE VOTING OPTIMIZATIONS: ${overallSuccess ? '✅ SUCCESS' : '❌ NEEDS WORK'}`
  );
  console.log('═'.repeat(50));

  if (overallSuccess) {
    console.log('🎉 Senate voting system optimizations are working perfectly!');
    console.log('✨ Key improvements:');
    console.log('   • Dynamic vote number detection based on session progress');
    console.log('   • Enhanced caching with intelligent TTL');
    console.log('   • Detailed performance logging and monitoring');
    console.log('   • Consistent sub-2-second response times');
  } else {
    console.log('⚠️  Some optimization criteria not met. Review the results above.');
  }

  return { results, overallSuccess };
}

// Auto-run if called directly
if (require.main === module) {
  testSenateOptimizations()
    .then(({ overallSuccess }) => {
      process.exit(overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test script error:', error);
      process.exit(1);
    });
}

export { testSenateOptimizations };
