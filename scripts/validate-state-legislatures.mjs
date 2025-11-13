#!/usr/bin/env node
/**
 * CIV.IQ - State Legislature Validation Script
 * Tests state legislature data for all 50 states
 *
 * Purpose: Validate that all states return correct state legislators
 * Validation: Test /api/state-legislature/[state] for each state
 * Expected: ~7,383 total state legislators across 50 states
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Expected state legislator counts (as of 2024)
// Source: National Conference of State Legislatures (NCSL)
const STATE_LEGISLATURE_COUNTS = {
  'AL': { senate: 35, house: 105, total: 140, houseName: 'House of Representatives' },
  'AK': { senate: 20, house: 40, total: 60, houseName: 'House of Representatives' },
  'AZ': { senate: 30, house: 60, total: 90, houseName: 'House of Representatives' },
  'AR': { senate: 35, house: 100, total: 135, houseName: 'House of Representatives' },
  'CA': { senate: 40, house: 80, total: 120, houseName: 'State Assembly' },
  'CO': { senate: 35, house: 65, total: 100, houseName: 'House of Representatives' },
  'CT': { senate: 36, house: 151, total: 187, houseName: 'House of Representatives' },
  'DE': { senate: 21, house: 41, total: 62, houseName: 'House of Representatives' },
  'FL': { senate: 40, house: 120, total: 160, houseName: 'House of Representatives' },
  'GA': { senate: 56, house: 180, total: 236, houseName: 'House of Representatives' },
  'HI': { senate: 25, house: 51, total: 76, houseName: 'House of Representatives' },
  'ID': { senate: 35, house: 70, total: 105, houseName: 'House of Representatives' },
  'IL': { senate: 59, house: 118, total: 177, houseName: 'House of Representatives' },
  'IN': { senate: 50, house: 100, total: 150, houseName: 'House of Representatives' },
  'IA': { senate: 50, house: 100, total: 150, houseName: 'House of Representatives' },
  'KS': { senate: 40, house: 125, total: 165, houseName: 'House of Representatives' },
  'KY': { senate: 38, house: 100, total: 138, houseName: 'House of Representatives' },
  'LA': { senate: 39, house: 105, total: 144, houseName: 'House of Representatives' },
  'ME': { senate: 35, house: 151, total: 186, houseName: 'House of Representatives' },
  'MD': { senate: 47, house: 141, total: 188, houseName: 'House of Delegates' },
  'MA': { senate: 40, house: 160, total: 200, houseName: 'House of Representatives' },
  'MI': { senate: 38, house: 110, total: 148, houseName: 'House of Representatives' },
  'MN': { senate: 67, house: 134, total: 201, houseName: 'House of Representatives' },
  'MS': { senate: 52, house: 122, total: 174, houseName: 'House of Representatives' },
  'MO': { senate: 34, house: 163, total: 197, houseName: 'House of Representatives' },
  'MT': { senate: 50, house: 100, total: 150, houseName: 'House of Representatives' },
  'NE': { senate: 49, house: 0, total: 49, houseName: 'None (Unicameral)' }, // Nebraska is unicameral
  'NV': { senate: 21, house: 42, total: 63, houseName: 'State Assembly' },
  'NH': { senate: 24, house: 400, total: 424, houseName: 'House of Representatives' }, // Largest state legislature
  'NJ': { senate: 40, house: 80, total: 120, houseName: 'General Assembly' },
  'NM': { senate: 42, house: 70, total: 112, houseName: 'House of Representatives' },
  'NY': { senate: 63, house: 150, total: 213, houseName: 'State Assembly' },
  'NC': { senate: 50, house: 120, total: 170, houseName: 'House of Representatives' },
  'ND': { senate: 47, house: 94, total: 141, houseName: 'House of Representatives' },
  'OH': { senate: 33, house: 99, total: 132, houseName: 'House of Representatives' },
  'OK': { senate: 48, house: 101, total: 149, houseName: 'House of Representatives' },
  'OR': { senate: 30, house: 60, total: 90, houseName: 'House of Representatives' },
  'PA': { senate: 50, house: 203, total: 253, houseName: 'House of Representatives' },
  'RI': { senate: 38, house: 75, total: 113, houseName: 'House of Representatives' },
  'SC': { senate: 46, house: 124, total: 170, houseName: 'House of Representatives' },
  'SD': { senate: 35, house: 70, total: 105, houseName: 'House of Representatives' },
  'TN': { senate: 33, house: 99, total: 132, houseName: 'House of Representatives' },
  'TX': { senate: 31, house: 150, total: 181, houseName: 'House of Representatives' },
  'UT': { senate: 29, house: 75, total: 104, houseName: 'House of Representatives' },
  'VT': { senate: 30, house: 150, total: 180, houseName: 'House of Representatives' },
  'VA': { senate: 40, house: 100, total: 140, houseName: 'House of Delegates' },
  'WA': { senate: 49, house: 98, total: 147, houseName: 'House of Representatives' },
  'WV': { senate: 34, house: 100, total: 134, houseName: 'House of Delegates' },
  'WI': { senate: 33, house: 99, total: 132, houseName: 'State Assembly' },
  'WY': { senate: 30, house: 60, total: 90, houseName: 'House of Representatives' },
};

// Validation results
const results = {
  totalStates: 0,
  passedStates: 0,
  failedStates: 0,
  warningStates: 0,
  totalLegislatorsExpected: 0,
  totalLegislatorsFound: 0,
  stateResults: {},
  issues: []
};

/**
 * Validate a single state's legislature
 */
async function validateState(stateCode) {
  const expected = STATE_LEGISLATURE_COUNTS[stateCode];

  console.log(`\n📍 Testing ${stateCode}...`);
  console.log(`   Expected: ${expected.senate} senate + ${expected.house} house = ${expected.total} total`);

  const stateResult = {
    state: stateCode,
    expected: expected.total,
    found: 0,
    senators: 0,
    representatives: 0,
    passed: false,
    issues: [],
    legislators: [],
    hasNames: true,
    hasParties: true,
    hasDistricts: true,
    hasChambers: true
  };

  try {
    const url = `${API_BASE}/api/state-legislature/${stateCode}`;
    const response = await fetch(url);

    if (!response.ok) {
      stateResult.issues.push(`HTTP ${response.status}: ${response.statusText}`);
      console.log(`   ❌ API Error: ${response.status} ${response.statusText}`);
      return stateResult;
    }

    const data = await response.json();

    // Extract legislators from response
    let legislators = [];
    if (data.legislators) {
      legislators = data.legislators;
    } else if (Array.isArray(data)) {
      legislators = data;
    } else if (data.results) {
      legislators = data.results;
    }

    stateResult.legislators = legislators;
    stateResult.found = legislators.length;
    results.totalLegislatorsFound += legislators.length;

    // Count senators and representatives
    const senators = legislators.filter(leg =>
      leg.chamber === 'upper' ||
      leg.chamber === 'senate' ||
      (leg.chamber && leg.chamber.toLowerCase().includes('senate'))
    );

    const representatives = legislators.filter(leg =>
      leg.chamber === 'lower' ||
      leg.chamber === 'house' ||
      leg.chamber === 'assembly' ||
      (leg.chamber && !leg.chamber.toLowerCase().includes('senate'))
    );

    stateResult.senators = senators.length;
    stateResult.representatives = representatives.length;

    // Validate counts (allow 10% margin for data staleness, vacancies, etc.)
    const margin = Math.ceil(expected.total * 0.1);
    const minExpected = expected.total - margin;
    const maxExpected = expected.total + margin;

    if (stateResult.found < minExpected) {
      stateResult.issues.push(`Too few legislators: expected ~${expected.total}, got ${stateResult.found} (${((stateResult.found / expected.total) * 100).toFixed(1)}%)`);
    } else if (stateResult.found > maxExpected) {
      stateResult.issues.push(`Too many legislators: expected ~${expected.total}, got ${stateResult.found}`);
    }

    // Check data completeness (sample first 10 legislators)
    const sample = legislators.slice(0, Math.min(10, legislators.length));

    const missingNames = sample.filter(leg => !leg.name && !leg.fullName && !leg.firstName).length;
    const missingParties = sample.filter(leg => !leg.party).length;
    const missingDistricts = sample.filter(leg => !leg.district && !leg.districtNumber).length;
    const missingChambers = sample.filter(leg => !leg.chamber).length;

    if (missingNames > 0) {
      stateResult.hasNames = false;
      stateResult.issues.push(`${missingNames}/${sample.length} legislators missing names`);
    }
    if (missingParties > 0) {
      stateResult.hasParties = false;
      stateResult.issues.push(`${missingParties}/${sample.length} legislators missing party`);
    }
    if (missingDistricts > 0) {
      stateResult.hasDistricts = false;
      stateResult.issues.push(`${missingDistricts}/${sample.length} legislators missing district`);
    }
    if (missingChambers > 0) {
      stateResult.hasChambers = false;
      stateResult.issues.push(`${missingChambers}/${sample.length} legislators missing chamber`);
    }

    // Determine pass/fail
    if (stateResult.issues.length === 0) {
      stateResult.passed = true;
      console.log(`   ✅ Found ${stateResult.found} legislators (${stateResult.senators} senate + ${stateResult.representatives} house)`);
      console.log(`   ✅ Data complete: names, parties, districts, chambers`);
    } else if (stateResult.found >= minExpected && stateResult.hasNames && stateResult.hasChambers) {
      stateResult.passed = true; // Pass with warnings
      console.log(`   ⚠️  Found ${stateResult.found} legislators (${stateResult.senators} senate + ${stateResult.representatives} house)`);
      stateResult.issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
    } else {
      stateResult.passed = false;
      console.log(`   ❌ Found ${stateResult.found} legislators (expected ~${expected.total})`);
      stateResult.issues.forEach(issue => console.log(`   ❌ ${issue}`));
    }

  } catch (error) {
    stateResult.issues.push(`Request failed: ${error.message}`);
    console.log(`   ❌ Error: ${error.message}`);
  }

  return stateResult;
}

/**
 * Generate final report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 STATE LEGISLATURE VALIDATION REPORT');
  console.log('='.repeat(70));

  console.log('\n📈 Overall Results:');
  console.log(`  Total States Tested: ${results.totalStates}`);
  console.log(`  ✅ Passed: ${results.passedStates} (${((results.passedStates / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Warnings: ${results.warningStates} (${((results.warningStates / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${results.failedStates} (${((results.failedStates / results.totalStates) * 100).toFixed(1)}%)`);

  console.log(`\n👥 Legislator Counts:`);
  console.log(`  Expected Total: ${results.totalLegislatorsExpected}`);
  console.log(`  Found Total: ${results.totalLegislatorsFound}`);
  const coverage = ((results.totalLegislatorsFound / results.totalLegislatorsExpected) * 100).toFixed(1);
  console.log(`  Coverage: ${coverage}%`);

  if (results.failedStates > 0) {
    console.log('\n❌ FAILED STATES:');
    Object.entries(results.stateResults).forEach(([state, result]) => {
      if (!result.passed && result.found < result.expected * 0.5) {
        console.log(`  ❌ ${state}: Found ${result.found}/${result.expected} legislators (${((result.found / result.expected) * 100).toFixed(1)}%)`);
        result.issues.slice(0, 3).forEach(issue => console.log(`     - ${issue}`));
      }
    });
  }

  if (results.warningStates > 0) {
    console.log('\n⚠️  STATES WITH WARNINGS:');
    Object.entries(results.stateResults).forEach(([state, result]) => {
      if (result.passed && result.issues.length > 0) {
        console.log(`  ⚠️  ${state}: Found ${result.found}/${result.expected} legislators (${((result.found / result.expected) * 100).toFixed(1)}%)`);
        result.issues.slice(0, 2).forEach(issue => console.log(`     - ${issue}`));
      }
    });
  }

  // Top performing states
  console.log('\n🏆 TOP PERFORMING STATES (95%+ coverage):');
  const topStates = Object.entries(results.stateResults)
    .filter(([_, result]) => result.found / result.expected >= 0.95)
    .sort((a, b) => b[1].found / b[1].expected - a[1].found / a[1].expected)
    .slice(0, 10);

  topStates.forEach(([state, result]) => {
    const pct = ((result.found / result.expected) * 100).toFixed(1);
    console.log(`  ✅ ${state}: ${result.found}/${result.expected} (${pct}%)`);
  });

  // Data quality summary
  console.log('\n📋 DATA QUALITY SUMMARY:');
  const statesWithNames = Object.values(results.stateResults).filter(r => r.hasNames).length;
  const statesWithParties = Object.values(results.stateResults).filter(r => r.hasParties).length;
  const statesWithDistricts = Object.values(results.stateResults).filter(r => r.hasDistricts).length;
  const statesWithChambers = Object.values(results.stateResults).filter(r => r.hasChambers).length;

  console.log(`  Names Present: ${statesWithNames}/${results.totalStates} states (${((statesWithNames / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  Parties Present: ${statesWithParties}/${results.totalStates} states (${((statesWithParties / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  Districts Present: ${statesWithDistricts}/${results.totalStates} states (${((statesWithDistricts / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  Chambers Present: ${statesWithChambers}/${results.totalStates} states (${((statesWithChambers / results.totalStates) * 100).toFixed(1)}%)`);

  console.log('\n' + '='.repeat(70));

  // Final verdict
  const overallCoverage = (results.totalLegislatorsFound / results.totalLegislatorsExpected) * 100;
  console.log(`\n🎯 Overall Coverage: ${overallCoverage.toFixed(1)}%`);

  if (results.failedStates === 0 && overallCoverage >= 95) {
    console.log('✅ VERDICT: Excellent coverage - Production Ready!');
  } else if (results.failedStates === 0 && overallCoverage >= 80) {
    console.log('✅ VERDICT: Good coverage - Production Ready with known gaps');
  } else if (results.failedStates <= 5 && overallCoverage >= 70) {
    console.log('⚠️  VERDICT: Acceptable coverage - Review failed states');
  } else {
    console.log('❌ VERDICT: Low coverage - Investigate API issues');
  }

  console.log('='.repeat(70));
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️  CIV.IQ State Legislature Validation');
  console.log('='.repeat(70));
  console.log(`📡 Testing API at: ${API_BASE}`);
  console.log(`📍 Testing ${Object.keys(STATE_LEGISLATURE_COUNTS).length} states`);

  // Calculate expected total
  results.totalLegislatorsExpected = Object.values(STATE_LEGISLATURE_COUNTS)
    .reduce((sum, state) => sum + state.total, 0);
  console.log(`👥 Expected total legislators: ${results.totalLegislatorsExpected}`);
  console.log('='.repeat(70));

  // Test API health first
  console.log('\n🏥 Checking API health...');
  try {
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    if (!healthResponse.ok) {
      console.log('❌ API health check failed!');
      process.exit(1);
    }
    console.log('✅ API is healthy');
  } catch (error) {
    console.log(`❌ Cannot connect to API: ${error.message}`);
    console.log('💡 Make sure dev server is running: npm run dev');
    process.exit(1);
  }

  // Validate all states
  for (const stateCode of Object.keys(STATE_LEGISLATURE_COUNTS).sort()) {
    const result = await validateState(stateCode);
    results.stateResults[stateCode] = result;
    results.totalStates++;

    if (result.passed && result.issues.length === 0) {
      results.passedStates++;
    } else if (result.passed && result.issues.length > 0) {
      results.warningStates++;
    } else {
      results.failedStates++;
    }

    // Store issues
    if (result.issues.length > 0) {
      results.issues.push(...result.issues.map(issue => `${stateCode}: ${issue}`));
    }

    // Delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Generate report
  generateReport();

  // Exit with appropriate code
  const coverage = (results.totalLegislatorsFound / results.totalLegislatorsExpected) * 100;
  process.exit(coverage >= 70 && results.failedStates <= 5 ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
