// Direct test of external APIs with the configured keys
require('dotenv').config({ path: '.env.local' });

async function testExternalAPIs() {
  console.log('🔍 Testing External APIs Directly\n');
  
  const results = {
    congress: { name: 'Congress.gov', status: 'untested' },
    fec: { name: 'FEC', status: 'untested' },
    census: { name: 'Census Geocoding', status: 'untested' },
    gdelt: { name: 'GDELT', status: 'untested' },
    openStates: { name: 'OpenStates', status: 'untested' }
  };

  // 1. Test Congress.gov API
  if (process.env.CONGRESS_API_KEY) {
    console.log('1. Testing Congress.gov API...');
    try {
      const response = await fetch(
        `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=2&format=json`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        results.congress.status = '✅ Working';
        results.congress.details = `Found ${data.members?.length || 0} members`;
        console.log(`   ✅ Status ${response.status} - ${results.congress.details}`);
      } else {
        results.congress.status = '❌ Failed';
        results.congress.error = `HTTP ${response.status}`;
        console.log(`   ❌ Error: ${results.congress.error}`);
      }
    } catch (error) {
      results.congress.status = '❌ Failed';
      results.congress.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  No API key configured');
  }

  // 2. Test FEC API
  if (process.env.FEC_API_KEY) {
    console.log('\n2. Testing FEC API...');
    try {
      const response = await fetch(
        `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=2&is_active_candidate=true`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.ok) {
        const data = await response.json();
        results.fec.status = '✅ Working';
        results.fec.details = `Found ${data.results?.length || 0} candidates`;
        console.log(`   ✅ Status ${response.status} - ${results.fec.details}`);
      } else {
        results.fec.status = '❌ Failed';
        results.fec.error = `HTTP ${response.status}`;
        console.log(`   ❌ Error: ${results.fec.error}`);
      }
    } catch (error) {
      results.fec.status = '❌ Failed';
      results.fec.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  No API key configured');
  }

  // 3. Test Census Geocoding API (no key required)
  console.log('\n3. Testing Census Geocoding API...');
  try {
    const response = await fetch(
      'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=1600+Pennsylvania+Ave+Washington+DC&benchmark=4&vintage=Current_119th&format=json'
    );
    
    if (response.ok) {
      const data = await response.json();
      results.census.status = '✅ Working';
      results.census.details = `Found ${data.result?.addressMatches?.length || 0} matches`;
      console.log(`   ✅ Status ${response.status} - ${results.census.details}`);
    } else {
      results.census.status = '❌ Failed';
      results.census.error = `HTTP ${response.status}`;
      console.log(`   ❌ Error: ${results.census.error}`);
    }
  } catch (error) {
    results.census.status = '❌ Failed';
    results.census.error = error.message;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 4. Test GDELT API
  console.log('\n4. Testing GDELT API...');
  try {
    const response = await fetch(
      'https://api.gdeltproject.org/api/v2/doc/doc?query=Congress&mode=artlist&maxrecords=2&format=json'
    );
    
    if (response.ok) {
      const data = await response.json();
      results.gdelt.status = '✅ Working';
      results.gdelt.details = `Found ${data.articles?.length || 0} articles`;
      console.log(`   ✅ Status ${response.status} - ${results.gdelt.details}`);
    } else {
      results.gdelt.status = '❌ Failed';
      results.gdelt.error = `HTTP ${response.status}`;
      console.log(`   ❌ Error: ${results.gdelt.error}`);
    }
  } catch (error) {
    results.gdelt.status = '❌ Failed';
    results.gdelt.error = error.message;
    console.log(`   ❌ Error: ${error.message}`);
  }

  // 5. Test OpenStates API
  if (process.env.OPENSTATES_API_KEY) {
    console.log('\n5. Testing OpenStates API...');
    try {
      const response = await fetch(
        'https://v3.openstates.org/people?jurisdiction=us&per_page=2',
        { 
          headers: { 
            'Accept': 'application/json',
            'X-API-KEY': process.env.OPENSTATES_API_KEY
          } 
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        results.openStates.status = '✅ Working';
        results.openStates.details = `Found ${data.results?.length || 0} people`;
        console.log(`   ✅ Status ${response.status} - ${results.openStates.details}`);
      } else {
        results.openStates.status = '❌ Failed';
        results.openStates.error = `HTTP ${response.status}`;
        console.log(`   ❌ Error: ${results.openStates.error}`);
      }
    } catch (error) {
      results.openStates.status = '❌ Failed';
      results.openStates.error = error.message;
      console.log(`   ❌ Error: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  No API key configured');
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const working = Object.values(results).filter(r => r.status.includes('✅')).length;
  const failed = Object.values(results).filter(r => r.status.includes('❌')).length;
  
  console.log(`✅ Working: ${working}/5 APIs`);
  console.log(`❌ Failed: ${failed}/5 APIs`);
  
  if (working === 5) {
    console.log('\n🎉 All APIs are working correctly!');
  } else if (failed > 0) {
    console.log('\n⚠️  Some APIs are failing. Check the errors above.');
  }
  
  return results;
}

// Run the test
testExternalAPIs().catch(console.error);