/**
 * Test the finance API endpoint directly to verify the "$0" bug fix
 * Run this after starting the dev server: npm run dev
 */

const testFinanceAPI = async () => {
  const BASE_URL = 'http://localhost:3000';
  
  // Test cases - known representatives with various data scenarios
  const testCases = [
    { bioguideId: 'S000033', name: 'Bernie Sanders (VT Senate)' },
    { bioguideId: 'W000779', name: 'Ron Wyden (OR Senate)' },
    { bioguideId: 'P000197', name: 'Nancy Pelosi (CA House)' },
    { bioguideId: 'A000360', name: 'Lamar Alexander (TN - Retired)' },
    { bioguideId: 'B001230', name: 'Tammy Baldwin (WI Senate)' },
  ];

  console.log('🔍 Testing Finance API Endpoint for "$0" Bug Fix\n');
  console.log('=' .repeat(80));
  console.log('Make sure the dev server is running: npm run dev\n');

  for (const testCase of testCases) {
    console.log(`\n📊 Testing: ${testCase.name}`);
    console.log(`   BioGuide ID: ${testCase.bioguideId}`);
    console.log('-'.repeat(40));
    
    try {
      // Test default cycle (should auto-detect)
      console.log('  Testing auto-cycle detection...');
      const defaultResponse = await fetch(
        `${BASE_URL}/api/representative/${testCase.bioguideId}/finance`
      );
      
      if (!defaultResponse.ok) {
        console.log(`    ❌ HTTP ${defaultResponse.status} - ${defaultResponse.statusText}`);
        const errorData = await defaultResponse.text();
        console.log(`    Error: ${errorData.substring(0, 100)}...`);
      } else {
        const data = await defaultResponse.json();
        console.log(`    ✅ HTTP 200 - Data received`);
        console.log(`    Total Raised: $${(data.totalRaised || 0).toLocaleString()}`);
        console.log(`    Total Spent: $${(data.totalSpent || 0).toLocaleString()}`);
        console.log(`    Cash on Hand: $${(data.cashOnHand || 0).toLocaleString()}`);
        console.log(`    Data Quality: ${data.dataQuality?.overallDataConfidence || 'N/A'}`);
        
        // Check if we're getting actual values or all zeros
        const hasActualData = data.totalRaised > 0 || data.totalSpent > 0 || data.cashOnHand > 0;
        if (hasActualData) {
          console.log(`    ✨ Real financial data found!`);
        } else {
          console.log(`    ⚠️ All zeros - but response structure is correct`);
        }
      }
      
      // Test specific cycle (2024)
      console.log('\n  Testing specific cycle (2024)...');
      const cycle2024Response = await fetch(
        `${BASE_URL}/api/representative/${testCase.bioguideId}/finance?cycle=2024`
      );
      
      if (!cycle2024Response.ok) {
        console.log(`    ❌ HTTP ${cycle2024Response.status}`);
      } else {
        const data2024 = await cycle2024Response.json();
        console.log(`    ✅ HTTP 200 - 2024 cycle data received`);
        console.log(`    Total Raised: $${(data2024.totalRaised || 0).toLocaleString()}`);
      }
      
      // Test election cycles endpoint
      console.log('\n  Testing election cycles endpoint...');
      const cyclesResponse = await fetch(
        `${BASE_URL}/api/representative/${testCase.bioguideId}/election-cycles`
      );
      
      if (cyclesResponse.ok) {
        const cyclesData = await cyclesResponse.json();
        console.log(`    Available cycles: ${cyclesData.cycles?.join(', ') || 'None'}`);
        console.log(`    Default cycle: ${cyclesData.defaultCycle || 'None'}`);
      } else {
        console.log(`    ❌ Could not fetch election cycles`);
      }
      
    } catch (error) {
      console.error(`  ❌ Test failed for ${testCase.name}:`, error.message);
      console.error(`     Is the dev server running on ${BASE_URL}?`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test Summary:');
  console.log('   - API should always return HTTP 200 with data structure');
  console.log('   - Even when no FEC data exists, should return zeros not 404');
  console.log('   - This prevents the "$0" display bug in the UI');
  console.log('\n🎉 If all tests returned HTTP 200, the fix is working!');
};

// Run the test
testFinanceAPI().catch(console.error);
