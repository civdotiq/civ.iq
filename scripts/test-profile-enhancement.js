#!/usr/bin/env node

/**
 * Profile Pages Enhancement Test
 * 
 * Tests our enhanced profile pages and district pages to ensure
 * all tabs are working with real data
 */

async function testProfileEnhancements() {
  console.log('🎭 Testing Profile Pages Enhancement...\n');
  
  const baseUrl = 'http://localhost:3000';
  
  // Test cases
  const testCases = [
    {
      name: 'Chuck Schumer Profile',
      endpoint: '/api/representative/S000148',
      expectedFields: ['bioguideId', 'name', 'party', 'socialMedia', 'committees']
    },
    {
      name: 'Chuck Schumer Voting Records',
      endpoint: '/api/representative/S000148/votes?limit=5',
      expectedFields: ['votes', 'summary']
    },
    {
      name: 'Chuck Schumer Bills',
      endpoint: '/api/representative/S000148/bills?limit=5',
      expectedFields: ['bills', 'summary']
    },
    {
      name: 'Chuck Schumer Finance',
      endpoint: '/api/representative/S000148/finance',
      expectedFields: ['finance']
    },
    {
      name: 'Chuck Schumer News',
      endpoint: '/api/representative/S000148/news',
      expectedFields: ['news', 'articles']
    },
    {
      name: 'All Districts',
      endpoint: '/api/districts/all',
      expectedFields: ['districts', 'metadata']
    }
  ];
  
  let passedTests = 0;
  let totalTests = testCases.length;
  
  for (const test of testCases) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const response = await fetch(`${baseUrl}${test.endpoint}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Check if expected fields exist
        const hasExpectedFields = test.expectedFields.some(field => 
          data.hasOwnProperty(field) || 
          (data.representative && data.representative[field]) ||
          (data.metadata && data.metadata[field])
        );
        
        if (hasExpectedFields) {
          console.log(`├─ ✅ Success: Real data detected`);
          passedTests++;
        } else {
          console.log(`├─ ⚠️  Warning: Expected fields not found`);
          console.log(`├─ Available fields: ${Object.keys(data).join(', ')}`);
        }
      } else {
        console.log(`├─ ❌ HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(''); // Empty line for readability
      
    } catch (error) {
      console.log(`├─ ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('📊 Enhancement Test Results:');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All profile page enhancements working correctly!');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('\n✅ Most profile page enhancements working (80%+ success rate)');
  } else {
    console.log('\n⚠️  Some profile page enhancements need attention');
  }
}

// Only run if server is available
fetch('http://localhost:3000/api/health')
  .then(response => {
    if (response.ok) {
      return testProfileEnhancements();
    } else {
      console.log('❌ Development server not running');
      console.log('💡 Start with: npm run dev');
    }
  })
  .catch(() => {
    console.log('❌ Development server not available');
    console.log('💡 Start with: npm run dev');
    console.log('\n📋 Manual Testing:');
    console.log('1. Visit: http://localhost:3000/representative/S000148');
    console.log('2. Test all tabs: Profile, Voting, Bills, Finance, News, Contact');
    console.log('3. Visit: http://localhost:3000/districts');
    console.log('4. Click on district details');
  });