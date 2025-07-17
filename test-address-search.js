// Test script to verify address search functionality
async function testAddressSearch() {
  console.log('🔍 Testing Address Search Functionality\n');
  
  const testCases = [
    {
      query: '1600 Pennsylvania Ave Washington DC',
      type: 'address',
      description: 'White House address'
    },
    {
      query: '123 Main St New York NY',
      type: 'address',
      description: 'Generic NYC address'
    },
    {
      query: '48221',
      type: 'zip',
      description: 'Detroit ZIP code'
    },
    {
      query: '350 5th Ave New York NY 10118',
      type: 'address',
      description: 'Empire State Building'
    },
    {
      query: 'Golden Gate Bridge San Francisco CA',
      type: 'address',
      description: 'Landmark address'
    }
  ];
  
  for (const test of testCases) {
    console.log(`Testing ${test.type}: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/representatives-search?q=${encodeURIComponent(test.query)}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.representatives.length} representatives`);
        console.log(`   District: ${data.district.state}-${data.district.district}`);
        console.log(`   District Name: ${data.district.districtName}`);
        if (data.district.matchedAddress) {
          console.log(`   Matched Address: ${data.district.matchedAddress}`);
        }
        console.log(`   Representatives:`);
        data.representatives.forEach(rep => {
          console.log(`     - ${rep.name} (${rep.chamber})`);
        });
      } else {
        console.log(`❌ Error: ${data.error?.message}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log(''); // Empty line between tests
  }
}

// Test the Census API geocoding directly
async function testCensusGeocoding() {
  console.log('🗺️ Testing Census API Geocoding Directly\n');
  
  const testAddress = '1600 Pennsylvania Ave Washington DC';
  console.log(`Testing address: "${testAddress}"`);
  
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encodeURIComponent(testAddress)}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.result?.addressMatches?.length > 0) {
      const match = data.result.addressMatches[0];
      console.log(`✅ Census geocoding successful`);
      console.log(`   Matched Address: ${match.matchedAddress}`);
      console.log(`   Coordinates: ${match.coordinates.y}, ${match.coordinates.x}`);
      
      const districts = match.geographies['119th Congressional Districts'];
      if (districts && districts.length > 0) {
        const district = districts[0];
        console.log(`   Congressional District: ${district.STATE}-${district.CD119}`);
        console.log(`   District Name: ${district.NAME}`);
      }
    } else {
      console.log(`❌ No address matches found`);
    }
  } catch (error) {
    console.log(`❌ Census API error: ${error.message}`);
  }
}

// Run both tests
async function runTests() {
  await testCensusGeocoding();
  console.log('\n' + '='.repeat(60) + '\n');
  await testAddressSearch();
}

runTests().catch(console.error);