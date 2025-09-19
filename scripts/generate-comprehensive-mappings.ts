/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Generate comprehensive mappings for a subset of representatives
 * Creates static mapping files that will dramatically improve coverage
 */

import { getBiographyFromWikipedia } from '../src/lib/api/wikipedia';
import { findWikidataId } from '../src/lib/api/wikidata';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  district?: string;
}

/**
 * Generate mappings for a limited set of representatives
 */
async function generateMappingsLimited(limit: number = 100) {
  console.log(`🔄 Fetching representatives (limit: ${limit})...`);

  // Fetch representatives from the API
  const response = await fetch('http://localhost:3000/api/representatives/all');
  if (!response.ok) {
    throw new Error('Failed to fetch representatives');
  }

  const data = await response.json();
  const allRepresentatives: Representative[] = data.representatives;
  const representatives = allRepresentatives.slice(0, limit);

  console.log(
    `📊 Processing ${representatives.length} representatives of ${allRepresentatives.length} total`
  );

  const wikipediaMappings: Record<string, string> = {};
  const wikidataMappings: Record<string, string> = {};

  let processed = 0;
  let wikipediaSuccesses = 0;
  let wikidataSuccesses = 0;

  // Process in smaller batches to avoid rate limiting
  const batchSize = 3;

  for (let i = 0; i < representatives.length; i += batchSize) {
    const batch = representatives.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async rep => {
        try {
          console.log(`🔍 Processing: ${rep.name} (${rep.bioguideId})`);

          // Search Wikipedia with enhanced API
          const wikipediaResult = await getBiographyFromWikipedia(rep.bioguideId, rep.name);
          if (wikipediaResult) {
            // Extract the page name from the URL
            const pageName = wikipediaResult.pageUrl.split('/wiki/').pop();
            if (pageName) {
              wikipediaMappings[rep.bioguideId] = decodeURIComponent(pageName);
              wikipediaSuccesses++;
              console.log(`   ✅ Wikipedia: ${pageName}`);
            }
          } else {
            console.log(`   ❌ Wikipedia: No match`);
          }

          // Search Wikidata
          const wikidataId = await findWikidataId(rep.bioguideId);
          if (wikidataId) {
            wikidataMappings[rep.bioguideId] = wikidataId;
            wikidataSuccesses++;
            console.log(`   ✅ Wikidata: ${wikidataId}`);
          } else {
            console.log(`   ❌ Wikidata: No match`);
          }

          processed++;
        } catch (error) {
          console.error(`❌ Error processing ${rep.name}:`, error);
          processed++;
        }
      })
    );

    // Rate limiting pause
    if (i + batchSize < representatives.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const progressPct = Math.round((processed / representatives.length) * 100);
    console.log(`📈 Progress: ${processed}/${representatives.length} (${progressPct}%)`);
    console.log(
      `   Wikipedia: ${wikipediaSuccesses}/${processed} (${Math.round((wikipediaSuccesses / processed) * 100)}%)`
    );
    console.log(
      `   Wikidata: ${wikidataSuccesses}/${processed} (${Math.round((wikidataSuccesses / processed) * 100)}%)\n`
    );
  }

  // Generate the static mapping files
  await generateMappingFiles(
    wikipediaMappings,
    wikidataMappings,
    processed,
    allRepresentatives.length
  );

  console.log('\n📊 Final Results:');
  console.log(
    `📖 Wikipedia: ${wikipediaSuccesses}/${processed} (${Math.round((wikipediaSuccesses / processed) * 100)}%)`
  );
  console.log(
    `🌐 Wikidata: ${wikidataSuccesses}/${processed} (${Math.round((wikidataSuccesses / processed) * 100)}%)`
  );
  console.log(
    `🎯 Combined Coverage: ${Math.max(wikipediaSuccesses, wikidataSuccesses)}/${processed} (${Math.round((Math.max(wikipediaSuccesses, wikidataSuccesses) / processed) * 100)}%)`
  );

  return {
    wikipedia: wikipediaSuccesses / processed,
    wikidata: wikidataSuccesses / processed,
    combined: Math.max(wikipediaSuccesses, wikidataSuccesses) / processed,
  };
}

/**
 * Generate TypeScript mapping files
 */
async function generateMappingFiles(
  wikipediaMappings: Record<string, string>,
  wikidataMappings: Record<string, string>,
  processed: number,
  total: number
) {
  const fs = await import('fs/promises');

  const wikipediaContent = `/**
 * Generated Wikipedia mappings for representatives
 * Generated on: ${new Date().toISOString()}
 * Processed: ${processed}/${total} representatives
 * Wikipedia mappings: ${Object.keys(wikipediaMappings).length}
 * Coverage: ${Math.round((Object.keys(wikipediaMappings).length / processed) * 100)}%
 */

// Enhanced bioguide-to-Wikipedia mappings
export const ENHANCED_BIOGUIDE_TO_WIKIPEDIA: Record<string, string> = ${JSON.stringify(wikipediaMappings, null, 2)};

/**
 * Check if bioguide ID has enhanced Wikipedia mapping
 */
export function hasEnhancedWikipediaMapping(bioguideId: string): boolean {
  return bioguideId in ENHANCED_BIOGUIDE_TO_WIKIPEDIA;
}

/**
 * Get Wikipedia page name for bioguide ID
 */
export function getEnhancedWikipediaPageName(bioguideId: string): string | null {
  return ENHANCED_BIOGUIDE_TO_WIKIPEDIA[bioguideId] || null;
}
`;

  const wikidataContent = `/**
 * Generated Wikidata mappings for representatives
 * Generated on: ${new Date().toISOString()}
 * Processed: ${processed}/${total} representatives
 * Wikidata mappings: ${Object.keys(wikidataMappings).length}
 * Coverage: ${Math.round((Object.keys(wikidataMappings).length / processed) * 100)}%
 */

// Enhanced bioguide-to-Wikidata mappings
export const ENHANCED_BIOGUIDE_TO_WIKIDATA: Record<string, string> = ${JSON.stringify(wikidataMappings, null, 2)};

/**
 * Check if bioguide ID has enhanced Wikidata mapping
 */
export function hasEnhancedWikidataMapping(bioguideId: string): boolean {
  return bioguideId in ENHANCED_BIOGUIDE_TO_WIKIDATA;
}

/**
 * Get Wikidata ID for bioguide ID
 */
export function getEnhancedWikidataId(bioguideId: string): string | null {
  return ENHANCED_BIOGUIDE_TO_WIKIDATA[bioguideId] || null;
}
`;

  // Ensure directory exists
  await fs.mkdir('/mnt/d/civic-intel-hub/src/lib/data', { recursive: true });

  // Write the mapping files
  await fs.writeFile(
    '/mnt/d/civic-intel-hub/src/lib/data/enhanced-wikipedia-mappings.ts',
    wikipediaContent
  );
  await fs.writeFile(
    '/mnt/d/civic-intel-hub/src/lib/data/enhanced-wikidata-mappings.ts',
    wikidataContent
  );

  console.log('\n✅ Enhanced mapping files generated:');
  console.log('   - src/lib/data/enhanced-wikipedia-mappings.ts');
  console.log('   - src/lib/data/enhanced-wikidata-mappings.ts');
  console.log('\n🔧 Next steps:');
  console.log('1. Import these mappings in the original API files');
  console.log('2. Update static mapping lookups to use enhanced mappings');
  console.log('3. Run more batches to reach 100% coverage');
}

// Run the script
if (require.main === module) {
  const limit = process.argv[2] ? parseInt(process.argv[2]) : 100;
  generateMappingsLimited(limit).catch(console.error);
}

export { generateMappingsLimited };
