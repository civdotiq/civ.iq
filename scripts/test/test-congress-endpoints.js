/**
 * Test script to verify Congress API endpoints
 */

const bioguideId = 'P000595'; // Gary Peters
const apiKey = process.env.CONGRESS_API_KEY || '';

if (!apiKey) {
  console.error('❌ CONGRESS_API_KEY environment variable not set');
  process.exit(1);
}

const endpoints = [
  // Direct member endpoint (known to work)
  {
    name: 'Member Details',
    url: `https://api.congress.gov/v3/member/${bioguideId}?format=json&api_key=${apiKey}`
  },
  // Votes endpoint (returning 404)
  {
    name: 'Member Votes',
    url: `https://api.congress.gov/v3/member/${bioguideId}/votes?format=json&api_key=${apiKey}`
  },
  // Committees endpoint (returning 404)
  {
    name: 'Member Committees',
    url: `https://api.congress.gov/v3/member/${bioguideId}/committees?format=json&api_key=${apiKey}`
  },
  // Sponsored legislation (known to work)
  {
    name: 'Sponsored Legislation',
    url: `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?format=json&api_key=${apiKey}`
  },
  // Alternative committee endpoint patterns to test
  {
    name: 'Committee Memberships (alt)',
    url: `https://api.congress.gov/v3/member/${bioguideId}/committee-memberships?format=json&api_key=${apiKey}`
  },
  {
    name: 'Voting Record (alt)',
    url: `https://api.congress.gov/v3/member/${bioguideId}/voting-record?format=json&api_key=${apiKey}`
  }
];

async function testEndpoints() {
  console.log(`Testing Congress API endpoints for bioguideId: ${bioguideId}\n`);

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url.replace(apiKey, 'API_KEY_HIDDEN')}`);
      
      const response = await fetch(endpoint.url);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Status: ${response.status} - SUCCESS`);
        
        // Show sample of data structure
        if (data.member) {
          console.log(`   Member: ${data.member.firstName} ${data.member.lastName}`);
        } else if (data.votes) {
          console.log(`   Votes found: ${data.votes.length || 0}`);
        } else if (data.committees) {
          console.log(`   Committees found: ${data.committees.length || 0}`);
        } else if (data.sponsoredLegislation) {
          console.log(`   Sponsored bills: ${data.sponsoredLegislation.length || 0}`);
        } else {
          console.log(`   Data keys: ${Object.keys(data).slice(0, 5).join(', ')}`);
        }
      } else {
        console.log(`❌ Status: ${response.status} - ${response.statusText}`);
        
        // Try to get error details
        try {
          const errorData = await response.json();
          if (errorData.error) {
            console.log(`   Error: ${errorData.error.message || errorData.error}`);
          }
        } catch {
          // Response might not be JSON
        }
      }
    } catch (error) {
      console.log(`❌ Network Error: ${error.message}`);
    }
    
    console.log('');
  }
}

// Check if API documentation is available
async function checkApiDocs() {
  console.log('\nChecking API documentation...\n');
  
  const docUrls = [
    'https://api.congress.gov/v3/openapi.json',
    'https://api.congress.gov/v3/swagger.json',
    'https://api.congress.gov/v3'
  ];
  
  for (const url of docUrls) {
    try {
      const response = await fetch(url);
      console.log(`${url}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${url}: Failed - ${error.message}`);
    }
  }
}

// Run tests
(async () => {
  await testEndpoints();
  await checkApiDocs();
})();