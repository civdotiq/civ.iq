#!/usr/bin/env node
/**
 * CIV.IQ - 50-State Validation Script
 * Tests ZIP code lookups for all 50 states + DC + territories
 *
 * Purpose: Validate that all states return correct representatives
 * Validation: 5 random ZIPs per state, verify House + Senate members
 */

// Note: Using built-in fetch (Node 18+)

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Sample ZIP codes for all 50 states + DC + territories (5 per state)
const STATE_ZIPS = {
  // At-large states (should return district "0")
  'AK': ['99501', '99701', '99801', '99508', '99645'], // Alaska
  'DE': ['19801', '19702', '19901', '19804', '19958'], // Delaware
  'MT': ['59601', '59102', '59701', '59801', '59901'], // Montana (now 2 districts)
  'ND': ['58501', '58102', '58103', '58201', '58701'], // North Dakota
  'SD': ['57501', '57701', '57103', '57401', '57601'], // South Dakota
  'VT': ['05601', '05403', '05701', '05201', '05001'], // Vermont (FIXED)
  'WY': ['82001', '82801', '83001', '82601', '82901'], // Wyoming

  // Multi-district states
  'AL': ['35203', '36104', '36801', '35801', '36602'], // Alabama (7 districts)
  'AZ': ['85001', '85701', '85201', '85281', '85326'], // Arizona (9 districts)
  'AR': ['72201', '72701', '72903', '72401', '71601'], // Arkansas (4 districts)
  'CA': ['94102', '90210', '92101', '93721', '95814'], // California (52 districts)
  'CO': ['80202', '80903', '80301', '80525', '81501'], // Colorado (8 districts)
  'CT': ['06103', '06510', '06902', '06790', '06320'], // Connecticut (5 districts)
  'FL': ['33101', '32301', '32801', '33602', '32601'], // Florida (28 districts)
  'GA': ['30303', '31401', '31201', '30060', '30901'], // Georgia (14 districts)
  'HI': ['96813', '96734', '96720', '96762', '96766'], // Hawaii (2 districts)
  'ID': ['83702', '83201', '83401', '83814', '83843'], // Idaho (2 districts)
  'IL': ['60601', '62701', '61801', '62901', '61104'], // Illinois (17 districts)
  'IN': ['46204', '47901', '46802', '47708', '46410'], // Indiana (9 districts)
  'IA': ['50309', '52401', '50801', '51501', '52001'], // Iowa (4 districts)
  'KS': ['66102', '67202', '66044', '67501', '67901'], // Kansas (4 districts)
  'KY': ['40202', '40508', '42101', '41011', '42701'], // Kentucky (6 districts)
  'LA': ['70112', '70801', '71101', '70506', '71201'], // Louisiana (6 districts)
  'ME': ['04101', '04401', '04330', '04043', '04240'], // Maine (2 districts)
  'MD': ['21201', '21401', '21224', '20850', '21740'], // Maryland (8 districts)
  'MA': ['02101', '01603', '02101', '02186', '01105'], // Massachusetts (9 districts)
  'MI': ['48201', '48201', '49503', '48823', '48103'], // Michigan (13 districts)
  'MN': ['55401', '55101', '55987', '55811', '56001'], // Minnesota (8 districts)
  'MS': ['39201', '39501', '38801', '39701', '39601'], // Mississippi (4 districts)
  'MO': ['63101', '64101', '65201', '65802', '63901'], // Missouri (8 districts)
  'NE': ['68102', '68508', '68847', '69001', '69120'], // Nebraska (3 districts)
  'NV': ['89101', '89502', '89701', '89436', '89815'], // Nevada (4 districts)
  'NH': ['03101', '03801', '03301', '03820', '03755'], // New Hampshire (2 districts)
  'NJ': ['07102', '08608', '07601', '07740', '08901'], // New Jersey (12 districts)
  'NM': ['87101', '88001', '87401', '88201', '87501'], // New Mexico (3 districts)
  'NY': ['10001', '11201', '12207', '14201', '13202'], // New York (26 districts)
  'NC': ['27601', '28202', '27401', '28801', '27834'], // North Carolina (14 districts)
  'OH': ['43215', '44101', '45202', '44311', '43604'], // Ohio (15 districts)
  'OK': ['73102', '74101', '73034', '73301', '73801'], // Oklahoma (5 districts)
  'OR': ['97201', '97402', '97330', '97701', '97601'], // Oregon (6 districts)
  'PA': ['19102', '15222', '17101', '18101', '16501'], // Pennsylvania (17 districts)
  'RI': ['02903', '02840', '02801', '02889', '02814'], // Rhode Island (2 districts)
  'SC': ['29201', '29401', '29501', '29301', '29801'], // South Carolina (7 districts)
  'TN': ['37201', '38103', '37601', '38305', '37402'], // Tennessee (9 districts)
  'TX': ['75201', '78701', '77002', '76102', '79901'], // Texas (38 districts)
  'UT': ['84101', '84601', '84321', '84770', '84003'], // Utah (4 districts)
  'VA': ['23219', '23510', '22314', '24016', '23111'], // Virginia (11 districts)
  'WA': ['98101', '98501', '99201', '98661', '98801'], // Washington (10 districts)
  'WV': ['25301', '26501', '25401', '25701', '26301'], // West Virginia (2 districts)
  'WI': ['53202', '53703', '54301', '53501', '54481'], // Wisconsin (8 districts)

  // DC and territories
  'DC': ['20001', '20010', '20020', '20037', '20500'], // Washington DC (delegate)
  'PR': ['00601', '00901', '00725', '00736', '00949'], // Puerto Rico
  'VI': ['00801', '00820', '00830', '00840', '00850'], // U.S. Virgin Islands
  'GU': ['96910', '96913', '96915', '96921', '96929'], // Guam
  'AS': ['96799', '96799', '96799', '96799', '96799'], // American Samoa (only 1 ZIP)
  'MP': ['96950', '96951', '96952', '96950', '96952'], // Northern Mariana Islands
};

// Expected representatives for validation
const AT_LARGE_STATES = ['AK', 'DE', 'ND', 'SD', 'VT', 'WY'];
const TWO_DISTRICT_STATES_NOW = ['MT']; // Montana gained 2nd district after 2020 census

// Validation results
const results = {
  totalStates: 0,
  passedStates: 0,
  failedStates: 0,
  warningStates: 0,
  totalZips: 0,
  passedZips: 0,
  failedZips: 0,
  stateResults: {},
  issues: []
};

/**
 * Validate a single ZIP code
 */
async function validateZip(state, zip) {
  try {
    const url = `${API_BASE}/api/representatives?zip=${zip}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        zip,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        representatives: []
      };
    }

    const data = await response.json();

    // Check if we got representatives
    const reps = data.representatives || [];
    const senators = reps.filter(r => r.chamber === 'Senate' || r.chamber === 'senate');
    const house = reps.filter(r => r.chamber === 'House' || r.chamber === 'house');

    return {
      zip,
      success: true,
      representatives: reps,
      senators: senators.length,
      house: house.length,
      houseMembers: house,
      senateMembers: senators,
      totalReps: reps.length
    };
  } catch (error) {
    return {
      zip,
      success: false,
      error: error.message,
      representatives: []
    };
  }
}

/**
 * Validate all ZIP codes for a state
 */
async function validateState(state, zips) {
  console.log(`\n📍 Testing ${state}...`);

  const stateResult = {
    state,
    tested: zips.length,
    passed: 0,
    failed: 0,
    zips: {},
    issues: []
  };

  for (const zip of zips) {
    results.totalZips++;
    const result = await validateZip(state, zip);
    stateResult.zips[zip] = result;

    // Small delay between ZIPs to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));

    if (!result.success) {
      stateResult.failed++;
      stateResult.issues.push(`ZIP ${zip}: ${result.error}`);
      results.failedZips++;
      console.log(`  ❌ ${zip}: ${result.error}`);
      continue;
    }

    // Validate expected representatives
    let hasIssue = false;

    // Check for senators (every state should have 2)
    if (result.senators !== 2 && state !== 'PR' && state !== 'VI' && state !== 'GU' && state !== 'AS' && state !== 'MP') {
      stateResult.issues.push(`ZIP ${zip}: Expected 2 senators, got ${result.senators}`);
      hasIssue = true;
      console.log(`  ⚠️  ${zip}: Expected 2 senators, got ${result.senators}`);
    }

    // Check for House representatives
    if (AT_LARGE_STATES.includes(state)) {
      // At-large states should have 1 House member
      if (result.house !== 1) {
        stateResult.issues.push(`ZIP ${zip}: Expected 1 House member (at-large), got ${result.house}`);
        hasIssue = true;
        console.log(`  ⚠️  ${zip}: Expected 1 House member, got ${result.house}`);
      }
    } else if (TWO_DISTRICT_STATES_NOW.includes(state)) {
      // Montana now has 2 districts
      if (result.house < 1) {
        stateResult.issues.push(`ZIP ${zip}: Expected at least 1 House member, got ${result.house}`);
        hasIssue = true;
        console.log(`  ⚠️  ${zip}: Expected House member, got ${result.house}`);
      }
    } else if (!['PR', 'VI', 'GU', 'AS', 'MP', 'DC'].includes(state)) {
      // Regular states should have at least 1 House member
      // Note: 0 House members may indicate a vacant seat (AZ-07, TN-07)
      if (result.house < 1) {
        stateResult.issues.push(`ZIP ${zip}: Expected at least 1 House member, got ${result.house} (may be vacant seat)`);
        hasIssue = true;
        console.log(`  ⚠️  ${zip}: Expected House member, got ${result.house} (may be vacant seat)`);
      }
    }

    // Check territories and DC (delegates - no senators)
    if (['PR', 'VI', 'GU', 'AS', 'MP', 'DC'].includes(state)) {
      // DC and territories have 0 senators (correct)
      if (result.senators !== 0) {
        stateResult.issues.push(`ZIP ${zip}: Expected 0 senators for territory/DC, got ${result.senators}`);
        hasIssue = true;
        console.log(`  ⚠️  ${zip}: Expected 0 senators, got ${result.senators}`);
      }
      // Should have 1 delegate
      if (result.house !== 1) {
        stateResult.issues.push(`ZIP ${zip}: Expected 1 delegate, got ${result.house}`);
        hasIssue = true;
        console.log(`  ⚠️  ${zip}: Expected 1 delegate, got ${result.house}`);
      }
    }

    if (hasIssue) {
      stateResult.failed++;
      results.failedZips++;
      console.log(`  ❌ ${zip}: Failed validation (${result.totalReps} total reps)`);
    } else {
      stateResult.passed++;
      results.passedZips++;
      console.log(`  ✅ ${zip}: ${result.senators} senators + ${result.house} House (${result.totalReps} total)`);
    }
  }

  results.stateResults[state] = stateResult;
  results.totalStates++;

  if (stateResult.failed === 0) {
    results.passedStates++;
    console.log(`✅ ${state}: PASS (${stateResult.passed}/${stateResult.tested})`);
  } else if (stateResult.passed > 0) {
    results.warningStates++;
    console.log(`⚠️  ${state}: PARTIAL (${stateResult.passed}/${stateResult.tested} passed)`);
  } else {
    results.failedStates++;
    console.log(`❌ ${state}: FAIL (0/${stateResult.tested} passed)`);
  }

  // Store issues
  if (stateResult.issues.length > 0) {
    results.issues.push(...stateResult.issues.map(issue => `${state}: ${issue}`));
  }
}

/**
 * Generate final report
 */
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 50-STATE VALIDATION REPORT');
  console.log('='.repeat(70));

  console.log('\n📈 Overall Results:');
  console.log(`  Total States Tested: ${results.totalStates}`);
  console.log(`  ✅ Passed: ${results.passedStates} (${((results.passedStates / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Partial: ${results.warningStates} (${((results.warningStates / results.totalStates) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${results.failedStates} (${((results.failedStates / results.totalStates) * 100).toFixed(1)}%)`);

  console.log(`\n📍 ZIP Code Results:`);
  console.log(`  Total ZIPs Tested: ${results.totalZips}`);
  console.log(`  ✅ Passed: ${results.passedZips} (${((results.passedZips / results.totalZips) * 100).toFixed(1)}%)`);
  console.log(`  ❌ Failed: ${results.failedZips} (${((results.failedZips / results.totalZips) * 100).toFixed(1)}%)`);

  if (results.failedStates > 0) {
    console.log('\n🚨 FAILED STATES:');
    Object.entries(results.stateResults).forEach(([state, result]) => {
      if (result.failed === result.tested) {
        console.log(`  ❌ ${state}: All ${result.tested} ZIPs failed`);
        result.issues.slice(0, 3).forEach(issue => console.log(`     - ${issue}`));
        if (result.issues.length > 3) {
          console.log(`     ... and ${result.issues.length - 3} more issues`);
        }
      }
    });
  }

  if (results.warningStates > 0) {
    console.log('\n⚠️  PARTIAL STATES:');
    Object.entries(results.stateResults).forEach(([state, result]) => {
      if (result.failed > 0 && result.passed > 0) {
        console.log(`  ⚠️  ${state}: ${result.passed}/${result.tested} ZIPs passed`);
        result.issues.slice(0, 2).forEach(issue => console.log(`     - ${issue}`));
        if (result.issues.length > 2) {
          console.log(`     ... and ${result.issues.length - 2} more issues`);
        }
      }
    });
  }

  console.log('\n' + '='.repeat(70));

  // Final verdict
  const overallAccuracy = (results.passedZips / results.totalZips) * 100;
  console.log(`\n🎯 Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);

  if (results.failedStates === 0 && results.warningStates === 0) {
    console.log('✅ VERDICT: ALL STATES PASSING - Production Ready!');
  } else if (results.failedStates === 0) {
    console.log('⚠️  VERDICT: Minor issues in some states - Review warnings');
  } else if (results.failedStates <= 2) {
    console.log('⚠️  VERDICT: Critical issues in ≤2 states - Address failures before production');
  } else {
    console.log('❌ VERDICT: Critical issues in multiple states - NOT production ready');
  }

  console.log('='.repeat(70));
}

/**
 * Main execution
 */
async function main() {
  console.log('🏛️  CIV.IQ 50-State Validation');
  console.log('='.repeat(70));
  console.log(`📡 Testing API at: ${API_BASE}`);
  console.log(`📍 Testing ${Object.keys(STATE_ZIPS).length} states/territories`);
  console.log(`📮 Testing ${Object.values(STATE_ZIPS).flat().length} total ZIP codes`);
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
  for (const [state, zips] of Object.entries(STATE_ZIPS)) {
    await validateState(state, zips);
    // Increased delay to avoid rate limiting (was 100ms, now 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Generate report
  generateReport();

  // Exit with appropriate code
  process.exit(results.failedStates > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
