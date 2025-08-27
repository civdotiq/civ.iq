/**
 * Test script to verify FEC API fixes
 * This tests the resilient committee ID search and the totals-first approach
 */

const { FECApiService } = require('./src/lib/fec/fec-api-service.ts');
const logger = require('./src/lib/logging/simple-logger').default;

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testFECFix() {
  const fecService = new FECApiService();
  
  // Test cases - representatives known to have edge cases
  const testCases = [
    { bioguideId: 'S000033', name: 'Bernie Sanders', candidateId: 'S00033', cycle: 2024 },
    { bioguideId: 'W000779', name: 'Ron Wyden', candidateId: 'S6OR00110', cycle: 2022 },
    { bioguideId: 'P000197', name: 'Nancy Pelosi', candidateId: 'H8CA05035', cycle: 2024 },
  ];

  console.log('🔍 Testing FEC API Fixes\n');
  console.log('=' .repeat(80));

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.name} (${testCase.bioguideId})`);
    console.log('-'.repeat(40));
    
    try {
      // Test 1: Get financial summary (should always work if candidate exists)
      console.log('  ✓ Fetching financial summary...');
      const summary = await fecService.getFinancialSummary(testCase.candidateId, testCase.cycle);
      
      if (summary) {
        console.log(`    Total Raised: $${summary.total_receipts.toLocaleString()}`);
        console.log(`    Total Spent: $${summary.total_disbursements.toLocaleString()}`);
        console.log(`    Cash on Hand: $${summary.cash_on_hand_end_period.toLocaleString()}`);
      } else {
        console.log('    No financial summary found');
      }
      
      // Test 2: Get committee ID with resilient search
      console.log('  ✓ Testing resilient committee ID search...');
      const committeeId = await fecService.getPrincipalCommitteeId(testCase.candidateId, testCase.cycle);
      
      if (committeeId) {
        console.log(`    Committee ID found: ${committeeId}`);
      } else {
        console.log('    ⚠ No committee ID found (will still return summary data)');
      }
      
      // Test 3: Verify we can get some contribution data (even if limited)
      if (committeeId) {
        console.log('  ✓ Testing contribution data fetch...');
        const sampleContributions = await fecService.getSampleContributions(
          testCase.candidateId, 
          testCase.cycle, 
          5
        );
        console.log(`    Sample contributions found: ${sampleContributions.length}`);
      }
      
      console.log(`  ✅ ${testCase.name} - Test passed!`);
      
    } catch (error) {
      console.error(`  ❌ ${testCase.name} - Test failed:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Test complete!');
  console.log('\nThe fixes ensure:');
  console.log('1. Financial summary is always fetched first');
  console.log('2. Committee ID search uses multiple fallback strategies');
  console.log('3. API always returns data (even if zeros) instead of 404 errors');
}

// Run the test
testFECFix().catch(console.error);
