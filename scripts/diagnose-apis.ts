// scripts/diagnose-apis.ts
// Run with: npx tsx scripts/diagnose-apis.ts

import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface ApiTest {
  name: string;
  url: string;
  requiresAuth: boolean;
  expectedStatus: number;
  critical: boolean;
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testApi(test: ApiTest): Promise<boolean> {
  try {
    log(`Testing ${test.name}...`, 'cyan');

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Add API key if required
    if (test.requiresAuth) {
      if (test.url.includes('congress.gov')) {
        const key = process.env.CONGRESS_API_KEY;
        if (!key) {
          log(`  ❌ Missing CONGRESS_API_KEY`, 'red');
          return false;
        }
        // Congress.gov uses query parameter for API key
        test.url = test.url.includes('?')
          ? `${test.url}&api_key=${key}`
          : `${test.url}?api_key=${key}`;
      } else if (test.url.includes('fec.gov')) {
        const key = process.env.FEC_API_KEY;
        if (!key) {
          log(`  ❌ Missing FEC_API_KEY`, 'red');
          return false;
        }
        headers['X-Api-Key'] = key;
      }
    }

    const response = await fetch(test.url, { headers });

    if (response.status === test.expectedStatus) {
      const data = await response.json();
      log(`  ✅ ${test.name} - Status: ${response.status}`, 'green');

      // Log sample data structure
      if (data) {
        const keys = Object.keys(data).slice(0, 5);
        log(`     Data keys: ${keys.join(', ')}`, 'blue');
      }
      return true;
    } else {
      log(`  ❌ ${test.name} - Expected ${test.expectedStatus}, got ${response.status}`, 'red');

      // Try to get error details
      try {
        const errorText = await response.text();
        if (errorText) {
          log(`     Error: ${errorText.substring(0, 200)}`, 'yellow');
        }
      } catch {}

      return false;
    }
  } catch (error) {
    log(
      `  ❌ ${test.name} - Network error: ${error instanceof Error ? error.message : 'Unknown'}`,
      'red'
    );
    return false;
  }
}

async function checkEnvironment() {
  log('\n=== Environment Check ===\n', 'cyan');

  const requiredVars = ['CONGRESS_API_KEY', 'FEC_API_KEY', 'CENSUS_API_KEY'];

  let allPresent = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      log(`✅ ${varName}: ${value.substring(0, 10)}...`, 'green');
    } else {
      log(`❌ ${varName}: Missing`, 'red');
      allPresent = false;
    }
  }

  return allPresent;
}

async function testCongressApi() {
  log('\n=== Congress.gov API Tests ===\n', 'cyan');

  const tests: ApiTest[] = [
    {
      name: 'Congress.gov Base API',
      url: 'https://api.congress.gov/v3',
      requiresAuth: true,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Member List',
      url: 'https://api.congress.gov/v3/member?limit=1',
      requiresAuth: true,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Specific Member (Nancy Pelosi)',
      url: 'https://api.congress.gov/v3/member/P000197',
      requiresAuth: true,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Member Sponsored Legislation',
      url: 'https://api.congress.gov/v3/member/P000197/sponsored-legislation?limit=1',
      requiresAuth: true,
      expectedStatus: 200,
      critical: false,
    },
    {
      name: 'Bills Endpoint',
      url: 'https://api.congress.gov/v3/bill/119?limit=1',
      requiresAuth: true,
      expectedStatus: 200,
      critical: false,
    },
    {
      name: 'Roll Call Votes (House)',
      url: 'https://api.congress.gov/v3/house/119/1/rollCall',
      requiresAuth: true,
      expectedStatus: 200,
      critical: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testApi(test);
    if (success) passed++;
    else failed++;

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log(`\nCongress.gov Results: ${passed} passed, ${failed} failed`, passed > 0 ? 'green' : 'red');
  return failed === 0;
}

async function testFECApi() {
  log('\n=== FEC API Tests ===\n', 'cyan');

  const tests: ApiTest[] = [
    {
      name: 'FEC API Base',
      url: 'https://api.open.fec.gov/v1',
      requiresAuth: false,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Candidate Search',
      url:
        'https://api.open.fec.gov/v1/candidates?api_key=' + process.env.FEC_API_KEY + '&per_page=1',
      requiresAuth: false, // Key is in URL
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Committee Search',
      url:
        'https://api.open.fec.gov/v1/committees?api_key=' + process.env.FEC_API_KEY + '&per_page=1',
      requiresAuth: false, // Key is in URL
      expectedStatus: 200,
      critical: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testApi(test);
    if (success) passed++;
    else failed++;

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log(`\nFEC Results: ${passed} passed, ${failed} failed`, passed > 0 ? 'green' : 'red');
  return failed === 0;
}

async function testGDELTApi() {
  log('\n=== GDELT API Tests ===\n', 'cyan');

  const tests: ApiTest[] = [
    {
      name: 'GDELT DOC API',
      url: 'https://api.gdeltproject.org/api/v2/doc/doc?query="Nancy Pelosi"&mode=artlist&maxrecords=1&format=json',
      requiresAuth: false,
      expectedStatus: 200,
      critical: false,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testApi(test);
    if (success) passed++;
    else failed++;
  }

  log(`\nGDELT Results: ${passed} passed, ${failed} failed`, passed > 0 ? 'green' : 'red');
  return failed === 0;
}

async function testLocalEndpoints() {
  log('\n=== Local API Endpoints ===\n', 'cyan');

  const baseUrl = 'http://localhost:3000';
  const testBioguideId = 'P000197'; // Nancy Pelosi

  const tests: ApiTest[] = [
    {
      name: 'Representative Profile',
      url: `${baseUrl}/api/representative/${testBioguideId}`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Representative Votes',
      url: `${baseUrl}/api/representative/${testBioguideId}/votes`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Representative Bills',
      url: `${baseUrl}/api/representative/${testBioguideId}/bills`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: true,
    },
    {
      name: 'Representative Finance',
      url: `${baseUrl}/api/representative/${testBioguideId}/finance`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: false,
    },
    {
      name: 'Representative News',
      url: `${baseUrl}/api/representative/${testBioguideId}/news`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: false,
    },
    {
      name: 'Batch API',
      url: `${baseUrl}/api/representative/${testBioguideId}/batch`,
      requiresAuth: false,
      expectedStatus: 200,
      critical: true,
    },
  ];

  log('Make sure the dev server is running (npm run dev)', 'yellow');
  log('Testing local endpoints...', 'cyan');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testApi(test);
    if (success) passed++;
    else failed++;

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  log(`\nLocal Results: ${passed} passed, ${failed} failed`, passed > 0 ? 'green' : 'red');
  return failed === 0;
}

async function suggestFixes() {
  log('\n=== Suggested Fixes ===\n', 'cyan');

  const fixes = [];

  // Check API keys
  if (!process.env.CONGRESS_API_KEY) {
    fixes.push({
      issue: 'Missing CONGRESS_API_KEY',
      fix: '1. Go to https://api.congress.gov/sign-up/\n2. Sign up for a free API key\n3. Add to .env.local: CONGRESS_API_KEY=your_key_here',
    });
  }

  if (!process.env.FEC_API_KEY) {
    fixes.push({
      issue: 'Missing FEC_API_KEY',
      fix: '1. Go to https://api.open.fec.gov/developers/\n2. Sign up for a free API key\n3. Add to .env.local: FEC_API_KEY=your_key_here',
    });
  }

  // Check for common issues
  fixes.push({
    issue: 'API endpoints returning empty data',
    fix: `The Congress.gov API structure has changed. The voting records endpoint doesn't exist as expected.
    
Temporary fixes:
1. The app correctly returns empty arrays per the no-mock-data policy
2. Consider implementing Senate.gov XML parsing for Senate votes
3. Use the bills endpoint with recorded votes as a workaround
4. Monitor Congress.gov API documentation for updates`,
  });

  fixes.push({
    issue: 'CORS errors on GDELT API',
    fix: `GDELT API might be blocked by CORS in browser. Solutions:
1. Ensure all GDELT calls go through your Next.js API routes (server-side)
2. Check if GDELT is temporarily down
3. Consider implementing a fallback news source`,
  });

  for (const { issue, fix } of fixes) {
    log(`\n❗ ${issue}`, 'yellow');
    log(`   Fix: ${fix}`, 'blue');
  }
}

async function main() {
  log('=================================', 'cyan');
  log('   CIV.IQ API Diagnostic Tool   ', 'cyan');
  log('=================================', 'cyan');

  // Check environment
  const envOk = await checkEnvironment();
  if (!envOk) {
    log('\n⚠️  Missing environment variables. See fixes below.', 'yellow');
  }

  // Test external APIs
  await testCongressApi();
  await testFECApi();
  await testGDELTApi();

  // Test local endpoints
  log('\n--- Testing Local Endpoints ---', 'cyan');
  const localOk = await testLocalEndpoints();

  if (!localOk) {
    log('\n⚠️  Some local endpoints are failing.', 'yellow');
  }

  // Suggest fixes
  await suggestFixes();

  log('\n=================================', 'cyan');
  log('   Diagnostic Complete   ', 'cyan');
  log('=================================', 'cyan');
}

// Run the diagnostic
main().catch(error => {
  log(`\n❌ Fatal error: ${error}`, 'red');
  process.exit(1);
});
