/**
 * Congress.gov API Diagnostic Tool
 * Identifies which endpoints are actually available for the 119th Congress
 * The 119th Congress has been in session since January 2025 (8+ months as of August 2025)
 */

import { logger } from '../src/lib/logging/logger-edge';

interface EndpointTest {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  requiresApiKey: boolean;
  description: string;
}

class CongressApiDiagnostics {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.congress.gov/v3';
  private congress = 119;
  private session = 1;
  private results: Map<string, any> = new Map();

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY;
    if (!this.apiKey) {
      console.warn('⚠️  No CONGRESS_API_KEY found in environment variables');
      console.log('   Some endpoints may return 403 Forbidden without an API key\n');
    }
  }

  /**
   * Test all known Congress.gov endpoints for 119th Congress
   */
  async runDiagnostics(): Promise<void> {
    console.log('🔍 Congress.gov API Diagnostic Tool');
    console.log('='.repeat(60));
    console.log(`Testing endpoints for ${this.congress}th Congress, Session ${this.session}`);
    console.log(`Current Date: August 10, 2025 (Congress in session for ~8 months)`);
    console.log(`API Key: ${this.apiKey ? '✅ Present' : '❌ Missing'}\n`);

    const endpoints: EndpointTest[] = [
      // Member endpoints
      {
        name: 'Current Members',
        url: `${this.baseUrl}/member`,
        method: 'GET',
        requiresApiKey: false,
        description: 'List all current members of Congress',
      },
      {
        name: 'Members by Congress',
        url: `${this.baseUrl}/member/congress/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'List members of 119th Congress',
      },
      {
        name: 'House Members',
        url: `${this.baseUrl}/member/house/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'List House members of 119th Congress',
      },
      {
        name: 'Senate Members',
        url: `${this.baseUrl}/member/senate/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'List Senate members of 119th Congress',
      },

      // Bill endpoints
      {
        name: 'Bills List',
        url: `${this.baseUrl}/bill/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'List bills from 119th Congress',
      },
      {
        name: 'House Bills',
        url: `${this.baseUrl}/bill/${this.congress}/hr`,
        method: 'GET',
        requiresApiKey: false,
        description: 'House bills (H.R.) from 119th Congress',
      },
      {
        name: 'Senate Bills',
        url: `${this.baseUrl}/bill/${this.congress}/s`,
        method: 'GET',
        requiresApiKey: false,
        description: 'Senate bills (S.) from 119th Congress',
      },

      // Vote endpoints - These are the critical ones
      {
        name: 'House Votes (General)',
        url: `${this.baseUrl}/house-vote/${this.congress}`,
        method: 'GET',
        requiresApiKey: true,
        description: 'House votes for 119th Congress',
      },
      {
        name: 'House Roll Call Votes',
        url: `${this.baseUrl}/house-roll-call-vote/${this.congress}/${this.session}`,
        method: 'GET',
        requiresApiKey: true,
        description: 'House roll call votes (detailed)',
      },
      {
        name: 'Senate Votes (General)',
        url: `${this.baseUrl}/senate-vote/${this.congress}`,
        method: 'GET',
        requiresApiKey: true,
        description: 'Senate votes for 119th Congress',
      },
      {
        name: 'Senate Roll Call Votes',
        url: `${this.baseUrl}/senate-roll-call-vote/${this.congress}/${this.session}`,
        method: 'GET',
        requiresApiKey: true,
        description: 'Senate roll call votes (detailed)',
      },

      // Committee endpoints
      {
        name: 'House Committees',
        url: `${this.baseUrl}/committee/house/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'House committees for 119th Congress',
      },
      {
        name: 'Senate Committees',
        url: `${this.baseUrl}/committee/senate/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'Senate committees for 119th Congress',
      },

      // Amendment endpoints
      {
        name: 'House Amendments',
        url: `${this.baseUrl}/amendment/${this.congress}/hamdt`,
        method: 'GET',
        requiresApiKey: false,
        description: 'House amendments for 119th Congress',
      },
      {
        name: 'Senate Amendments',
        url: `${this.baseUrl}/amendment/${this.congress}/samdt`,
        method: 'GET',
        requiresApiKey: false,
        description: 'Senate amendments for 119th Congress',
      },

      // Nomination endpoints
      {
        name: 'Nominations',
        url: `${this.baseUrl}/nomination/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'Presidential nominations for 119th Congress',
      },

      // Congress endpoint
      {
        name: 'Congress Info',
        url: `${this.baseUrl}/congress/${this.congress}`,
        method: 'GET',
        requiresApiKey: false,
        description: 'Information about 119th Congress',
      },
    ];

    // Test each endpoint
    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    this.printSummary();

    // Test specific vote numbers if House/Senate vote endpoints work
    await this.testSpecificVotes();
  }

  /**
   * Test a single endpoint
   */
  private async testEndpoint(endpoint: EndpointTest): Promise<void> {
    console.log(`\nTesting: ${endpoint.name}`);
    console.log(`  URL: ${endpoint.url}`);
    console.log(`  Description: ${endpoint.description}`);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub-Diagnostics/1.0',
      };

      const params = new URLSearchParams({
        format: 'json',
        limit: '5', // Small limit for testing
      });

      if (this.apiKey && endpoint.requiresApiKey) {
        params.append('api_key', this.apiKey);
      }

      const url = `${endpoint.url}?${params.toString()}`;
      const response = await fetch(url, {
        method: endpoint.method,
        headers,
      });

      const status = response.status;
      const result = {
        status,
        statusText: response.statusText,
        success: false,
        dataCount: 0,
        sampleData: null,
        error: null,
      };

      if (status === 200) {
        const data = await response.json();
        result.success = true;

        // Count items based on common response patterns
        if (data.bills) result.dataCount = data.bills.length;
        else if (data.members) result.dataCount = data.members.length;
        else if (data.committees) result.dataCount = data.committees.length;
        else if (data.amendments) result.dataCount = data.amendments.length;
        else if (data.nominations) result.dataCount = data.nominations.length;
        else if (data.rollCallVotes) result.dataCount = data.rollCallVotes.length;
        else if (data.votes) result.dataCount = data.votes.length;
        else if (Array.isArray(data)) result.dataCount = data.length;
        else if (data.congress) result.dataCount = 1; // Single item response

        // Store sample for analysis
        result.sampleData = this.extractSampleData(data);

        console.log(`  ✅ SUCCESS - Status: ${status}`);
        console.log(`  Data items found: ${result.dataCount}`);
      } else if (status === 404) {
        result.error = 'Endpoint not found - may not be implemented yet';
        console.log(`  ❌ NOT FOUND - Endpoint may not be available`);
      } else if (status === 403) {
        result.error = 'Forbidden - API key may be required or invalid';
        console.log(`  ⚠️  FORBIDDEN - Requires valid API key`);
      } else if (status === 429) {
        result.error = 'Rate limited - too many requests';
        console.log(`  ⏱️  RATE LIMITED - Slow down requests`);
      } else {
        result.error = `Unexpected status: ${status} ${response.statusText}`;
        console.log(`  ❓ UNEXPECTED - Status: ${status} ${response.statusText}`);
      }

      this.results.set(endpoint.name, result);
    } catch (error) {
      const err = error as Error;
      console.log(`  💥 ERROR - ${err.message}`);
      this.results.set(endpoint.name, {
        status: 0,
        success: false,
        error: err.message,
      });
    }
  }

  /**
   * Extract sample data for analysis
   */
  private extractSampleData(data: any): any {
    if (data.bills && data.bills.length > 0) {
      return {
        type: 'bills',
        sample: data.bills[0],
        fields: Object.keys(data.bills[0]),
      };
    }
    if (data.members && data.members.length > 0) {
      return {
        type: 'members',
        sample: data.members[0],
        fields: Object.keys(data.members[0]),
      };
    }
    if (data.rollCallVotes && data.rollCallVotes.length > 0) {
      return {
        type: 'rollCallVotes',
        sample: data.rollCallVotes[0],
        fields: Object.keys(data.rollCallVotes[0]),
      };
    }
    if (data.votes && data.votes.length > 0) {
      return {
        type: 'votes',
        sample: data.votes[0],
        fields: Object.keys(data.votes[0]),
      };
    }
    return data;
  }

  /**
   * Test specific vote numbers if vote endpoints are working
   */
  private async testSpecificVotes(): Promise<void> {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Testing Specific Vote Numbers\n');

    // Test recent vote numbers (these should exist after 8 months)
    const testVotes = [
      { chamber: 'house', voteNumber: 100 },
      { chamber: 'house', voteNumber: 200 },
      { chamber: 'house', voteNumber: 300 },
      { chamber: 'senate', voteNumber: 100 },
      { chamber: 'senate', voteNumber: 150 },
      { chamber: 'senate', voteNumber: 200 },
    ];

    for (const { chamber, voteNumber } of testVotes) {
      const url = `${this.baseUrl}/${chamber}-roll-call-vote/${this.congress}/${this.session}/${voteNumber}`;
      const params = new URLSearchParams({ format: 'json' });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      try {
        const response = await fetch(`${url}?${params.toString()}`, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CivicIntelHub-Diagnostics/1.0',
          },
        });

        if (response.status === 200) {
          const data = await response.json();
          console.log(`✅ ${chamber.toUpperCase()} Vote #${voteNumber}: Available`);

          // Extract key info
          if (data.rollCallVote) {
            console.log(`   Date: ${data.rollCallVote.date || 'N/A'}`);
            console.log(
              `   Question: ${(data.rollCallVote.question || 'N/A').substring(0, 50)}...`
            );
          }
        } else {
          console.log(`❌ ${chamber.toUpperCase()} Vote #${voteNumber}: Status ${response.status}`);
        }
      } catch (error) {
        console.log(
          `💥 ${chamber.toUpperCase()} Vote #${voteNumber}: Error - ${(error as Error).message}`
        );
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Print summary of results
   */
  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📈 DIAGNOSTIC SUMMARY\n');

    const working: string[] = [];
    const notFound: string[] = [];
    const forbidden: string[] = [];
    const errors: string[] = [];

    for (const [name, result] of this.results.entries()) {
      if (result.success) {
        working.push(name);
      } else if (result.status === 404) {
        notFound.push(name);
      } else if (result.status === 403) {
        forbidden.push(name);
      } else {
        errors.push(name);
      }
    }

    console.log(`✅ Working Endpoints (${working.length}):`);
    working.forEach(name => {
      const result = this.results.get(name);
      console.log(`   - ${name}: ${result.dataCount} items found`);
    });

    if (forbidden.length > 0) {
      console.log(`\n⚠️  Forbidden (Need API Key) (${forbidden.length}):`);
      forbidden.forEach(name => console.log(`   - ${name}`));
    }

    if (notFound.length > 0) {
      console.log(`\n❌ Not Found (404) (${notFound.length}):`);
      notFound.forEach(name => console.log(`   - ${name}`));
    }

    if (errors.length > 0) {
      console.log(`\n💥 Errors (${errors.length}):`);
      errors.forEach(name => {
        const result = this.results.get(name);
        console.log(`   - ${name}: ${result.error}`);
      });
    }

    // Recommendations
    console.log('\n' + '='.repeat(60));
    console.log('💡 RECOMMENDATIONS:\n');

    if (!this.apiKey) {
      console.log('1. Add CONGRESS_API_KEY to your .env.local file');
      console.log('   Get one at: https://api.congress.gov/sign-up/\n');
    }

    if (notFound.length > 0) {
      console.log('2. For 404 endpoints, use alternative data sources:');
      console.log('   - House Clerk: https://clerk.house.gov/');
      console.log('   - Senate.gov: https://www.senate.gov/legislative/votes.htm');
      console.log('   ⚠️  DO NOT use ProPublica or Google Civic API\n');
    }

    const voteEndpointsWorking = working.some(
      name => name.includes('Vote') || name.includes('roll')
    );

    if (!voteEndpointsWorking) {
      console.log('3. Vote endpoints not working. Use fallback strategies:');
      console.log('   - Parse House Clerk XML for House votes');
      console.log('   - Parse Senate.gov XML for Senate votes');
      console.log('   - Check if votes are included in bill endpoints\n');
    }

    // Save detailed results
    this.saveDetailedResults();
  }

  /**
   * Save detailed results for further analysis
   */
  private saveDetailedResults(): void {
    const timestamp = new Date().toISOString();
    const detailedResults = {
      timestamp,
      congress: this.congress,
      session: this.session,
      apiKeyPresent: !!this.apiKey,
      endpoints: Object.fromEntries(this.results),
    };

    console.log('\n📁 Detailed Results (for debugging):');
    console.log(JSON.stringify(detailedResults, null, 2));

    console.log('\n💾 To save these results, copy the JSON above to a file');
    console.log('   or implement fs.writeFileSync in your environment');
  }
}

// Run diagnostics
export async function runCongressApiDiagnostics() {
  const diagnostics = new CongressApiDiagnostics();
  await diagnostics.runDiagnostics();
}

// If running directly
if (require.main === module) {
  runCongressApiDiagnostics().catch(console.error);
}
