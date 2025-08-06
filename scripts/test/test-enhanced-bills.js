/**
 * Test script for enhanced committee bills with actions
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testEnhancedBillsAPI() {
  try {
    console.log('Testing Enhanced Committee Bills API...');
    
    // Test the enhanced bills API endpoint
    const response = await fetch(`${baseUrl}/api/committee/HSJU/bills`);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Enhanced Bills API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.bills && data.bills.length > 0) {
      console.log('✅ Enhanced Bills API is working correctly');
      console.log(`Found ${data.bills.length} bills for committee ${data.committeeId}`);
      
      // Test each bill's enhanced structure
      data.bills.forEach((bill, index) => {
        console.log(`\nBill ${index + 1}: ${bill.billNumber}`);
        console.log(`Title: ${bill.title.substring(0, 50)}...`);
        console.log(`Committee Status: ${bill.committeeStatus}`);
        
        if (bill.committeeActions && bill.committeeActions.length > 0) {
          console.log(`Committee Actions (${bill.committeeActions.length}):`);
          bill.committeeActions.slice(0, 3).forEach(action => {
            console.log(`  - ${action.date} [${action.actionType}]: ${action.text.substring(0, 60)}...`);
            if (action.voteResult) {
              console.log(`    Vote: ${action.voteResult.yeas}-${action.voteResult.nays}`);
            }
            if (action.amendmentDetails) {
              console.log(`    Amendment ${action.amendmentDetails.number}: ${action.amendmentDetails.status}`);
            }
          });
        }
        
        if (bill.hearings && bill.hearings.length > 0) {
          console.log(`Hearings (${bill.hearings.length}):`);
          bill.hearings.forEach(hearing => {
            console.log(`  - ${hearing.date}: ${hearing.title}`);
            if (hearing.witnesses && hearing.witnesses.length > 0) {
              console.log(`    Witnesses: ${hearing.witnesses.join(', ')}`);
            }
          });
        }
        
        if (bill.nextCommitteeAction) {
          console.log(`Next Action: ${bill.nextCommitteeAction.description} (${bill.nextCommitteeAction.date})`);
        }
      });
    } else {
      console.log('⚠️ API returned success but no bills found');
    }
    
  } catch (error) {
    console.error('❌ Error testing enhanced bills API:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testEnhancedBillsAPI();
}

module.exports = { testEnhancedBillsAPI };