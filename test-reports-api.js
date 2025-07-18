/**
 * Test script for committee reports functionality
 */

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

async function testReportsAPI() {
  try {
    console.log('Testing Committee Reports API...');
    
    // Test the committee reports API endpoint
    const response = await fetch(`${baseUrl}/api/committee/HSJU/reports`);
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    console.log('Reports API Response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.reports && data.reports.length > 0) {
      console.log('✅ Reports API is working correctly');
      console.log(`Found ${data.reports.length} reports for committee ${data.committeeId}`);
      
      // Test each report structure
      data.reports.forEach((report, index) => {
        console.log(`Report ${index + 1}:`, {
          id: report.reportId,
          number: report.reportNumber,
          title: report.title.substring(0, 50) + '...',
          publishedDate: report.publishedDate,
          type: report.reportType
        });
      });
    } else {
      console.log('⚠️ API returned success but no reports found');
    }
    
  } catch (error) {
    console.error('❌ Error testing reports API:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testReportsAPI();
}

module.exports = { testReportsAPI };