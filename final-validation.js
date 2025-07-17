// Final validation of the district comparison fix
const yaml = require('js-yaml');

async function finalValidation() {
  try {
    console.log('🔍 FINAL VALIDATION OF REPRESENTATIVE LOOKUP FIX\n');
    console.log('Testing the district comparison fix across multiple ZIP codes...\n');
    
    // Fetch congress-legislators data
    const response = await fetch('https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml');
    const yamlText = await response.text();
    const legislators = yaml.load(yamlText);
    
    // Transform to our format
    const representatives = legislators.map(legislator => {
      const currentTerm = legislator.terms[legislator.terms.length - 1];
      return {
        bioguideId: legislator.id.bioguide,
        name: `${legislator.name.first} ${legislator.name.last}`,
        party: currentTerm.party,
        state: currentTerm.state,
        district: currentTerm.district?.toString(),
        chamber: currentTerm.type === 'sen' ? 'Senate' : 'House'
      };
    });
    
    // Test cases representing the districts that were failing
    const testCases = [
      { state: 'SC', district: '04', description: 'South Carolina District 4' },
      { state: 'IL', district: '07', description: 'Illinois District 7' },
      { state: 'GA', district: '05', description: 'Georgia District 5' },
      { state: 'CO', district: '01', description: 'Colorado District 1' },
      { state: 'WA', district: '07', description: 'Washington District 7' },
      { state: 'TX', district: '18', description: 'Texas District 18' },
      { state: 'NY', district: '12', description: 'New York District 12' },
      { state: 'CA', district: '12', description: 'California District 12' },
      { state: 'FL', district: '27', description: 'Florida District 27' },
      { state: 'MI', district: '13', description: 'Michigan District 13' }
    ];
    
    let successCount = 0;
    let totalTests = testCases.length;
    
    console.log('Testing district lookup with FIXED logic:\n');
    
    for (const test of testCases) {
      // Use the FIXED filtering logic
      const filteredReps = representatives.filter(rep => {
        if (rep.chamber === 'Senate' && rep.state === test.state) {
          return true;
        }
        if (rep.chamber === 'House' && 
            rep.state === test.state && 
            rep.district && test.district) {
          // FIXED LOGIC: Normalize district numbers for comparison
          const repDistrict = parseInt(rep.district, 10);
          const targetDistrict = parseInt(test.district, 10);
          return repDistrict === targetDistrict;
        }
        return false;
      });
      
      const senators = filteredReps.filter(r => r.chamber === 'Senate');
      const houseReps = filteredReps.filter(r => r.chamber === 'House');
      
      const hasCorrectCount = senators.length === 2 && houseReps.length === 1;
      const status = hasCorrectCount ? '✅' : '❌';
      
      if (hasCorrectCount) successCount++;
      
      console.log(`${status} ${test.description} (${test.state}-${test.district}):`);
      console.log(`    ${senators.length} senators + ${houseReps.length} house reps = ${filteredReps.length} total`);
      
      if (houseReps.length > 0) {
        console.log(`    House Rep: ${houseReps[0].name}`);
      } else {
        // Check if there should be a House rep for this district
        const stateHouseReps = representatives.filter(r => r.chamber === 'House' && r.state === test.state);
        const targetDistrict = parseInt(test.district, 10);
        const availableDistricts = [...new Set(stateHouseReps.map(r => parseInt(r.district, 10)).filter(d => !isNaN(d)))].sort();
        
        if (availableDistricts.includes(targetDistrict)) {
          console.log(`    ❌ MISSING House Rep for district ${targetDistrict}`);
        } else {
          console.log(`    ⚠️  District ${targetDistrict} not found in available districts: [${availableDistricts.join(', ')}]`);
        }
      }
      
      senators.forEach(sen => {
        console.log(`    Senator: ${sen.name}`);
      });
      
      console.log('');
    }
    
    // Results summary
    console.log('='.repeat(60));
    console.log(`RESULTS: ${successCount}/${totalTests} districts working correctly`);
    console.log(`Success rate: ${Math.round((successCount/totalTests) * 100)}%`);
    
    if (successCount === totalTests) {
      console.log('🎉 ALL TESTS PASSED! The fix is working perfectly.');
    } else {
      console.log(`⚠️  ${totalTests - successCount} districts still have issues (may be data-related)`);
    }
    
    console.log('\n📊 WHAT WAS FIXED:');
    console.log('   PROBLEM: Census API returns districts like "04", "07", "01"');
    console.log('   PROBLEM: Congress data stores districts as "4", "7", "1"');
    console.log('   SOLUTION: Use parseInt() to normalize both sides for comparison');
    console.log('   RESULT: String "04" === String "4" ❌ becomes parseInt("04") === parseInt("4") ✅');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

finalValidation();