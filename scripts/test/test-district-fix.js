// Test the district comparison fix
function testDistrictComparison() {
  console.log('Testing district comparison logic fix...\n');
  
  // Simulate the old logic (broken)
  function oldComparison(repDistrict, targetDistrict) {
    return repDistrict === targetDistrict;
  }
  
  // New logic (fixed)
  function newComparison(repDistrict, targetDistrict) {
    if (!repDistrict || !targetDistrict) return false;
    const repNum = parseInt(repDistrict, 10);
    const targetNum = parseInt(targetDistrict, 10);
    return repNum === targetNum;
  }
  
  // Test cases
  const testCases = [
    { rep: '4', target: '04', expected: true, description: 'SC-04 case: "4" vs "04"' },
    { rep: '1', target: '01', expected: true, description: 'Leading zero: "1" vs "01"' },
    { rep: '10', target: '10', expected: true, description: 'Double digit: "10" vs "10"' },
    { rep: '00', target: '0', expected: true, description: 'At-large: "00" vs "0"' },
    { rep: '5', target: '6', expected: false, description: 'Different districts: "5" vs "6"' }
  ];
  
  console.log('OLD LOGIC (BROKEN):');
  testCases.forEach(test => {
    const result = oldComparison(test.rep, test.target);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.description}: ${test.rep} === ${test.target} → ${result}`);
  });
  
  console.log('\nNEW LOGIC (FIXED):');
  testCases.forEach(test => {
    const result = newComparison(test.rep, test.target);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${test.description}: parseInt(${test.rep}) === parseInt(${test.target}) → ${result}`);
  });
  
  // Specific SC-04 test
  console.log('\n=== SPECIFIC SC-04 TEST ===');
  const williamTimmons = { district: '4', state: 'SC', chamber: 'House', name: 'William Timmons' };
  const sc04District = { district: '04', state: 'SC' };
  
  const oldMatch = williamTimmons.chamber === 'House' && 
                   williamTimmons.state === sc04District.state && 
                   williamTimmons.district === sc04District.district;
                   
  const newMatch = williamTimmons.chamber === 'House' && 
                   williamTimmons.state === sc04District.state && 
                   parseInt(williamTimmons.district, 10) === parseInt(sc04District.district, 10);
  
  console.log(`Old logic: ${williamTimmons.name} matches SC-04? ${oldMatch ? '✅' : '❌'}`);
  console.log(`New logic: ${williamTimmons.name} matches SC-04? ${newMatch ? '✅' : '❌'}`);
}

testDistrictComparison();