#!/usr/bin/env npx tsx
/**
 * MVP Functionality Verification Script
 * Tests core user flows without requiring full TypeScript compliance
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testEndpoint(name: string, url: string): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${url}`);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        name,
        passed: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: data
      };
    }
    
    return {
      name,
      passed: true,
      details: {
        status: response.status,
        dataReceived: !!data,
        recordCount: Array.isArray(data) ? data.length : (data.representatives?.length || 'N/A')
      }
    };
  } catch (error) {
    return {
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTests() {
  console.log('🚀 CIV.IQ MVP Functionality Verification\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  
  const tests: TestResult[] = [];
  
  // Test 1: ZIP Code Lookup
  console.log('Testing ZIP code lookup...');
  tests.push(await testEndpoint(
    'ZIP Code Lookup (48221)',
    '/api/representatives?zip=48221'
  ));
  
  // Test 2: Representative Profile
  console.log('Testing representative profile...');
  tests.push(await testEndpoint(
    'Representative Profile (John James)',
    '/api/representative/J000302'
  ));
  
  // Test 3: Voting Records
  console.log('Testing voting records...');
  tests.push(await testEndpoint(
    'Voting Records',
    '/api/representative/J000302/votes'
  ));
  
  // Test 4: Campaign Finance
  console.log('Testing campaign finance...');
  tests.push(await testEndpoint(
    'Campaign Finance',
    '/api/representative/J000302/finance'
  ));
  
  // Test 5: District Information
  console.log('Testing district information...');
  tests.push(await testEndpoint(
    'District Info (MI-10)',
    '/api/districts/MI-10'
  ));
  
  // Test 6: Health Check
  console.log('Testing health endpoint...');
  tests.push(await testEndpoint(
    'Health Check',
    '/api/health'
  ));
  
  // Print results
  console.log('\n📊 Test Results:\n');
  
  let passedCount = 0;
  tests.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
    if (!test.passed) {
      console.log(`   Error: ${test.error}`);
    } else if (test.details) {
      console.log(`   Details:`, test.details);
    }
  });
  
  passedCount = tests.filter(t => t.passed).length;
  console.log(`\n📈 Summary: ${passedCount}/${tests.length} tests passed`);
  
  if (passedCount === tests.length) {
    console.log('\n✨ All core functionality is working! MVP is ready for deployment.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some core functionality is not working. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});