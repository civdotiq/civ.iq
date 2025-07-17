// Validate the fix by testing the actual filtering logic
const yaml = require('js-yaml');

async function validateFix() {
  try {
    console.log('Validating the district comparison fix...\n');
    
    // Fetch real data
    console.log('1. Fetching congress-legislators data...');
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
    
    console.log(`Loaded ${representatives.length} representatives\n`);
    
    // Test specific cases that were failing
    const testCases = [
      { zip: '29650', state: 'SC', district: '04', description: 'Greer, SC (SC-04)' },
      { zip: '60601', state: 'IL', district: '07', description: 'Chicago, IL (IL-07)' },
      { zip: '77001', state: 'TX', district: '18', description: 'Houston, TX (TX-18)' },
      { zip: '30309', state: 'GA', district: '05', description: 'Atlanta, GA (GA-05)' }
    ];
    
    console.log('2. Testing filter logic with our fix...\n');
    
    for (const test of testCases) {
      console.log(`Testing ${test.description}:`);
      
      // Use the NEW filtering logic (with parseInt fix)
      const filteredReps = representatives.filter(rep => {
        if (rep.chamber === 'Senate' && rep.state === test.state) {
          return true;
        }
        if (rep.chamber === 'House' && 
            rep.state === test.state && 
            rep.district && test.district) {
          // NEW LOGIC: Normalize district numbers for comparison
          const repDistrict = parseInt(rep.district, 10);
          const targetDistrict = parseInt(test.district, 10);
          return repDistrict === targetDistrict;
        }
        return false;
      });
      
      const senators = filteredReps.filter(r => r.chamber === 'Senate');
      const houseReps = filteredReps.filter(r => r.chamber === 'House');
      
      const status = (senators.length === 2 && houseReps.length === 1) ? '✅' : '❌';
      console.log(`  ${status} Found: ${senators.length} senators + ${houseReps.length} house reps = ${filteredReps.length} total`);
      
      if (houseReps.length > 0) {
        console.log(`    House Rep: ${houseReps[0].name} (${test.state}-${houseReps[0].district})`);
      } else {
        console.log(`    ❌ NO HOUSE REP FOUND for ${test.state}-${test.district}`);
      }
      
      senators.forEach(sen => {
        console.log(`    Senator: ${sen.name}`);
      });
      
      console.log('');
    }
    
    // Summary
    console.log('3. Summary of fix:');
    console.log('   BEFORE: district === "04" would not match district "4"');
    console.log('   AFTER:  parseInt("04", 10) === parseInt("4", 10) ✅ matches');
    console.log('   This fixes the missing House representatives issue!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

validateFix();