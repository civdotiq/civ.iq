/**
 * Debug script to test Congress.gov API for T000488 (Shri Thanedar)
 * vs K000367 (Amy Klobuchar) to identify why T000488 shows 0 bills
 */

import 'dotenv/config';

const API_KEY = process.env.CONGRESS_API_KEY;

if (!API_KEY) {
  console.error('❌ CONGRESS_API_KEY not found in environment');
  process.exit(1);
}

// TypeScript assertion after null check
const apiKey: string = API_KEY;

async function testCongressAPI(bioguideId: string, name: string, chamber: string) {
  console.log(`\n=== Testing ${name} (${bioguideId}) - ${chamber} ==`);

  // Test basic member info
  try {
    const memberUrl = `https://api.congress.gov/v3/member/${bioguideId}?api_key=${apiKey}&format=json`;
    console.log(`\n🔍 Member Info URL: ${memberUrl.replace(apiKey, '***')}`);

    const memberResponse = await fetch(memberUrl);
    if (!memberResponse.ok) {
      console.error(`❌ Member API failed: ${memberResponse.status} ${memberResponse.statusText}`);
      return;
    }

    const memberData = await memberResponse.json();
    console.log(`✅ Member found: ${memberData.member?.firstName} ${memberData.member?.lastName}`);
    console.log(`   Chamber: ${memberData.member?.terms?.[0]?.chamber}`);
    console.log(`   State: ${memberData.member?.state}`);
    console.log(`   Party: ${memberData.member?.partyName}`);
  } catch (error) {
    console.error(`❌ Member info error:`, error);
    return;
  }

  // Test sponsored legislation
  try {
    const sponsoredUrl = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${apiKey}&congress=119&limit=250&offset=0&format=json`;
    console.log(`\n🔍 Sponsored URL: ${sponsoredUrl.replace(apiKey, '***')}`);

    const sponsoredResponse = await fetch(sponsoredUrl);
    if (!sponsoredResponse.ok) {
      console.error(
        `❌ Sponsored API failed: ${sponsoredResponse.status} ${sponsoredResponse.statusText}`
      );
      const errorText = await sponsoredResponse.text();
      console.error(`   Error body: ${errorText}`);
      return;
    }

    const sponsoredData = await sponsoredResponse.json();
    console.log(`✅ Sponsored legislation API responded`);
    console.log(`   Total count: ${sponsoredData.pagination?.count || 0}`);
    console.log(`   Bills returned: ${sponsoredData.sponsoredLegislation?.length || 0}`);

    if (sponsoredData.sponsoredLegislation?.length > 0) {
      console.log(`   First 3 bills:`);
      sponsoredData.sponsoredLegislation
        .slice(0, 3)
        .forEach((bill: Record<string, unknown>, index: number) => {
          console.log(`     ${index + 1}. ${bill.number} - ${bill.title}`);
          console.log(`        Introduced: ${bill.introducedDate}`);
          console.log(`        Congress: ${bill.congress}`);
          console.log(`        Type: ${bill.type}`);
        });
    } else {
      console.log(`   ⚠️  No sponsored bills found`);
      console.log(`   Raw response keys:`, Object.keys(sponsoredData));
      console.log(`   Raw pagination:`, JSON.stringify(sponsoredData.pagination, null, 2));
    }
  } catch (error) {
    console.error(`❌ Sponsored legislation error:`, error);
  }

  // Test cosponsored legislation
  try {
    const cosponsoredUrl = `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?api_key=${apiKey}&congress=119&limit=250&offset=0&format=json`;
    console.log(`\n🔍 Cosponsored URL: ${cosponsoredUrl.replace(apiKey, '***')}`);

    const cosponsoredResponse = await fetch(cosponsoredUrl);
    if (!cosponsoredResponse.ok) {
      console.error(
        `❌ Cosponsored API failed: ${cosponsoredResponse.status} ${cosponsoredResponse.statusText}`
      );
      const errorText = await cosponsoredResponse.text();
      console.error(`   Error body: ${errorText}`);
      return;
    }

    const cosponsoredData = await cosponsoredResponse.json();
    console.log(`✅ Cosponsored legislation API responded`);
    console.log(`   Total count: ${cosponsoredData.pagination?.count || 0}`);
    console.log(`   Bills returned: ${cosponsoredData.cosponsoredLegislation?.length || 0}`);

    if (cosponsoredData.cosponsoredLegislation?.length > 0) {
      console.log(`   First 3 bills:`);
      cosponsoredData.cosponsoredLegislation
        .slice(0, 3)
        .forEach((bill: Record<string, unknown>, index: number) => {
          console.log(`     ${index + 1}. ${bill.number} - ${bill.title}`);
          console.log(`        Introduced: ${bill.introducedDate}`);
          console.log(`        Congress: ${bill.congress}`);
          console.log(`        Type: ${bill.type}`);
        });
    } else {
      console.log(`   ⚠️  No cosponsored bills found`);
      console.log(`   Raw response keys:`, Object.keys(cosponsoredData));
      console.log(`   Raw pagination:`, JSON.stringify(cosponsoredData.pagination, null, 2));
    }
  } catch (error) {
    console.error(`❌ Cosponsored legislation error:`, error);
  }

  console.log(`\n${'='.repeat(80)}`);
}

async function main() {
  console.log('🔍 Congress.gov API Debug Test');
  console.log('Testing why T000488 shows 0 bills vs working representatives\n');

  // Test the working Senate representative first
  await testCongressAPI('K000367', 'Amy Klobuchar', 'Senate');

  // Test the problematic House representative
  await testCongressAPI('T000488', 'Shri Thanedar', 'House');

  // Test another House representative for comparison
  await testCongressAPI('P000034', 'Frank Pallone Jr.', 'House');
}

main().catch(console.error);
