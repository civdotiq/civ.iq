const fs = require('fs');
const path = require('path');

// Function to find SC representatives in congress-legislators data
async function checkSCReps() {
  try {
    console.log('Checking for South Carolina representatives...\n');
    
    // Test the API directly
    const testUrl = 'http://localhost:3000/api/representatives?zip=29650';
    console.log(`Testing: ${testUrl}`);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Also test another South Carolina ZIP to see if it's state-wide
    console.log('\n\nTesting another SC ZIP (29401 - Charleston):');
    const response2 = await fetch('http://localhost:3000/api/representatives?zip=29401');
    const data2 = await response2.json();
    
    console.log('Charleston Response:', JSON.stringify(data2, null, 2));
    
    // Test a ZIP from another state to compare
    console.log('\n\nTesting Michigan ZIP (48221) for comparison:');
    const response3 = await fetch('http://localhost:3000/api/representatives?zip=48221');
    const data3 = await response3.json();
    
    console.log('Michigan Response:', JSON.stringify(data3, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSCReps();