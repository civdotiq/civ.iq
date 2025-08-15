/**
 * XML URL Pattern Validation Script
 *
 * This script validates our hypothesis for constructing official XML URLs
 * for House and Senate roll call votes without relying on sourceDataURL.
 */

interface VoteData {
  date: string; // ISO date string
  rollCallNumber: number;
  chamber: 'House' | 'Senate';
  congress?: number; // For Senate session calculation
}

interface ValidationResult {
  url: string;
  isValid: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Construct House XML URL
 * Pattern: https://clerk.house.gov/evs/{YEAR}/roll{ROLL_NUMBER}.xml
 */
function constructHouseXMLUrl(date: string, rollCallNumber: number): string {
  const year = new Date(date).getFullYear();
  return `https://clerk.house.gov/evs/${year}/roll${rollCallNumber}.xml`;
}

/**
 * Construct Senate XML URL
 * Pattern: https://www.senate.gov/legislative/LIS/roll_call_votes/vote_{SESSION}_{YEAR}_{ROLL_NUMBER_PADDED}.xml
 *
 * Note: Roll numbers are typically padded to 5 digits (e.g., 00001)
 * Session number typically matches the Congress number
 */
function constructSenateXMLUrl(
  date: string,
  rollCallNumber: number,
  congress: number = 119
): string {
  const year = new Date(date).getFullYear();
  const session = congress; // 119th Congress = session 119
  const paddedRollNumber = rollCallNumber.toString().padStart(5, '0');

  return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote_${session}_${year}_${paddedRollNumber}.xml`;
}

/**
 * Alternative Senate URL pattern (some years use different format)
 * Pattern: https://www.senate.gov/legislative/LIS/roll_call_lists/roll_call_vote_cfm.cfm?congress={CONGRESS}&session={SESSION}&vote={ROLL_NUMBER}
 */
function constructAlternateSenateXMLUrl(rollCallNumber: number, congress: number = 119): string {
  // This returns HTML, not XML, but useful for validation
  return `https://www.senate.gov/legislative/LIS/roll_call_lists/roll_call_vote_cfm.cfm?congress=${congress}&session=1&vote=${rollCallNumber.toString().padStart(5, '0')}`;
}

/**
 * Validate URL by performing HTTP HEAD request
 */
async function validateUrl(url: string): Promise<ValidationResult> {
  try {
    console.log(`🔍 Testing: ${url}`);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-data-validation-tool)',
      },
    });

    const result: ValidationResult = {
      url,
      isValid: response.ok,
      statusCode: response.status,
    };

    if (response.ok) {
      console.log(`✅ Valid: ${url} (${response.status})`);
    } else {
      console.log(`❌ Invalid: ${url} (${response.status})`);
      result.error = `HTTP ${response.status}: ${response.statusText}`;
    }

    return result;
  } catch (error) {
    const result: ValidationResult = {
      url,
      isValid: false,
      error: (error as Error).message,
    };

    console.log(`❌ Error: ${url} - ${result.error}`);
    return result;
  }
}

/**
 * Test our URL construction logic with sample data
 */
async function validateUrlPatterns() {
  console.log('🎯 XML URL Pattern Validation\n');

  // Sample test data - using known votes from recent congresses
  const testVotes: VoteData[] = [
    // House votes (known to exist)
    {
      date: '2023-06-15T00:00:00Z',
      rollCallNumber: 296,
      chamber: 'House',
    },
    {
      date: '2023-12-14T00:00:00Z',
      rollCallNumber: 695,
      chamber: 'House',
    },
    {
      date: '2024-01-10T00:00:00Z',
      rollCallNumber: 1,
      chamber: 'House',
    },

    // Senate votes (pattern to be validated)
    {
      date: '2023-06-15T00:00:00Z',
      rollCallNumber: 180,
      chamber: 'Senate',
      congress: 118,
    },
    {
      date: '2024-01-25T00:00:00Z',
      rollCallNumber: 1,
      chamber: 'Senate',
      congress: 118,
    },

    // 119th Congress samples (may not exist yet)
    {
      date: '2025-01-15T00:00:00Z',
      rollCallNumber: 1,
      chamber: 'House',
    },
    {
      date: '2025-01-15T00:00:00Z',
      rollCallNumber: 1,
      chamber: 'Senate',
      congress: 119,
    },
  ];

  const results: ValidationResult[] = [];

  for (const vote of testVotes) {
    console.log(
      `\n📊 Testing ${vote.chamber} vote ${vote.rollCallNumber} from ${vote.date.split('T')[0]}`
    );

    let url: string;

    if (vote.chamber === 'House') {
      url = constructHouseXMLUrl(vote.date, vote.rollCallNumber);
    } else {
      url = constructSenateXMLUrl(vote.date, vote.rollCallNumber, vote.congress);
    }

    const result = await validateUrl(url);
    results.push(result);

    // Add small delay to be respectful to government servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n📈 Validation Summary:');
  console.log('═══════════════════════════════════════════════════');

  const houseResults = results.filter(r => r.url.includes('clerk.house.gov'));
  const senateResults = results.filter(r => r.url.includes('senate.gov'));

  const houseSuccessRate = (houseResults.filter(r => r.isValid).length / houseResults.length) * 100;
  const senateSuccessRate =
    (senateResults.filter(r => r.isValid).length / senateResults.length) * 100;

  console.log(
    `🏛️  House Pattern Success Rate: ${houseSuccessRate.toFixed(1)}% (${houseResults.filter(r => r.isValid).length}/${houseResults.length})`
  );
  console.log(
    `🏛️  Senate Pattern Success Rate: ${senateSuccessRate.toFixed(1)}% (${senateResults.filter(r => r.isValid).length}/${senateResults.length})`
  );

  console.log('\n📝 Recommended URL Construction Logic:');
  console.log('═══════════════════════════════════════════════════');

  if (houseSuccessRate >= 50) {
    console.log('✅ House Pattern: https://clerk.house.gov/evs/{YEAR}/roll{ROLL_NUMBER}.xml');
  } else {
    console.log('❌ House Pattern: Needs refinement');
  }

  if (senateSuccessRate >= 50) {
    console.log(
      '✅ Senate Pattern: https://www.senate.gov/legislative/LIS/roll_call_votes/vote_{SESSION}_{YEAR}_{ROLL_NUMBER_PADDED}.xml'
    );
  } else {
    console.log('❌ Senate Pattern: Needs refinement');
  }

  // Failed URLs for debugging
  const failedUrls = results.filter(r => !r.isValid);
  if (failedUrls.length > 0) {
    console.log('\n🔍 Failed URLs for Analysis:');
    failedUrls.forEach(result => {
      console.log(`   ${result.url} - ${result.error || `HTTP ${result.statusCode}`}`);
    });
  }

  return results;
}

/**
 * Export functions for use in the main voting API
 */
export function constructOfficialXMLUrl(
  chamber: 'House' | 'Senate',
  date: string,
  rollCallNumber: number,
  congress: number = 119
): string {
  if (chamber === 'House') {
    return constructHouseXMLUrl(date, rollCallNumber);
  } else {
    return constructSenateXMLUrl(date, rollCallNumber, congress);
  }
}

export async function validateXMLUrlExists(url: string): Promise<boolean> {
  const result = await validateUrl(url);
  return result.isValid;
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateUrlPatterns()
    .then(results => {
      console.log(`\n🎯 Validation complete! Tested ${results.length} URLs.`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}
