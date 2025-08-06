// Test script to check representative coverage across multiple states
async function testRepresentativeCoverage() {
  const testZips = [
    { zip: '10001', state: 'NY', expected: 3 }, // NYC
    { zip: '90210', state: 'CA', expected: 3 }, // Beverly Hills
    { zip: '60601', state: 'IL', expected: 3 }, // Chicago
    { zip: '77001', state: 'TX', expected: 3 }, // Houston
    { zip: '33101', state: 'FL', expected: 3 }, // Miami
    { zip: '29650', state: 'SC', expected: 3 }, // Greer, SC
    { zip: '29401', state: 'SC', expected: 3 }, // Charleston, SC
    { zip: '30309', state: 'GA', expected: 3 }, // Atlanta
    { zip: '80202', state: 'CO', expected: 3 }, // Denver
    { zip: '98101', state: 'WA', expected: 3 }, // Seattle
    { zip: '48221', state: 'MI', expected: 3 }, // Detroit (known working)
  ];

  console.log('Testing representative coverage across states...\n');
  console.log('Expected: 2 Senators + 1 House Rep = 3 total per ZIP code\n');

  const results = [];

  for (const test of testZips) {
    try {
      const response = await fetch(`http://localhost:3000/api/representatives?zip=${test.zip}`);
      const data = await response.json();
      
      if (data.success) {
        const senators = data.representatives.filter(r => r.chamber === 'Senate').length;
        const houseReps = data.representatives.filter(r => r.chamber === 'House').length;
        const total = data.representatives.length;
        
        const status = total === test.expected ? '✅' : '❌';
        const issue = total < test.expected ? `MISSING ${test.expected - total}` : '';
        
        results.push({
          zip: test.zip,
          state: test.state,
          senators,
          houseReps,
          total,
          status,
          issue
        });
        
        console.log(`${status} ${test.zip} (${test.state}): ${senators} Senate + ${houseReps} House = ${total} total ${issue}`);
        
        if (houseReps === 0) {
          console.log(`   Missing House Rep for ${test.state}-${data.representatives[0]?.district || 'unknown'}`);
        }
      } else {
        console.log(`❌ ${test.zip} (${test.state}): API Error - ${data.error?.message}`);
        results.push({
          zip: test.zip,
          state: test.state,
          senators: 0,
          houseReps: 0,
          total: 0,
          status: '❌',
          issue: 'API_ERROR'
        });
      }
    } catch (error) {
      console.log(`❌ ${test.zip} (${test.state}): Network Error - ${error.message}`);
    }
  }

  console.log('\n=== SUMMARY ===');
  const working = results.filter(r => r.total === 3).length;
  const total = results.length;
  console.log(`Working correctly: ${working}/${total} ZIP codes`);
  
  const missingHouse = results.filter(r => r.houseReps === 0 && r.senators === 2);
  if (missingHouse.length > 0) {
    console.log(`\nStates missing House representatives:`);
    const affectedStates = [...new Set(missingHouse.map(r => r.state))];
    affectedStates.forEach(state => {
      console.log(`  - ${state}`);
    });
  }

  const problemStates = results.filter(r => r.total < 3).map(r => r.state);
  if (problemStates.length > 0) {
    console.log(`\nStates with issues: ${[...new Set(problemStates)].join(', ')}`);
  }
}

testRepresentativeCoverage();