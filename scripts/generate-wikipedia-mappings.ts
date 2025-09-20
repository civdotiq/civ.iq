/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Generate comprehensive Wikipedia and Wikidata mappings for all representatives
 * This script fetches all representatives and creates bioguide-to-Wikipedia mappings
 * to improve biographical data coverage
 */

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
  district?: string;
}

interface WikipediaSearchResult {
  pages: Array<{
    key: string;
    title: string;
    excerpt: string;
    matched_title?: string;
    description?: string;
  }>;
}

interface WikidataSearchResult {
  results: {
    bindings: Array<{
      person: {
        value: string;
      };
    }>;
  };
}

/**
 * Search Wikipedia for representative page
 */
async function searchWikipedia(representative: Representative): Promise<string | null> {
  try {
    const searchTerms = [
      `${representative.name} United States Congress`,
      `${representative.name} ${representative.chamber} ${representative.state}`,
      `${representative.name} ${representative.party}`,
    ];

    for (const searchTerm of searchTerms) {
      const searchQuery = encodeURIComponent(searchTerm);
      const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${searchQuery}`;

      const response = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
        },
      });

      if (!response.ok) continue;

      const searchResults: WikipediaSearchResult = await response.json();
      if (!searchResults.pages?.length) continue;

      // Look for exact matches or congress-related pages
      const bestMatch = searchResults.pages.find(page => {
        const title = page.title.toLowerCase();
        const name = representative.name.toLowerCase();
        const excerpt = page.excerpt?.toLowerCase() || '';

        return (
          title.includes(name) &&
          (title.includes('congress') ||
            title.includes('senate') ||
            title.includes('house') ||
            title.includes('representative') ||
            title.includes('senator') ||
            excerpt.includes('congress') ||
            excerpt.includes('senate') ||
            excerpt.includes('house'))
        );
      });

      if (bestMatch) {
        return bestMatch.key;
      }

      // If no perfect match, take the first result if it contains the name
      const nameMatch = searchResults.pages.find(page =>
        page.title.toLowerCase().includes(representative.name.toLowerCase())
      );

      if (nameMatch) {
        return nameMatch.key;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Wikipedia search failed for ${representative.name}:`, error);
    return null;
  }
}

/**
 * Search Wikidata for representative using bioguide ID
 */
async function searchWikidata(bioguideId: string): Promise<string | null> {
  try {
    const query = `
      SELECT ?person WHERE {
        ?person wdt:P1157 "${bioguideId}" .
      }
    `;

    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetch(sparqlUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
      },
    });

    if (!response.ok) return null;

    const data: WikidataSearchResult = await response.json();
    if (!data.results?.bindings?.length) return null;

    const binding = data.results.bindings[0];
    if (!binding?.person?.value) return null;

    const wikidataUri = binding.person.value;
    const wikidataId = wikidataUri.split('/').pop();

    return wikidataId ?? null;
  } catch (error) {
    console.warn(`Wikidata search failed for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Generate mappings for all representatives
 */
async function generateMappings() {
  console.log('🔄 Fetching all representatives...');

  // Fetch all representatives from the API
  const response = await fetch('http://localhost:3000/api/representatives/all');
  if (!response.ok) {
    throw new Error('Failed to fetch representatives');
  }

  const data = await response.json();
  const representatives: Representative[] = data.representatives;

  console.log(`📊 Found ${representatives.length} representatives`);

  const wikipediaMappings: Record<string, string> = {};
  const wikidataMappings: Record<string, string> = {};

  let processed = 0;
  const batchSize = 5; // Process in small batches to avoid rate limiting

  for (let i = 0; i < representatives.length; i += batchSize) {
    const batch = representatives.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async rep => {
        try {
          // Search Wikipedia
          const wikipediaPage = await searchWikipedia(rep);
          if (wikipediaPage) {
            wikipediaMappings[rep.bioguideId] = wikipediaPage;
            console.log(`✅ Wikipedia: ${rep.name} -> ${wikipediaPage}`);
          } else {
            console.log(`❌ Wikipedia: No match for ${rep.name}`);
          }

          // Search Wikidata
          const wikidataId = await searchWikidata(rep.bioguideId);
          if (wikidataId) {
            wikidataMappings[rep.bioguideId] = wikidataId;
            console.log(`✅ Wikidata: ${rep.name} -> ${wikidataId}`);
          } else {
            console.log(`❌ Wikidata: No match for ${rep.name} (${rep.bioguideId})`);
          }

          processed++;
        } catch (error) {
          console.error(`❌ Error processing ${rep.name}:`, error);
        }
      })
    );

    // Rate limiting pause
    if (i + batchSize < representatives.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(
      `📈 Progress: ${processed}/${representatives.length} (${Math.round((processed / representatives.length) * 100)}%)`
    );
  }

  // Generate TypeScript mapping files
  const wikipediaContent = `/**
 * Generated Wikipedia mappings for all representatives
 * Generated on: ${new Date().toISOString()}
 * Total mappings: ${Object.keys(wikipediaMappings).length}
 */

// Map bioguide IDs to Wikipedia page names
export const BIOGUIDE_TO_WIKIPEDIA: Record<string, string> = ${JSON.stringify(wikipediaMappings, null, 2)};

/**
 * Check if bioguide ID has Wikipedia mapping
 */
export function hasWikipediaMapping(bioguideId: string): boolean {
  return bioguideId in BIOGUIDE_TO_WIKIPEDIA;
}

/**
 * Get Wikipedia page name for bioguide ID
 */
export function getWikipediaPageName(bioguideId: string): string | null {
  return BIOGUIDE_TO_WIKIPEDIA[bioguideId] || null;
}
`;

  const wikidataContent = `/**
 * Generated Wikidata mappings for all representatives
 * Generated on: ${new Date().toISOString()}
 * Total mappings: ${Object.keys(wikidataMappings).length}
 */

// Map bioguide IDs to Wikidata IDs
export const BIOGUIDE_TO_WIKIDATA: Record<string, string> = ${JSON.stringify(wikidataMappings, null, 2)};

/**
 * Check if bioguide ID has Wikidata mapping
 */
export function hasWikidataMapping(bioguideId: string): boolean {
  return bioguideId in BIOGUIDE_TO_WIKIDATA;
}

/**
 * Get Wikidata ID for bioguide ID
 */
export function getWikidataId(bioguideId: string): string | null {
  return BIOGUIDE_TO_WIKIDATA[bioguideId] || null;
}
`;

  // Write the mapping files
  const fs = await import('fs/promises');

  await fs.writeFile('/mnt/d/civic-intel-hub/src/lib/data/wikipedia-mappings.ts', wikipediaContent);

  await fs.writeFile('/mnt/d/civic-intel-hub/src/lib/data/wikidata-mappings.ts', wikidataContent);

  console.log('\n📊 Generation Summary:');
  console.log(
    `📖 Wikipedia mappings: ${Object.keys(wikipediaMappings).length}/${representatives.length} (${Math.round((Object.keys(wikipediaMappings).length / representatives.length) * 100)}%)`
  );
  console.log(
    `🌐 Wikidata mappings: ${Object.keys(wikidataMappings).length}/${representatives.length} (${Math.round((Object.keys(wikidataMappings).length / representatives.length) * 100)}%)`
  );
  console.log('\n✅ Mapping files generated:');
  console.log('   - src/lib/data/wikipedia-mappings.ts');
  console.log('   - src/lib/data/wikidata-mappings.ts');

  // Generate update instructions
  console.log('\n🔧 Next steps:');
  console.log('1. Update src/lib/api/wikipedia.ts to import from new mapping file');
  console.log('2. Update src/lib/api/wikidata.ts to import from new mapping file');
  console.log('3. Test biographical data coverage improvements');
}

// Run the script
if (require.main === module) {
  generateMappings().catch(console.error);
}

export { generateMappings };
