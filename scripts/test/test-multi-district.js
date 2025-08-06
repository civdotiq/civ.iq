/**
 * Quick test script for multi-district ZIP functionality
 * 
 * Test cases:
 * - 10065: Multi-district ZIP (NYC area)
 * - 48201: Single district ZIP (Detroit)
 * - 01007: Multi-district ZIP (Massachusetts)
 */

async function testMultiDistrictZip(zipCode) {
  try {
    console.log(`\n🔍 Testing ZIP code: ${zipCode}`);
    
    const response = await fetch(`http://localhost:3000/api/representatives-multi-district?zip=${zipCode}`);
    const data = await response.json();
    
    if (!data.success) {
      console.log(`❌ Failed: ${data.error?.message || 'Unknown error'}`);
      return;
    }
    
    console.log(`✅ Success: ${data.isMultiDistrict ? 'Multi-district' : 'Single district'}`);
    console.log(`📊 Districts found: ${data.districts.length}`);
    
    data.districts.forEach((district, index) => {
      console.log(`   ${index + 1}. ${district.state}-${district.district}${district.primary ? ' (Primary)' : ''}`);
    });
    
    console.log(`👥 Representatives: ${data.representatives?.length || 0}`);
    
    if (data.warnings && data.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${data.warnings.join(', ')}`);
    }
    
    console.log(`⏱️  Processing time: ${data.metadata.processingTime}ms`);
    console.log(`📡 Data source: ${data.metadata.dataSource}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🧪 Testing Multi-District ZIP Functionality\n');
  
  // Test known multi-district ZIPs
  await testMultiDistrictZip('10065'); // NYC - should be multi-district
  await testMultiDistrictZip('01007'); // Massachusetts - should be multi-district
  await testMultiDistrictZip('11211'); // Brooklyn - should be multi-district
  
  // Test single district ZIP
  await testMultiDistrictZip('48201'); // Detroit - should be single district
  
  // Test invalid ZIP
  await testMultiDistrictZip('99999'); // Invalid - should fail gracefully
  
  console.log('\n✅ Multi-district testing complete!');
  console.log('\n💡 To test the UI:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Go to: http://localhost:3000');
  console.log('   3. Search for ZIP code "10065" or "01007"');
  console.log('   4. You should see the district selection UI');
}

// Run if this is the main module
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testMultiDistrictZip, runTests };