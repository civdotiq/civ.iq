#!/usr/bin/env npx tsx

/**
 * Test script to validate House voting XML parsing fix
 * Tests the improved parsing logic with real XML data
 */

import { batchVotingService } from '../src/features/representatives/services/batch-voting-service';

async function testHouseVotingParsing() {
  console.log('🔍 Testing House Voting XML Parsing Fix...\n');

  try {
    // Test with a real House representative
    const testBioguideId = 'P000034'; // Nancy Pelosi - reliable test case

    console.log(`📊 Testing House votes for bioguideId: ${testBioguideId}`);
    console.log('⏱️  This may take 10-15 seconds...\n');

    const startTime = Date.now();

    // Get House voting data with cache bypass to test fresh parsing
    const houseVotes = await batchVotingService.getHouseMemberVotes(
      testBioguideId,
      119, // Current Congress
      1, // Session
      5, // Limit to 5 votes for testing
      true // Bypass cache to test parsing
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log('📈 RESULTS:');
    console.log(`   House votes found: ${houseVotes.length}`);
    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Cache status: ${batchVotingService.getStatus().cacheSize} entries\n`);

    if (houseVotes.length > 0) {
      console.log('✅ SUCCESS: House voting data parsing is working!');
      console.log('\n📋 Sample vote data:');

      houseVotes.slice(0, 2).forEach((vote, index) => {
        console.log(`\n   Vote ${index + 1}:`);
        console.log(`   - Vote ID: ${vote.voteId}`);
        console.log(`   - Question: ${vote.question.substring(0, 60)}...`);
        console.log(`   - Position: ${vote.position}`);
        console.log(`   - Result: ${vote.result}`);
        console.log(`   - Date: ${vote.date}`);
        if (vote.rollCallNumber) {
          console.log(`   - Roll Call: ${vote.rollCallNumber}`);
        }
      });

      console.log('\n🎯 PHASE 3 FIX VERIFIED: House XML parsing now returns actual vote data!');
      return true;
    } else {
      console.log('❌ ISSUE: Still returning empty array');
      console.log('   - This suggests the XML parsing still needs work');
      console.log('   - Check logs for parsing details');
      return false;
    }
  } catch (error) {
    console.error('❌ ERROR during testing:', error);
    return false;
  }
}

async function testXMLParsingMethods() {
  console.log('\n🧪 Testing XML Parsing Methods...\n');

  // Test with sample XML that matches the real format we found
  const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<rollcall-vote>
<vote-data>
<recorded-vote><legislator name-id="P000034" party="D" state="CA" role="legislator">Pelosi</legislator><vote>Yea</vote></recorded-vote>
<recorded-vote><legislator name-id="M000312" party="D" state="MA" role="legislator">McGovern</legislator><vote>Yea</vote></recorded-vote>
<recorded-vote><legislator name-id="J000299" party="R" state="LA" role="legislator">Johnson</legislator><vote>Nay</vote></recorded-vote>
</vote-data>
</rollcall-vote>`;

  console.log('📝 Testing with sample XML...');

  // Access the private method through reflection for testing
  const service = batchVotingService as unknown as {
    parseHouseXMLPrimary: (xml: string) => Array<{
      bioguideId: string;
      name: string;
      party: string;
      state: string;
      position: string;
    }>;
  };

  try {
    const memberVotes = service.parseHouseXMLPrimary(sampleXML);

    console.log(`   Parsed ${memberVotes.length} member votes`);

    if (memberVotes.length > 0) {
      console.log('✅ XML Parsing method working correctly');
      memberVotes.forEach((vote, index: number) => {
        console.log(`   ${index + 1}. ${vote.name} (${vote.bioguideId}): ${vote.position}`);
      });
    } else {
      console.log('❌ XML Parsing method returning empty results');
    }

    return memberVotes.length > 0;
  } catch (error) {
    console.error('❌ XML Parsing method failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Phase 3 House Voting XML Parsing Test\n');
  console.log('='.repeat(60));

  // Test 1: XML parsing methods
  const xmlTestPassed = await testXMLParsingMethods();

  // Test 2: End-to-end voting data retrieval
  const e2eTestPassed = await testHouseVotingParsing();

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS:');
  console.log(`   XML Parsing: ${xmlTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   E2E Test: ${e2eTestPassed ? '✅ PASSED' : '❌ FAILED'}`);

  if (xmlTestPassed && e2eTestPassed) {
    console.log('\n🎉 Phase 3 House Voting Fix: COMPLETE!');
    console.log('   House voting data should now return actual results instead of empty arrays.');
  } else {
    console.log('\n⚠️  Phase 3 House Voting Fix: NEEDS MORE WORK');
    console.log('   Some tests failed - check the output above for details.');
  }

  console.log('\n💡 Next steps:');
  console.log('   - Test with a real representative profile page');
  console.log('   - Verify voting history tabs show data');
  console.log('   - Move to Phase 4 (Defensive UI) if tests pass');
}

// Run the test
main().catch(console.error);
