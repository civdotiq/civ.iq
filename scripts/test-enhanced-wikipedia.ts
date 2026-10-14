/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Test the enhanced Wikipedia search API with challenging representative names
 * This validates our improvements before running the full mapping generation
 */

import { getBiographyFromWikipedia } from '../src/lib/api/wikipedia';
import { getBiographyFromWikidata } from '../src/lib/api/wikidata';

interface TestCase {
  bioguideId: string;
  name: string;
  expectedChallenges: string[];
}

// Test cases with various naming challenges
const testCases: TestCase[] = [
  {
    bioguideId: 'S000033',
    name: 'Bernard Sanders',
    expectedChallenges: ['Nickname: Bernie', 'Common name variation'],
  },
  {
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    expectedChallenges: ['Simple name', 'High profile'],
  },
  {
    bioguideId: 'T000488',
    name: 'Shri Thanedar',
    expectedChallenges: ['Unusual first name', 'Less common'],
  },
  {
    bioguideId: 'M000355',
    name: 'Mitch McConnell',
    expectedChallenges: ['Nickname for Addison Mitchell'],
  },
  {
    bioguideId: 'C001047',
    name: 'Shelley Capito',
    expectedChallenges: ['Female name', 'Nickname for Shelley'],
  },
  {
    bioguideId: 'G000555',
    name: 'Kirsten Gillibrand',
    expectedChallenges: ['Scandinavian first name'],
  },
  {
    bioguideId: 'C001088',
    name: 'Christopher Coons',
    expectedChallenges: ['Common first name, nickname Chris'],
  },
  {
    bioguideId: 'B001230',
    name: 'Tammy Baldwin',
    expectedChallenges: ['Less formal first name'],
  },
];

async function testEnhancedSearch() {
  console.log('🧪 Testing Enhanced Wikipedia Search API\n');

  let successCount = 0;
  const totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name} (${testCase.bioguideId})`);
    console.log(`   Challenges: ${testCase.expectedChallenges.join(', ')}`);

    try {
      const [wikipediaResult, wikidataResult] = await Promise.all([
        getBiographyFromWikipedia(testCase.bioguideId, testCase.name),
        getBiographyFromWikidata(testCase.bioguideId),
      ]);

      // Check Wikipedia results
      if (wikipediaResult) {
        console.log(`   ✅ Wikipedia: Found "${wikipediaResult.title}"`);
        console.log(`      Summary: ${wikipediaResult.summary.substring(0, 100)}...`);
        console.log(`      Page: ${wikipediaResult.pageUrl}`);
      } else {
        console.log(`   ❌ Wikipedia: No results found`);
      }

      // Check Wikidata results
      if (wikidataResult) {
        console.log(`   ✅ Wikidata: Found biographical data`);
        if (wikidataResult.birthPlace) console.log(`      Birth: ${wikidataResult.birthPlace}`);
        if (wikidataResult.education?.length) {
          console.log(`      Education: ${wikidataResult.education.slice(0, 2).join(', ')}`);
        }
        if (wikidataResult.occupations?.length) {
          console.log(`      Occupations: ${wikidataResult.occupations.slice(0, 3).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Wikidata: No results found`);
      }

      // Count as success if either source found data
      if (wikipediaResult || wikidataResult) {
        successCount++;
        console.log(`   🎯 Result: SUCCESS`);
      } else {
        console.log(`   💥 Result: FAILED - No data from either source`);
      }
    } catch (error) {
      console.log(`   💥 Result: ERROR - ${error}`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Test Results Summary:');
  console.log(
    `✅ Successful: ${successCount}/${totalTests} (${Math.round((successCount / totalTests) * 100)}%)`
  );
  console.log(`❌ Failed: ${totalTests - successCount}/${totalTests}`);

  if (successCount === totalTests) {
    console.log('\n🎉 All tests passed! Enhanced API is working correctly.');
    console.log('✨ Ready to generate comprehensive mappings for all representatives.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the enhanced search algorithms.');
  }

  return successCount / totalTests;
}

// Run the test
if (require.main === module) {
  testEnhancedSearch().catch(console.error);
}

export { testEnhancedSearch };
