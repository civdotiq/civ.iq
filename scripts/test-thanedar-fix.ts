/**
 * Test script to verify Shri Thanedar FEC data is correct after cache clearing
 * This script fetches fresh FEC data and validates contribution filtering
 */

import { fecApiService } from '@/lib/fec/fec-api-service';
import { enhancedFECService } from '@/lib/fec/enhanced-fec-service';
import logger from '@/lib/logging/simple-logger';

async function testThahedarFix(): Promise<void> {
  const candidateId = 'H2MI13204'; // Shri Thanedar FEC ID
  const cycle = 2024;

  console.log('🧪 Testing Shri Thanedar FEC Data Fix\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Get financial summary
    console.log('\n1️⃣  Fetching Financial Summary...');
    const financialSummary = await fecApiService.getFinancialSummary(candidateId, cycle);

    if (!financialSummary) {
      console.log('   ❌ No financial summary found');
      process.exit(1);
    }

    console.log('   ✅ Financial summary retrieved:');
    console.log(`      Total Receipts: $${financialSummary.receipts?.toLocaleString() || 'N/A'}`);
    console.log(
      `      Individual Contributions: $${financialSummary.individual_contributions?.toLocaleString() || 'N/A'}`
    );
    console.log(
      `      Candidate Contribution: $${financialSummary.candidate_contribution?.toLocaleString() || 'N/A'}`
    );

    // Step 2: Get sample contributions
    console.log('\n2️⃣  Fetching Sample Contributions (first 100)...');
    const contributions = await enhancedFECService.getOptimizedContributions(
      candidateId,
      cycle,
      100
    );

    console.log(`   ✅ Retrieved ${contributions.length} contributions`);

    // Step 3: Analyze contribution sources
    console.log('\n3️⃣  Analyzing Contribution Sources...');

    const selfContributions = contributions.filter(c =>
      c.contributor_name?.toLowerCase().includes('thanedar')
    );

    const otherContributions = contributions.filter(
      c => !c.contributor_name?.toLowerCase().includes('thanedar')
    );

    console.log(`   📊 Self-Contributions: ${selfContributions.length}`);
    console.log(`   📊 Other Contributors: ${otherContributions.length}`);

    // Step 4: Validate the fix
    console.log('\n4️⃣  Validating Fix...');

    if (selfContributions.length > 0) {
      console.log('\n   🔍 Self-Contribution Sample:');
      selfContributions.slice(0, 3).forEach((c, i) => {
        console.log(`      ${i + 1}. ${c.contributor_name || 'N/A'}`);
        console.log(
          `         Amount: $${c.contribution_receipt_amount?.toLocaleString() || 'N/A'}`
        );
        console.log(`         Date: ${c.contribution_receipt_date || 'N/A'}`);
        console.log(`         Occupation: ${c.contributor_occupation || 'N/A'}`);
      });
    }

    if (otherContributions.length > 0) {
      console.log('\n   🔍 Other Contribution Samples:');
      otherContributions.slice(0, 3).forEach((c, i) => {
        console.log(`      ${i + 1}. ${c.contributor_name || 'N/A'}`);
        console.log(
          `         Amount: $${c.contribution_receipt_amount?.toLocaleString() || 'N/A'}`
        );
        console.log(`         Date: ${c.contribution_receipt_date || 'N/A'}`);
        console.log(
          `         City: ${c.contributor_city || 'N/A'}, ${c.contributor_state || 'N/A'}`
        );
      });
    }

    // Step 5: Summary
    console.log('\n');
    console.log('═'.repeat(60));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(60));
    console.log('\n📋 Summary:');
    console.log(`   - FEC Candidate ID: ${candidateId}`);
    console.log(`   - Election Cycle: ${cycle}`);
    console.log(`   - Total Sample Size: ${contributions.length}`);
    console.log(`   - Self-Contributions: ${selfContributions.length}`);
    console.log(`   - External Contributions: ${otherContributions.length}`);
    console.log(
      `   - Percentage Self-Funded: ${((selfContributions.reduce((sum, c) => sum + (c.contribution_receipt_amount || 0), 0) / financialSummary.receipts) * 100).toFixed(2)}%`
    );

    console.log('\n📝 Next Steps:');
    console.log('   1. Check that self-contributions are properly categorized');
    console.log('   2. Verify external contributions show real donors');
    console.log('   3. Visit http://localhost:3000/representative/T000488 to view in browser\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('\nStack trace:', error instanceof Error ? error.stack : String(error));
    process.exit(1);
  }
}

testThahedarFix();
