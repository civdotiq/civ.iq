/**
 * Test script to debug Congress.gov API data retrieval
 */

import dotenv from 'dotenv';
import { getComprehensiveBillsByMember } from '../src/services/congress/optimized-congress.service';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.CONGRESS_API_KEY;
const bioguideId = 'T000488';
const congress = 119;

async function testSponsoredLegislation() {
  console.log('\n=== Testing Sponsored Legislation ===');
  const url = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${API_KEY}&limit=250&congress=${congress}&format=json`;

  const response = await fetch(url);
  const data = await response.json();

  console.log('Total sponsored bills:', data.pagination?.count);
  console.log('Bills in response:', data.sponsoredLegislation?.length);
  console.log('First bill:', data.sponsoredLegislation?.[0]?.title?.substring(0, 50) + '...');

  return {
    total: data.pagination?.count || 0,
    fetched: data.sponsoredLegislation?.length || 0,
  };
}

interface CongressBill {
  number?: string;
  title?: string;
  introducedDate?: string;
  type?: string;
}

async function testCosponsoredLegislation() {
  console.log('\n=== Testing Cosponsored Legislation ===');

  let allBills: CongressBill[] = [];
  let offset = 0;
  const pageSize = 250;
  let totalCount = 0;
  let pageNum = 1;

  // Fetch up to 3 pages
  while (pageNum <= 3) {
    const url = `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?api_key=${API_KEY}&limit=${pageSize}&offset=${offset}&congress=${congress}&format=json`;

    console.log(`\nFetching page ${pageNum} (offset: ${offset})...`);
    const response = await fetch(url);
    const data = await response.json();

    const bills = data.cosponsoredLegislation || [];
    totalCount = data.pagination?.count || 0;

    console.log(`  - Total available: ${totalCount}`);
    console.log(`  - Bills in this page: ${bills.length}`);
    console.log(`  - Running total: ${allBills.length + bills.length}`);

    allBills = allBills.concat(bills);

    // Stop if we got less than a full page
    if (bills.length < pageSize) {
      console.log('  - Last page reached (incomplete page)');
      break;
    }

    // Stop if we've fetched all available
    if (allBills.length >= totalCount) {
      console.log('  - All bills fetched!');
      break;
    }

    offset += pageSize;
    pageNum++;

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\nCosponsored Summary:');
  console.log('  Total available from API:', totalCount);
  console.log('  Actually fetched:', allBills.length);
  console.log('  Pages fetched:', pageNum);

  return {
    total: totalCount,
    fetched: allBills.length,
  };
}

async function testOptimizedService() {
  console.log('\n=== Testing Optimized Service (Quick Test) ===');

  // Just test the service directly without waiting for all the raw API calls
  const startTime = Date.now();
  const result = await getComprehensiveBillsByMember({
    bioguideId,
    congress,
    limit: 100,
    page: 1,
  });
  const elapsed = Date.now() - startTime;

  console.log('Service Results:');
  console.log('  - Execution time:', elapsed, 'ms');
  console.log('  - Bills returned:', result.bills.length);
  console.log('  - Sponsored count (metadata):', result.metadata.sponsoredCount);
  console.log('  - Cosponsored count (metadata):', result.metadata.cosponsoredCount);
  console.log('  - Fetched sponsored:', result.metadata.fetchedSponsored);
  console.log('  - Fetched cosponsored:', result.metadata.fetchedCosponsored);
  console.log('  - Total fetched:', result.metadata.fetchedTotal);

  const sponsoredInResponse = result.bills.filter(b => b.relationship === 'sponsored').length;
  const cosponsoredInResponse = result.bills.filter(b => b.relationship === 'cosponsored').length;

  console.log('\nActual bills in response:');
  console.log('  - Sponsored bills:', sponsoredInResponse);
  console.log('  - Cosponsored bills:', cosponsoredInResponse);

  console.log('\nSuccess Check:');
  const hasSponsored = sponsoredInResponse > 0;
  const hasCosponsored = cosponsoredInResponse > 0;
  console.log('  - Has sponsored bills:', hasSponsored ? '✅' : '❌');
  console.log('  - Has cosponsored bills:', hasCosponsored ? '✅' : '❌');
  console.log(
    '  - Both types present:',
    hasSponsored && hasCosponsored ? '✅ SUCCESS!' : '❌ FAILED'
  );
}

async function main() {
  console.log('Testing Congress.gov API for', bioguideId, 'in', congress + 'th Congress');
  console.log('API Key configured:', API_KEY ? 'Yes' : 'No');

  try {
    // Just test the optimized service directly - skip the long raw API tests
    await testOptimizedService();
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
