// Debug script to check what representatives we have in our congress-legislators data
async function debugCongressData() {
  try {
    console.log('Fetching all representatives from congress-legislators...\n');
    
    // Call our congress-legislators function to see what data we have
    const response = await fetch('http://localhost:3000/api/debug/congress-current');
    const debug = await response.text();
    
    // For now, let's check by calling a specific endpoint that shows us representative counts
    console.log('Creating summary of representatives by state and chamber...\n');
    
    const states = ['NY', 'CA', 'IL', 'TX', 'FL', 'SC', 'GA', 'CO', 'WA', 'MI'];
    const summary = {};
    
    for (const state of states) {
      console.log(`Checking ${state}...`);
      
      // Test a ZIP code from each state to see what reps we get
      const testZips = {
        'NY': '10001',
        'CA': '90210', 
        'IL': '60601',
        'TX': '77001',
        'FL': '33101',
        'SC': '29650',
        'GA': '30309',
        'CO': '80202',
        'WA': '98101',
        'MI': '48221'
      };
      
      const zip = testZips[state];
      const response = await fetch(`http://localhost:3000/api/representatives?zip=${zip}`);
      const data = await response.json();
      
      if (data.success) {
        const senators = data.representatives.filter(r => r.chamber === 'Senate');
        const houseReps = data.representatives.filter(r => r.chamber === 'House');
        
        summary[state] = {
          senators: senators.length,
          senatorNames: senators.map(s => s.name),
          houseReps: houseReps.length,
          houseRepNames: houseReps.map(h => `${h.name} (${h.district})`),
          total: data.representatives.length
        };
        
        console.log(`  ${state}: ${senators.length} senators, ${houseReps.length} house reps`);
        if (houseReps.length > 0) {
          console.log(`    House: ${houseReps.map(h => `${h.name} (${h.district})`).join(', ')}`);
        }
      }
    }
    
    console.log('\n=== DETAILED SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));
    
    // Let's also check if the issue is with our filtering logic
    console.log('\n=== CHECKING ONE SPECIFIC CASE ===');
    console.log('Testing SC ZIP 29650 which should map to SC-04...\n');
    
    const scResponse = await fetch('http://localhost:3000/api/representatives?zip=29650');
    const scData = await scResponse.json();
    
    console.log('SC Response:', JSON.stringify(scData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugCongressData();