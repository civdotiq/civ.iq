// Test API health and connectivity
async function testAPIHealth() {
  console.log('🔍 Testing API Health and Connectivity\n');
  
  // Test server endpoint
  try {
    console.log('1. Testing local API health endpoint...');
    const healthResponse = await fetch('http://localhost:3000/api/health');
    const healthData = await healthResponse.json();
    
    console.log('API Keys Status:');
    console.log(`  Congress.gov: ${healthData.apiKeys?.congress ? '✅' : '❌'}`);
    console.log(`  FEC: ${healthData.apiKeys?.fec ? '✅' : '❌'}`);
    console.log(`  Census: ${healthData.apiKeys?.census ? '✅' : '❌'}`);
    console.log(`  OpenStates: ${healthData.apiKeys?.openstates ? '✅' : '❌'}`);
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
  }
  
  console.log('\n2. Testing env-check endpoint...');
  try {
    const envResponse = await fetch('http://localhost:3000/api/env-check');
    const envData = await envResponse.json();
    
    console.log('Environment Configuration:');
    console.log(`  NODE_ENV: ${envData.NODE_ENV}`);
    console.log(`  Congress API Key: ${envData.congressKeyPreview} (${envData.congressKeyLength} chars)`);
    console.log(`  FEC API Key: ${envData.fecKeyPreview} (${envData.fecKeyLength} chars)`);
    console.log(`  Census API Key: ${envData.censusKeyPreview || 'N/A'} (${envData.censusKeyLength || 0} chars)`);
  } catch (error) {
    console.log('❌ Env-check error:', error.message);
  }
  
  console.log('\n3. Testing debug endpoint...');
  try {
    const debugResponse = await fetch('http://localhost:3000/api/debug');
    const debugData = await debugResponse.json();
    
    console.log('API Test Results:');
    if (debugData.tests?.congress) {
      console.log(`  Congress.gov: ${debugData.tests.congress.success ? '✅' : '❌'} ${debugData.tests.congress.message}`);
    }
    if (debugData.tests?.fec) {
      console.log(`  FEC: ${debugData.tests.fec.success ? '✅' : '❌'} ${debugData.tests.fec.message}`);
    }
    if (debugData.tests?.census) {
      console.log(`  Census: ${debugData.tests.census.success ? '✅' : '❌'} ${debugData.tests.census.message || 'No API key'}`);
    }
  } catch (error) {
    console.log('❌ Debug endpoint error:', error.message);
  }
  
  console.log('\n4. Testing representative lookup...');
  try {
    const repResponse = await fetch('http://localhost:3000/api/representatives?zip=48221');
    const repData = await repResponse.json();
    
    if (repData.success) {
      console.log(`  ✅ Found ${repData.representatives.length} representatives for ZIP 48221`);
      console.log(`  Data source: ${repData.metadata?.source || 'unknown'}`);
    } else {
      console.log(`  ❌ Error: ${repData.error?.message}`);
    }
  } catch (error) {
    console.log('❌ Representative lookup error:', error.message);
  }
  
  console.log('\n5. Testing specific representative data...');
  try {
    // Test with a known representative (Tim Scott - S001184)
    const profileResponse = await fetch('http://localhost:3000/api/representative/S001184');
    const profileData = await profileResponse.json();
    
    if (profileData.success) {
      const rep = profileData.representative;
      console.log(`  ✅ Found ${rep.name} (${rep.bioguideId})`);
      console.log(`     Has photo: ${rep.photoUrl && !rep.photoUrl.includes('placeholder') ? '✅' : '❌'}`);
      console.log(`     Has contact: ${rep.phone ? '✅' : '❌'}`);
      console.log(`     Has committees: ${rep.committees?.length > 0 ? '✅' : '❌'}`);
    } else {
      console.log(`  ❌ Error: ${profileData.error?.message}`);
    }
  } catch (error) {
    console.log('❌ Representative profile error:', error.message);
  }
  
  console.log('\n6. Testing committee data (if Congress API works)...');
  try {
    const committeeResponse = await fetch('http://localhost:3000/api/representative/S001184/committees');
    const committeeData = await committeeResponse.json();
    
    if (committeeData.success) {
      console.log(`  ✅ Found ${committeeData.committees.length} committees`);
      if (committeeData.committees.length > 0) {
        console.log(`     Example: ${committeeData.committees[0].name}`);
      }
    } else {
      console.log(`  ❌ Error: ${committeeData.error?.message}`);
    }
  } catch (error) {
    console.log('❌ Committee data error:', error.message);
  }
  
  console.log('\n7. Testing voting records...');
  try {
    const votesResponse = await fetch('http://localhost:3000/api/representative/S001184/votes');
    const votesData = await votesResponse.json();
    
    if (votesData.success) {
      console.log(`  ✅ Found ${votesData.votes.length} votes`);
      console.log(`     Data type: ${votesData.metadata?.dataType || 'unknown'}`);
    } else {
      console.log(`  ❌ Error: ${votesData.error?.message}`);
    }
  } catch (error) {
    console.log('❌ Voting records error:', error.message);
  }
  
  console.log('\n8. Testing campaign finance (FEC)...');
  try {
    const financeResponse = await fetch('http://localhost:3000/api/representative/S001184/finance');
    const financeData = await financeResponse.json();
    
    if (financeData.success) {
      console.log(`  ✅ Found campaign finance data`);
      console.log(`     Total raised: $${financeData.data?.totalRaised || 0}`);
    } else {
      console.log(`  ❌ Error: ${financeData.error?.message}`);
    }
  } catch (error) {
    console.log('❌ Campaign finance error:', error.message);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Check the results above to see which APIs are working properly.');
  console.log('If APIs show as configured but fail to connect, the keys may be invalid or expired.');
}

// Run the test
testAPIHealth().catch(console.error);