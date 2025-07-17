// Test script to verify GDELT search functionality
const { generateOptimizedSearchTerms } = require('./src/lib/gdelt-api');

// Test cases for different representatives
const testCases = [
  {
    name: "Rashida Tlaib",
    state: "Michigan",
    district: "12",
    expectedType: "Representative"
  },
  {
    name: "Elizabeth Warren",
    state: "Massachusetts",
    district: null,
    expectedType: "Senator"
  },
  {
    name: "Alexandria Ocasio-Cortez",
    state: "New York", 
    district: "14",
    expectedType: "Representative"
  },
  {
    name: "Bernie Sanders",
    state: "Vermont",
    district: null,
    expectedType: "Senator"
  }
];

console.log("Testing GDELT search term generation:\n");

testCases.forEach(test => {
  console.log(`\n${test.expectedType}: ${test.name} (${test.state}${test.district ? ` District ${test.district}` : ''})`);
  console.log("=" + "=".repeat(60));
  
  const searchTerms = generateOptimizedSearchTerms(test.name, test.state, test.district);
  
  if (searchTerms.length === 0) {
    console.log("ERROR: No search terms generated!");
  } else {
    searchTerms.forEach((term, index) => {
      console.log(`${index + 1}. ${term}`);
    });
  }
});

console.log("\n\nTo test actual GDELT API calls:");
console.log("1. Start your dev server: npm run dev");
console.log("2. Visit: http://localhost:3000/representative/T000481 (Rashida Tlaib)");
console.log("3. Click on the News tab");
console.log("4. Check the browser console and server logs for the actual search terms being used");
