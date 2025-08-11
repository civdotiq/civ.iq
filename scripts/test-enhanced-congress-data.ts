/**
 * Test script for validating enhanced Congress data services
 * Tests both House and Senate data fetching with proper error handling
 */

import { enhancedCongressDataService } from '../src/features/representatives/services/enhanced-congress-data-service';
import { logger } from '../src/lib/logging/logger-edge';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

class CongressDataTester {
  private results: TestResult[] = [];
  private congress = 119;
  private session = 1;

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Enhanced Congress Data Service Tests\n');
    console.log(`Testing for ${this.congress}th Congress, Session ${this.session}`);
    console.log('='.repeat(60) + '\n');

    // Test House data
    await this.testHouseVotes();
    await this.testHouseVoteDetails();

    // Test Senate data
    await this.testSenateVotes();
    await this.testSenateVoteDetails();
    await this.testSenateUrlResolution();

    // Test combined data
    await this.testCombinedVotes();
    await this.testMemberVotingHistory();

    // Test error handling
    await this.testErrorHandling();

    // Print results
    this.printResults();
  }

  /**
   * Test House vote fetching
   */
  async testHouseVotes(): Promise<void> {
    const testName = 'House Votes Fetching';
    console.log(`\n📊 Testing ${testName}...`);

    try {
      const votes = await enhancedCongressDataService.getHouseVotes(this.congress, this.session, 5);

      if (votes.length > 0) {
        this.results.push({
          test: testName,
          success: true,
          message: `Successfully fetched ${votes.length} House votes`,
          data: {
            count: votes.length,
            sample: votes[0],
            sources: [...new Set(votes.map(v => v.metadata.dataSource))],
          },
        });

        console.log(`✅ Found ${votes.length} House votes`);
        console.log(
          `   Sources: ${[...new Set(votes.map(v => v.metadata.dataSource))].join(', ')}`
        );

        if (votes[0]) {
          console.log(`   Latest vote: ${votes[0].question.substring(0, 50)}...`);
          console.log(`   Date: ${votes[0].date}`);
        }
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: 'No House votes found',
          error: 'Data may not be available yet for 119th Congress',
        });
        console.log('⚠️  No House votes found - trying fallback sources');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch House votes',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test House vote details with member positions
   */
  async testHouseVoteDetails(): Promise<void> {
    const testName = 'House Vote Details';
    console.log(`\n🗳️  Testing ${testName}...`);

    try {
      // First get a vote to test with
      const votes = await enhancedCongressDataService.getHouseVotes(this.congress, this.session, 1);

      if (votes.length > 0 && votes[0].memberVotes) {
        const vote = votes[0];
        this.results.push({
          test: testName,
          success: true,
          message: `Successfully fetched vote details with ${vote.memberVotes.length} member positions`,
          data: {
            voteId: vote.voteId,
            memberCount: vote.memberVotes.length,
            totals: vote.totals,
          },
        });

        console.log(
          `✅ Vote ${vote.rollCallNumber} has ${vote.memberVotes.length} member positions`
        );
        console.log(`   Totals: Yea=${vote.totals.yea}, Nay=${vote.totals.nay}`);
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: 'No detailed House vote data available',
        });
        console.log('⚠️  No detailed House vote data available');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch House vote details',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test Senate vote fetching
   */
  async testSenateVotes(): Promise<void> {
    const testName = 'Senate Votes Fetching';
    console.log(`\n🏛️  Testing ${testName}...`);

    try {
      const votes = await enhancedCongressDataService.getSenateVotes(
        this.congress,
        this.session,
        5
      );

      if (votes.length > 0) {
        this.results.push({
          test: testName,
          success: true,
          message: `Successfully fetched ${votes.length} Senate votes`,
          data: {
            count: votes.length,
            sample: votes[0],
          },
        });

        console.log(`✅ Found ${votes.length} Senate votes`);

        if (votes[0]) {
          console.log(`   Latest vote: ${votes[0].question.substring(0, 50)}...`);
          console.log(`   Date: ${votes[0].date}`);
          console.log(`   Source: ${votes[0].metadata.sourceUrl}`);
        }
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: 'No Senate votes found',
          error: 'Senate.gov XML may not be available',
        });
        console.log('⚠️  No Senate votes found');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch Senate votes',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test Senate vote details with member positions
   */
  async testSenateVoteDetails(): Promise<void> {
    const testName = 'Senate Vote Details';
    console.log(`\n🗳️  Testing ${testName}...`);

    try {
      const votes = await enhancedCongressDataService.getSenateVotes(
        this.congress,
        this.session,
        1
      );

      if (votes.length > 0 && votes[0].memberVotes) {
        const vote = votes[0];
        this.results.push({
          test: testName,
          success: true,
          message: `Successfully fetched Senate vote with ${vote.memberVotes.length} senators`,
          data: {
            voteId: vote.voteId,
            memberCount: vote.memberVotes.length,
            totals: vote.totals,
          },
        });

        console.log(
          `✅ Vote ${vote.rollCallNumber} has ${vote.memberVotes.length} senator positions`
        );
        console.log(`   Totals: Yea=${vote.totals.yea}, Nay=${vote.totals.nay}`);

        // Check for valid bioguide IDs
        const validBioguides = vote.memberVotes.filter(
          m => m.bioguideId && m.bioguideId.match(/^[A-Z]\d{6}$/)
        );
        console.log(`   Valid bioguide IDs: ${validBioguides.length}/${vote.memberVotes.length}`);
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: 'No detailed Senate vote data available',
        });
        console.log('⚠️  No detailed Senate vote data available');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch Senate vote details',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test Senate URL resolution
   */
  async testSenateUrlResolution(): Promise<void> {
    const testName = 'Senate URL Resolution';
    console.log(`\n🔗 Testing ${testName}...`);

    try {
      const votes = await enhancedCongressDataService.getSenateVotes(
        this.congress,
        this.session,
        3
      );

      const urlsFound: string[] = [];

      for (const vote of votes) {
        if (vote.bill?.url) {
          urlsFound.push(vote.bill.url);
        }
      }

      if (urlsFound.length > 0) {
        const absoluteUrls = urlsFound.filter(url => url.startsWith('http'));

        this.results.push({
          test: testName,
          success: absoluteUrls.length === urlsFound.length,
          message: `Found ${absoluteUrls.length}/${urlsFound.length} absolute URLs`,
          data: {
            totalUrls: urlsFound.length,
            absoluteUrls: absoluteUrls.length,
            samples: urlsFound.slice(0, 2),
          },
        });

        console.log(`✅ URL Resolution: ${absoluteUrls.length}/${urlsFound.length} are absolute`);
        if (urlsFound.length > 0) {
          console.log(`   Sample: ${urlsFound[0]}`);
        }
      } else {
        this.results.push({
          test: testName,
          success: true,
          message: 'No URLs found in Senate votes to test',
        });
        console.log('ℹ️  No URLs found in Senate votes');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to test URL resolution',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test combined House and Senate votes
   */
  async testCombinedVotes(): Promise<void> {
    const testName = 'Combined Congressional Votes';
    console.log(`\n🏛️  Testing ${testName}...`);

    try {
      const result = await enhancedCongressDataService.getAllCongressionalVotes(10);

      this.results.push({
        test: testName,
        success: true,
        message: `Fetched ${result.house.length} House and ${result.senate.length} Senate votes`,
        data: {
          houseCount: result.house.length,
          senateCount: result.senate.length,
          combinedCount: result.combined.length,
        },
      });

      console.log(`✅ Combined Results:`);
      console.log(`   House votes: ${result.house.length}`);
      console.log(`   Senate votes: ${result.senate.length}`);
      console.log(`   Combined (sorted): ${result.combined.length}`);

      // Check if properly sorted by date
      if (result.combined.length > 1) {
        const sorted = result.combined.every(
          (v, i) => i === 0 || new Date(v.date) <= new Date(result.combined[i - 1].date)
        );
        console.log(`   Properly sorted by date: ${sorted ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch combined votes',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test member voting history
   */
  async testMemberVotingHistory(): Promise<void> {
    const testName = 'Member Voting History';
    console.log(`\n👤 Testing ${testName}...`);

    try {
      // Use a known senator bioguide ID (you'll need to update this with a real one)
      const bioguideId = 'S000148'; // Example: Schumer

      const history = await enhancedCongressDataService.getMemberVotingHistory(
        bioguideId,
        'Both',
        10
      );

      if (history.length > 0) {
        this.results.push({
          test: testName,
          success: true,
          message: `Found ${history.length} votes for member ${bioguideId}`,
          data: {
            memberBioguideId: bioguideId,
            voteCount: history.length,
            positions: history.map(v => v.position),
          },
        });

        console.log(`✅ Found ${history.length} votes for ${bioguideId}`);

        const positionCounts = history.reduce(
          (acc, vote) => {
            acc[vote.position] = (acc[vote.position] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        console.log(`   Positions: ${JSON.stringify(positionCounts)}`);
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: `No voting history found for ${bioguideId}`,
        });
        console.log(`⚠️  No voting history found for ${bioguideId}`);
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: false,
        message: 'Failed to fetch member voting history',
        error: (error as Error).message,
      });
      console.error(`❌ Error: ${(error as Error).message}`);
    }
  }

  /**
   * Test error handling and retry logic
   */
  async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling & Retry Logic';
    console.log(`\n🔧 Testing ${testName}...`);

    try {
      // Test with invalid congress number to trigger retries
      const votes = await enhancedCongressDataService.getHouseVotes(999, 1, 1);

      if (votes.length === 0) {
        this.results.push({
          test: testName,
          success: true,
          message: 'Properly handled invalid request with empty result',
        });
        console.log('✅ Error handling working - returned empty array for invalid congress');
      } else {
        this.results.push({
          test: testName,
          success: false,
          message: 'Unexpected data returned for invalid congress number',
        });
        console.log('⚠️  Unexpected result for invalid request');
      }
    } catch (error) {
      this.results.push({
        test: testName,
        success: true,
        message: 'Properly threw error for invalid request',
        error: (error as Error).message,
      });
      console.log(`✅ Error handling working - caught: ${(error as Error).message}`);
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY\n');

    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  ❌ ${r.test}: ${r.message}`);
          if (r.error) {
            console.log(`     Error: ${r.error}`);
          }
        });
    }

    console.log('\n' + '='.repeat(60));

    // Save results to file for analysis
    this.saveResults();
  }

  /**
   * Save test results to a JSON file
   */
  private async saveResults(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `congress-data-test-results-${timestamp}.json`;

      const results = {
        timestamp: new Date().toISOString(),
        congress: this.congress,
        session: this.session,
        summary: {
          total: this.results.length,
          passed: this.results.filter(r => r.success).length,
          failed: this.results.filter(r => !r.success).length,
        },
        results: this.results,
      };

      // In a real implementation, save to file system
      console.log(`\n💾 Test results would be saved to: ${filename}`);
      console.log('   (Implement fs.writeFile in your environment)');

      // For now, log the results object
      if (this.results.some(r => !r.success)) {
        console.log(
          '\n📊 Detailed failure data:',
          JSON.stringify(
            this.results.filter(r => !r.success),
            null,
            2
          )
        );
      }
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }
}

// Export test runner
export async function runCongressDataTests() {
  const tester = new CongressDataTester();
  await tester.runAllTests();
}

// If running directly (not as module)
if (require.main === module) {
  runCongressDataTests().catch(console.error);
}
