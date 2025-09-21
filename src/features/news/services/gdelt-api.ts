/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// GDELT API utility with proper error handling, rate limiting, and retry logic
import logger from '@/lib/logging/simple-logger';
import {
  deduplicateNews,
  type NewsArticle,
  type DuplicationStats,
  type DeduplicationOptions,
} from '@/features/news/utils/news-deduplication';
import { GDELTArticle, GDELTResponse } from '@/types/gdelt';
import { validateGDELTResponse } from '@/lib/validation/gdelt-schemas';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class GDELTAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'GDELTAPIError';
  }
}

// Rate limiting: Track API calls to respect GDELT's usage guidelines
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCallsPerMinute = 30; // Conservative limit for GDELT

  canMakeCall(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove calls older than 1 minute
    this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);

    return this.calls.length < this.maxCallsPerMinute;
  }

  recordCall(): void {
    this.calls.push(Date.now());
  }

  getWaitTime(): number {
    if (this.canMakeCall()) return 0;

    const oldestCall = Math.min(...this.calls);
    const waitTime = 60000 - (Date.now() - oldestCall);
    return Math.max(waitTime, 0);
  }
}

const rateLimiter = new RateLimiter();

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof GDELTAPIError && !error.retryable) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === options.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(options.baseDelay * Math.pow(2, attempt), options.maxDelay);

      logger.warn(`GDELT API retry attempt ${attempt + 1}`, {
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
        operation: 'gdelt_api_retry',
      });
      await sleep(delay);
    }
  }

  throw lastError!;
}

// High-profile member nickname mapping for better GDELT coverage
const REPRESENTATIVE_NICKNAMES: Record<string, string[]> = {
  // House Representatives
  'Alexandria Ocasio-Cortez': ['AOC'],
  'Ilhan Omar': ['Rep. Omar'],
  'Rashida Tlaib': ['Rep. Tlaib'],
  'Ayanna Pressley': ['Rep. Pressley'],
  'Matt Gaetz': ['Rep. Gaetz'],
  'Marjorie Taylor Greene': ['MTG', 'Rep. Greene'],
  'Lauren Boebert': ['Rep. Boebert'],
  'Nancy Pelosi': ['Speaker Pelosi'],
  'Kevin McCarthy': ['Leader McCarthy'],
  'Hakeem Jeffries': ['Leader Jeffries'],
  'Jim Jordan': ['Rep. Jordan'],
  'Adam Schiff': ['Rep. Schiff'],

  // Senators
  'Bernie Sanders': ['Bernie'],
  'Bernard Sanders': ['Bernie Sanders', 'Bernie'], // Map formal to common
  'Elizabeth Warren': ['Sen. Warren'],
  'Ted Cruz': ['Sen. Cruz'],
  'Rafael Cruz': ['Ted Cruz', 'Sen. Cruz'], // Map formal to common
  'Josh Hawley': ['Sen. Hawley'],
  'Marco Rubio': ['Sen. Rubio'],
  'Mitt Romney': ['Sen. Romney'],
  'Willard Romney': ['Mitt Romney', 'Sen. Romney'], // Map formal to common
  'John Cornyn': ['Sen. Cornyn'],
  'Chuck Schumer': ['Leader Schumer', 'Majority Leader Schumer'],
  'Charles Schumer': ['Chuck Schumer', 'Leader Schumer', 'Majority Leader Schumer'], // Map formal name to common name
  'Mitch McConnell': ['Leader McConnell', 'Minority Leader McConnell'],
  'Addison McConnell': ['Mitch McConnell', 'Leader McConnell'], // Map formal to common
  'Joe Manchin': ['Sen. Manchin'],
  'Joseph Manchin': ['Joe Manchin', 'Sen. Manchin'], // Map formal to common
  'Kyrsten Sinema': ['Sen. Sinema'],
  'Susan Collins': ['Sen. Collins'],
  'Lisa Murkowski': ['Sen. Murkowski'],
  'Amy Klobuchar': ['Sen. Klobuchar'],
  'Kamala Harris': ['VP Harris', 'Vice President Harris'],
  'Elissa Slotkin': ['Rep. Slotkin', 'Senator Slotkin'], // Now Senator from Michigan
};

// Get major cities for a congressional district to enhance geographic relevance
function getDistrictCities(state: string, districtNumber: number): string[] {
  const districtCityMap: Record<string, Record<number, string[]>> = {
    // Top 20 most populous districts and major metropolitan areas
    TX: {
      1: ['Marshall', 'Longview', 'Tyler'],
      2: ['Huntsville', 'Conroe', 'Spring'],
      3: ['Plano', 'McKinney', 'Allen'],
      7: ['Houston', 'Katy', 'Cypress'],
      9: ['Houston', 'Missouri City', 'Sugar Land'],
      18: ['Houston', 'Heights', 'Downtown Houston'],
      20: ['San Antonio', 'Leon Valley'],
      21: ['San Antonio', 'New Braunfels'],
      22: ['Houston', 'Pearland', 'Friendswood'],
      24: ['Dallas', 'Carrollton', 'Farmers Branch'],
      32: ['Dallas', 'Grand Prairie', 'Irving'],
      35: ['Austin', 'Cedar Park', 'Round Rock'],
    },
    CA: {
      1: ['Eureka', 'Redding', 'Chico'],
      6: ['Sacramento', 'Elk Grove', 'Folsom'],
      7: ['Davis', 'Woodland', 'West Sacramento'],
      11: ['Modesto', 'Tracy', 'Manteca'],
      12: ['San Francisco', 'Daly City'],
      13: ['Oakland', 'San Leandro', 'Alameda'],
      14: ['San Mateo', 'Redwood City', 'Foster City'],
      15: ['San Jose', 'Campbell', 'Los Gatos'],
      16: ['Fresno', 'Clovis', 'Madera'],
      17: ['Santa Cruz', 'Watsonville', 'Capitola'],
      18: ['Modesto', 'Turlock', 'Riverbank'],
      27: ['Los Angeles', 'Alhambra', 'San Gabriel'],
      28: ['Los Angeles', 'Hollywood', 'West Hollywood'],
      30: ['Los Angeles', 'Glendale', 'Burbank'],
      33: ['Los Angeles', 'Beverly Hills', 'West LA'],
      34: ['Los Angeles', 'Hollywood'],
      37: ['Los Angeles', 'Gardena', 'Carson'],
      39: ['Fullerton', 'Buena Park', 'La Habra'],
      40: ['Riverside', 'Moreno Valley', 'Perris'],
      45: ['Irvine', 'Tustin', 'Lake Forest'],
      47: ['Long Beach', 'Signal Hill'],
      48: ['Huntington Beach', 'Costa Mesa', 'Newport Beach'],
      49: ['San Diego', 'Encinitas', 'Carlsbad'],
      50: ['San Diego', 'Chula Vista', 'National City'],
      52: ['San Diego', 'Poway', 'Del Mar'],
      53: ['San Diego', 'El Cajon', 'La Mesa'],
    },
    FL: {
      1: ['Pensacola', 'Gulf Breeze', 'Milton'],
      7: ['St. Petersburg', 'Clearwater', 'Largo'],
      9: ['Orlando', 'Winter Park', 'Altamonte Springs'],
      10: ['Tampa', 'Temple Terrace', 'Plant City'],
      11: ['Tampa', 'Carrollwood', 'Town N Country'],
      13: ['Tampa', 'Hillsborough', 'Brandon'],
      14: ['Tampa', 'Hyde Park', 'Westchase'],
      20: ['Fort Lauderdale', 'Sunrise', 'Plantation'],
      21: ['Miami', 'Miami Beach', 'Coral Gables'],
      23: ['Miami', 'Homestead', 'Florida City'],
      24: ['Miami', 'Kendall', 'Pinecrest'],
      25: ['Miami', 'Doral', 'Aventura'],
      26: ['Miami', 'Key Biscayne', 'Palmetto Bay'],
      27: ['Miami', 'Hialeah', 'Miami Lakes'],
    },
    NY: {
      1: ['Brookhaven', 'Islip', 'Babylon'],
      3: ['Hempstead', 'Garden City', 'Uniondale'],
      4: ['Hempstead', 'Levittown', 'East Meadow'],
      5: ['Staten Island', 'New York'],
      6: ['Queens', 'Astoria', 'Long Island City'],
      7: ['Queens', 'Elmhurst', 'Corona'],
      8: ['Brooklyn', 'Coney Island', 'Brighton Beach'],
      9: ['Brooklyn', 'Park Slope', 'Prospect Heights'],
      10: ['Manhattan', 'Lower East Side', 'Chinatown'],
      11: ['Brooklyn', 'Red Hook', 'Carroll Gardens'],
      12: ['Manhattan', 'Upper West Side', 'Harlem'],
      13: ['Manhattan', 'Upper East Side', 'Midtown'],
      14: ['Bronx', 'Mount Vernon'],
      15: ['Bronx', 'South Bronx', 'Mott Haven'],
      16: ['Bronx', 'Riverdale', 'Kingsbridge'],
    },
    IL: {
      1: ['Chicago', 'Evanston', 'Wilmette'],
      2: ['Chicago', 'South Side', 'Hyde Park'],
      3: ['Chicago', 'Southwest Side', 'Midway'],
      4: ['Chicago', 'North Side', 'Uptown'],
      5: ['Chicago', 'Northwest Side', 'Jefferson Park'],
      6: ['Wheaton', 'Glen Ellyn', 'Carol Stream'],
      7: ['Chicago', 'West Side', 'Oak Park'],
      8: ['Schaumburg', 'Elgin', 'Hoffman Estates'],
      9: ['Evanston', 'Skokie', 'Morton Grove'],
      10: ['Highland Park', 'Deerfield', 'Northbrook'],
      11: ['Naperville', 'Lisle', 'Warrenville'],
    },
    PA: {
      1: ['Philadelphia', 'South Philadelphia'],
      2: ['Philadelphia', 'West Philadelphia'],
      3: ['Philadelphia', 'North Philadelphia'],
      5: ['Delaware County', 'Chester', 'Yeadon'],
      7: ['Lehigh Valley', 'Allentown', 'Bethlehem'],
      8: ['Bucks County', 'Levittown', 'Bristol'],
      12: ['Pittsburgh', 'Squirrel Hill', 'Shadyside'],
      17: ['Harrisburg', 'Camp Hill', 'Mechanicsburg'],
      18: ['Pittsburgh', 'Mt. Lebanon', 'Bethel Park'],
    },
    OH: {
      1: ['Cincinnati', 'Hamilton', 'Springdale'],
      3: ['Columbus', 'Westerville', 'Gahanna'],
      11: ['Cleveland', 'Lakewood', 'Rocky River'],
      13: ['Akron', 'Barberton', 'Norton'],
      15: ['Columbus', 'Upper Arlington', 'Grandview Heights'],
    },
    MI: {
      7: ['Lansing', 'East Lansing', 'Battle Creek'],
      8: ['Flint', 'Bay City', 'Midland'],
      11: ['Detroit', 'Hamtramck', 'Highland Park'],
      12: ['Detroit', 'Dearborn', 'Dearborn Heights'],
      13: ['Detroit', 'Southwest Detroit'],
      14: ['Detroit', 'Grosse Pointe', 'Harper Woods'],
    },
    MN: {
      3: ['Minneapolis', 'Bloomington', 'Plymouth'],
      4: ['St. Paul', 'Falcon Heights', 'Lauderdale'],
      5: ['Minneapolis', 'St. Paul'],
    },
    WA: {
      1: ['Seattle', 'Bellevue', 'Redmond'],
      7: ['Seattle', 'Ballard', 'Fremont'],
      9: ['Seattle', 'Federal Way', 'Tukwila'],
      10: ['Tacoma', 'Lakewood', 'Steilacoom'],
    },
    GA: {
      4: ['Atlanta', 'Decatur', 'Stone Mountain'],
      5: ['Atlanta', 'East Point', 'College Park'],
      6: ['Atlanta', 'Sandy Springs', 'Dunwoody'],
      7: ['Atlanta', 'Marietta', 'Smyrna'],
      13: ['Atlanta', 'Buckhead', 'Brookhaven'],
    },
    NC: {
      4: ['Raleigh', 'Cary', 'Apex'],
      9: ['Charlotte', 'Matthews', 'Mint Hill'],
      12: ['Charlotte', 'Gastonia', 'Belmont'],
    },
    NJ: {
      6: ['Trenton', 'Princeton', 'Lawrenceville'],
      8: ['Newark', 'Jersey City', 'Hoboken'],
      10: ['Paterson', 'Clifton', 'Passaic'],
      11: ['Morris County', 'Morristown', 'Madison'],
    },
    VA: {
      8: ['Arlington', 'Alexandria', 'Falls Church'],
      10: ['Fairfax', 'Vienna', 'Oakton'],
      11: ['Fairfax', 'Reston', 'Herndon'],
    },
    AZ: {
      1: ['Phoenix', 'Scottsdale', 'Tempe'],
      3: ['Phoenix', 'Glendale', 'Peoria'],
      4: ['Phoenix', 'Mesa', 'Chandler'],
      9: ['Phoenix', 'South Phoenix', 'Ahwatukee'],
    },
    CO: {
      1: ['Denver', 'Capitol Hill', 'Five Points'],
      2: ['Boulder', 'Longmont', 'Lafayette'],
      6: ['Aurora', 'Centennial', 'Littleton'],
      7: ['Denver', 'Lakewood', 'Wheat Ridge'],
    },
    OR: {
      1: ['Portland', 'Beaverton', 'Tigard'],
      3: ['Portland', 'Lake Oswego', 'Milwaukie'],
      5: ['Salem', 'Keizer', 'Silverton'],
    },
    WI: {
      2: ['Madison', 'Middleton', 'Fitchburg'],
      4: ['Milwaukee', 'West Allis', 'Greenfield'],
      5: ['Milwaukee', 'Wauwatosa', 'Brookfield'],
    },
    NV: {
      1: ['Las Vegas', 'Henderson', 'Paradise'],
      3: ['Las Vegas', 'North Las Vegas', 'Summerlin'],
      4: ['Reno', 'Sparks', 'Carson City'],
    },
    TN: {
      5: ['Nashville', 'Franklin', 'Brentwood'],
      7: ['Memphis', 'Germantown', 'Collierville'],
      9: ['Memphis', 'Bartlett', 'Millington'],
    },
    IN: {
      7: ['Indianapolis', 'Carmel', 'Fishers'],
      9: ['Indianapolis', 'Speedway', 'Beech Grove'],
    },
    MD: {
      4: ['Baltimore', 'Towson', 'Dundalk'],
      7: ['Baltimore', 'Columbia', 'Ellicott City'],
      8: ['Rockville', 'Bethesda', 'Silver Spring'],
    },
    MO: {
      1: ['St. Louis', 'Clayton', 'University City'],
      5: ['Kansas City', 'Independence', 'Blue Springs'],
    },
    AL: {
      6: ['Birmingham', 'Vestavia Hills', 'Hoover'],
      7: ['Birmingham', 'Mountain Brook', 'Homewood'],
    },
    LA: {
      1: ['New Orleans', 'Metairie', 'Kenner'],
      2: ['New Orleans', 'Algiers', 'Marrero'],
    },
    KY: {
      3: ['Louisville', 'Jeffersontown', 'St. Matthews'],
    },
    SC: {
      1: ['Charleston', 'Mount Pleasant', 'North Charleston'],
      6: ['Columbia', 'Forest Acres', 'Cayce'],
    },
    OK: {
      5: ['Oklahoma City', 'Norman', 'Moore'],
    },
    CT: {
      1: ['Hartford', 'West Hartford', 'East Hartford'],
      3: ['New Haven', 'Hamden', 'East Haven'],
    },
    UT: {
      2: ['Salt Lake City', 'West Valley City', 'South Salt Lake'],
      4: ['Provo', 'Orem', 'American Fork'],
    },
    IA: {
      3: ['Des Moines', 'West Des Moines', 'Urbandale'],
    },
    AR: {
      2: ['Little Rock', 'North Little Rock', 'Conway'],
    },
    KS: {
      3: ['Kansas City', 'Overland Park', 'Olathe'],
    },
    NM: {
      1: ['Albuquerque', 'Rio Rancho', 'Corrales'],
    },
    NE: {
      2: ['Omaha', 'Bellevue', 'Papillion'],
    },
  };

  return districtCityMap[state]?.[districtNumber] || [];
}

// Enhanced search term generation with geographic context and civic/political focus
export function generateOptimizedSearchTerms(
  representativeName: string,
  state: string,
  district?: string
): string[] {
  // Validate inputs - if no name provided, return empty array to avoid generic searches
  if (
    !representativeName ||
    typeof representativeName !== 'string' ||
    representativeName.trim() === ''
  ) {
    logger.warn('No representative name provided for GDELT search', {
      operation: 'gdelt_search_validation',
    });
    return [];
  }

  if (!state || typeof state !== 'string' || state.trim() === '') {
    logger.warn('No state provided for GDELT search', {
      operation: 'gdelt_search_validation',
    });
    state = ''; // Will still search but without state context
  }

  // Map state abbreviations to full names (GDELT requires minimum 3-character search terms)
  const stateNameMap: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'District of Columbia',
  };

  // Get full state name if we have a 2-character abbreviation
  const fullStateName = state.length === 2 ? stateNameMap[state] || state : state;

  // Clean the representative name - extract just the name part
  const fullName = representativeName.trim();
  const cleanName = fullName
    .replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/, '')
    .replace(/,.*$/, '')
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove party affiliation like (D) or (R)
    .trim();

  const searchTerms: string[] = [];

  // For more specific searches, also extract last name only
  const nameParts = cleanName.split(' ');
  const lastName = nameParts[nameParts.length - 1];

  // Start with broader searches that are more likely to have results
  // Then add more specific terms

  // 1. Simple name search (most likely to have results)
  searchTerms.push(`"${cleanName}"`);

  if (district) {
    // House Representative specific searches
    // 2. Name with full state name for Representatives
    if (fullStateName) {
      searchTerms.push(`"${cleanName}" "${fullStateName}"`);
    }

    // 3. Representative title with name (simplified - no OR statements)
    searchTerms.push(`"Representative ${cleanName}"`);
    searchTerms.push(`"Rep. ${cleanName}"`);

    // 4. Name with Congress context (simplified - no parentheses)
    searchTerms.push(`"${cleanName}" Congress`);
  } else {
    // Senator specific searches
    // 2. Senator title with name (simplified - no OR statements)
    searchTerms.push(`"Senator ${cleanName}"`);
    searchTerms.push(`"Sen. ${cleanName}"`);

    // 3. Name with full state name for Senators
    if (fullStateName) {
      searchTerms.push(`"${cleanName}" "${fullStateName}"`);
    }

    // 4. Name with Senate context
    searchTerms.push(`"${cleanName}" Senate`);
  }

  // Add nickname variants for high-profile members
  const nicknames = REPRESENTATIVE_NICKNAMES[cleanName] || [];
  nicknames.forEach(nickname => {
    searchTerms.push(`"${nickname}"`);
  });

  // Add geographic context with district cities for House representatives
  if (district && fullStateName) {
    const districtNumber = parseInt(district);
    const cities = getDistrictCities(state, districtNumber);

    // Add major city context for local relevance
    if (cities.length > 0) {
      const majorCity = cities[0]; // Use the first/largest city
      searchTerms.push(`"${cleanName}" "${majorCity}"`);
    }
  }

  // Add fallback with just last name if we have a multi-word name
  if (lastName && lastName !== cleanName && lastName.length > 3) {
    searchTerms.push(`"${lastName}"`);
  }

  logger.debug(`Generated search terms for ${fullName}`, {
    searchTerms,
    nicknamesFound: nicknames.length,
    citiesFound: district ? getDistrictCities(state, parseInt(district)).length : 0,
    operation: 'gdelt_search_terms',
  });

  // Return top 7 most relevant search terms (increased for geographic context)
  return searchTerms.slice(0, 7);
}

// Main GDELT API fetch function with comprehensive error handling and deduplication
export async function fetchGDELTNewsWithDeduplication(
  searchTerm: string,
  maxRecords: number = 10,
  deduplicationOptions?: Partial<DeduplicationOptions>
): Promise<{ articles: GDELTArticle[]; stats: DuplicationStats }> {
  const rawArticles = await fetchGDELTNews(searchTerm, Math.min(maxRecords * 2, 50)); // Fetch more to account for deduplication

  // Convert GDELT articles to NewsArticle format for deduplication
  const newsArticles: NewsArticle[] = rawArticles.map(article => ({
    url: article.url,
    title: article.title || 'Untitled',
    seendate: article.seendate,
    domain: article.domain || 'unknown',
    socialimage: article.socialimage || undefined,
    urlmobile: article.urlmobile || undefined,
    language: article.language || 'English',
    sourcecountry: article.sourcecountry || 'US',
  }));

  // Apply enhanced deduplication with improved settings for exact duplicates
  const { articles: deduplicatedArticles, stats } = deduplicateNews(newsArticles, {
    enableUrlDeduplication: true,
    enableTitleSimilarity: true,
    enableDomainClustering: true,
    enableMinHashDeduplication: true, // Use our new MinHash system
    maxArticlesPerDomain: 1, // Stricter limit for duplicate reduction
    titleSimilarityThreshold: 0.9, // Higher threshold for exact duplicates
    minHashSimilarityThreshold: 0.85, // Catch near-duplicates with MinHash
    preserveNewestArticles: true, // Keep most recent versions
    logDuplicates: true,
    ...deduplicationOptions,
  });

  // Convert back to GDELT format and limit to requested count
  const finalArticles: GDELTArticle[] = deduplicatedArticles.slice(0, maxRecords).map(article => ({
    url: article.url,
    urlmobile: article.urlmobile,
    title: article.title,
    seendate: article.seendate,
    socialimage: article.socialimage,
    domain: article.domain,
    language: article.language || 'English',
    sourcecountry: article.sourcecountry || 'US',
  }));

  // Log deduplication results
  logger.info('GDELT news deduplication completed', {
    searchTerm: searchTerm.slice(0, 50),
    originalCount: stats.originalCount,
    duplicatesRemoved: stats.duplicatesRemoved,
    finalCount: stats.finalCount,
    requestedCount: maxRecords,
    actualReturned: finalArticles.length,
    operation: 'gdelt_news_deduplication',
  });

  return { articles: finalArticles, stats };
}

// Original function without deduplication (for backward compatibility)
export async function fetchGDELTNews(
  searchTerm: string,
  maxRecords: number = 10
): Promise<GDELTArticle[]> {
  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      logger.warn('GDELT API rate limited', {
        waitTime,
        operation: 'gdelt_rate_limit',
      });
      await sleep(waitTime);
    }
  }

  // Try different timespans with fallback: 24h -> 7d -> 30d
  const timespans = ['24h', '7d', '30d'];

  for (const timespan of timespans) {
    try {
      const result = await fetchGDELTNewsWithTimespan(searchTerm, maxRecords, timespan);
      if (result.length > 0) {
        logger.info('GDELT news found with timespan', {
          searchTerm: searchTerm.slice(0, 50),
          timespan,
          articleCount: result.length,
          operation: 'gdelt_timespan_success',
        });
        return result;
      }
    } catch (error) {
      logger.warn('GDELT fetch failed for timespan, trying next', {
        searchTerm: searchTerm.slice(0, 50),
        timespan,
        error: error instanceof Error ? error.message : String(error),
        operation: 'gdelt_timespan_fallback',
      });
    }
  }

  logger.warn('All GDELT timespans failed', {
    searchTerm: searchTerm.slice(0, 50),
    timespansAttempted: timespans,
    operation: 'gdelt_all_timespans_failed',
  });

  return [];
}

// Helper function for single timespan fetch
async function fetchGDELTNewsWithTimespan(
  searchTerm: string,
  maxRecords: number,
  timespan: string
): Promise<GDELTArticle[]> {
  return retryWithBackoff(async () => {
    const encodedQuery = encodeURIComponent(searchTerm);

    // Use GDELT DOC 2.0 API with enhanced parameters and comprehensive theme filtering
    const themes = [
      'GENERAL_GOVERNMENT',
      'POLITICAL_PROCESS',
      'POLITICAL_CANDIDATE',
      'ELECTORAL_POLITICS',
      'POLITICAL_ISSUES',
      'GOVERNMENT_TRANSPARENCY',
      'POLITICAL_CORRUPTION',
      'CONGRESSIONAL_POLITICS',
      'GOVERNMENT_LEGISLATION',
      'POLITICAL_COMMUNICATIONS',
    ].join(',');

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=socialimage&timespan=${timespan}&theme=${themes}&contenttype=NEWS&dedupresults=true`;

    logger.info('Fetching GDELT news with specific timespan', {
      searchTerm: searchTerm.slice(0, 100),
      maxRecords,
      timespan,
      operation: 'gdelt_news_fetch',
      url: url.slice(0, 200),
    });

    const headers = {
      'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'gzip, deflate',
    };

    rateLimiter.recordCall();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Log external API call
      logger.info('GDELT API call completed', {
        service: 'GDELT',
        operation: 'fetchNews',
        duration,
        success: response.ok,
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        statusCode: response.status,
        timespan,
      });

      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new GDELTAPIError(
          `GDELT API error: ${response.status} ${response.statusText}`,
          response.status,
          isRetryable
        );
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJSON = contentType && contentType.includes('application/json');

      const text = await response.text();

      if (!text || text.trim() === '') {
        logger.warn('Empty response from GDELT API', {
          searchTerm: searchTerm.slice(0, 50),
          operation: 'gdelt_empty_response',
        });
        return [];
      }

      // Log non-JSON responses for debugging
      if (!isJSON) {
        logger.warn('GDELT API returned non-JSON response', {
          searchTerm: searchTerm.slice(0, 50),
          contentType,
          responseStart: text.slice(0, 200),
          operation: 'gdelt_non_json_response',
        });

        // Check if it's an HTML error page
        if (text.trim().startsWith('<')) {
          throw new GDELTAPIError('GDELT API returned HTML error page', undefined, false);
        }

        // Return empty result for non-JSON content to prevent JSON.parse() crash
        logger.error('GDELT API returned non-JSON content, returning empty result', undefined, {
          searchTerm: searchTerm.slice(0, 50),
          contentType,
          operation: 'gdelt_non_json_content_skip',
        });
        return [];
      }

      let data: GDELTResponse;
      try {
        const parsedData = JSON.parse(text);

        // Validate the response with Zod
        const validationResult = validateGDELTResponse(parsedData);
        if (!validationResult.success) {
          logger.warn('GDELT response validation failed', {
            errors: validationResult.error.issues,
            searchTerm: searchTerm.slice(0, 50),
            operation: 'gdelt_validation_warning',
          });
          // Use the data anyway but log the validation issues
          data = parsedData as GDELTResponse;
        } else {
          // Cast to GDELTResponse type since Zod validation passed
          data = validationResult.data as GDELTResponse;
        }
      } catch (parseError) {
        logger.error('Failed to parse GDELT JSON response', parseError as Error, {
          searchTerm: searchTerm.slice(0, 50),
          contentType,
          responseStart: text.slice(0, 200),
          operation: 'gdelt_json_parse_error',
        });
        throw new GDELTAPIError('Invalid JSON response from GDELT API', undefined, false);
      }

      const articles = data.articles || [];
      logger.info('GDELT articles retrieved', {
        searchTerm: searchTerm.slice(0, 50),
        articleCount: articles.length,
        operation: 'gdelt_articles_retrieved',
        duration,
      });

      // Filter for English articles and basic quality checks
      const filteredArticles = articles.filter(
        article =>
          article.language === 'English' &&
          article.title &&
          article.url &&
          article.domain &&
          article.title.length > 10 &&
          !article.title.toLowerCase().includes('404') &&
          !article.title.toLowerCase().includes('error')
      );

      return filteredArticles;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Log failed external API call
      logger.error('GDELT API call failed', {
        service: 'GDELT',
        operation: 'fetchNews',
        duration,
        success: false,
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        timespan,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GDELTAPIError('GDELT API request timeout', undefined, true);
      }

      throw error;
    }
  });
}

// Calculate local impact score for geographic relevance
export function calculateLocalImpactScore(
  article: GDELTArticle,
  _representativeName: string,
  state: string,
  district?: string
): { score: number; localRelevance: 'high' | 'medium' | 'low'; factors: string[] } {
  const title = (article.title || '').toLowerCase();
  const domain = article.domain || '';

  let score = 0;
  const factors: string[] = [];

  // State-specific indicators (20 points)
  const stateNames = { [state]: true, [getStateFullName(state)?.toLowerCase() || '']: true };
  if (Object.keys(stateNames).some(name => name && title.includes(name))) {
    score += 20;
    factors.push('State mentioned');
  }

  // District cities (15 points)
  if (district) {
    const cities = getDistrictCities(state, parseInt(district));
    if (cities.some(city => title.includes(city.toLowerCase()))) {
      score += 15;
      factors.push('District city mentioned');
    }
  }

  // Local domain indicators (10 points)
  const localDomainKeywords = [state.toLowerCase(), 'local', 'metro', 'news', 'tribune'];
  if (localDomainKeywords.some(keyword => domain.includes(keyword))) {
    score += 10;
    factors.push('Local news source');
  }

  return {
    score,
    localRelevance: score >= 30 ? 'high' : score >= 15 ? 'medium' : 'low',
    factors,
  };
}

// Helper to get full state name
function getStateFullName(abbreviation: string): string | null {
  const stateMap: Record<string, string> = {
    MI: 'Michigan',
    TX: 'Texas',
    CA: 'California',
    NY: 'New York',
    MN: 'Minnesota',
  };
  return stateMap[abbreviation] || null;
}

// Clean and normalize article data with local impact scoring
export function normalizeGDELTArticle(article: GDELTArticle): unknown {
  return {
    title: cleanTitle(article.title || 'Untitled'),
    url: article.url,
    source: extractSourceName(article.domain || 'unknown'),
    publishedDate: normalizeDate(article.seendate),
    language: article.language,
    imageUrl: article.socialimage || undefined,
    domain: article.domain,
  };
}

// Helper function to clean article titles
function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*[^-]*$/, '') // Remove trailing " - Source Name"
    .replace(/\|\s*[^|]*$/, '') // Remove trailing "| Source Name"
    .replace(/\s*\.\.\.$/, '') // Remove trailing "..."
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 200); // Reasonable title length limit
}

// Helper function to extract clean source names
function extractSourceName(domain: string): string {
  const domainMap: { [key: string]: string } = {
    'cnn.com': 'CNN',
    'foxnews.com': 'Fox News',
    'reuters.com': 'Reuters',
    'apnews.com': 'Associated Press',
    'npr.org': 'NPR',
    'washingtonpost.com': 'Washington Post',
    'nytimes.com': 'New York Times',
    'wsj.com': 'Wall Street Journal',
    'politico.com': 'Politico',
    'thehill.com': 'The Hill',
    'usatoday.com': 'USA Today',
    'nbcnews.com': 'NBC News',
    'abcnews.go.com': 'ABC News',
    'cbsnews.com': 'CBS News',
    'bloomberg.com': 'Bloomberg',
    'axios.com': 'Axios',
    'rollcall.com': 'Roll Call',
    'congress.gov': 'Congress.gov',
    'govexec.com': 'Government Executive',
  };

  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  const domainPart = cleanDomain.split('.')[0];
  return (
    domainMap[cleanDomain] ||
    (domainPart
      ? domainPart
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : cleanDomain)
  );
}

// Normalize date format from GDELT
function normalizeDate(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') {
    return new Date().toISOString();
  }

  try {
    // Handle different GDELT date formats
    if (dateString.includes('T') && dateString.includes('Z')) {
      // Format: 20250709T193000Z
      const cleanDate = dateString.replace(/T(\d{6})Z/, 'T$1:00:00Z');
      // Insert colons: 20250709T193000Z -> 2025-07-09T19:30:00Z
      const year = cleanDate.slice(0, 4);
      const month = cleanDate.slice(4, 6);
      const day = cleanDate.slice(6, 8);
      const time = cleanDate.slice(9, 15); // HHMMSS
      const hour = time.slice(0, 2) || '00';
      const minute = time.slice(2, 4) || '00';
      const second = time.slice(4, 6) || '00';

      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      const date = new Date(isoString);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date components: ${isoString}`);
      }

      return date.toISOString();
    } else if (dateString.length >= 8) {
      // Traditional format: YYYYMMDDHHMMSS
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      const hour = dateString.slice(8, 10) || '00';
      const minute = dateString.slice(10, 12) || '00';
      const second = dateString.slice(12, 14) || '00';

      // Validate components
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      if (parseInt(day) < 1 || parseInt(day) > 31) {
        throw new Error(`Invalid day: ${day}`);
      }
      if (parseInt(hour) > 23) {
        throw new Error(`Invalid hour: ${hour}`);
      }
      if (parseInt(minute) > 59) {
        throw new Error(`Invalid minute: ${minute}`);
      }
      if (parseInt(second) > 59) {
        throw new Error(`Invalid second: ${second}`);
      }

      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      const date = new Date(isoString);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${isoString}`);
      }

      return date.toISOString();
    } else {
      // Try direct parsing for other formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Unable to parse date: ${dateString}`);
      }
      return date.toISOString();
    }
  } catch (error) {
    logger.error('Error parsing GDELT date', error as Error, {
      dateString,
      dateStringLength: dateString.length,
      operation: 'gdelt_date_parse_error',
    });
  }

  // Fallback to current time if parsing fails
  return new Date().toISOString();
}

/**
 * Enhanced GDELT Real-time News Monitoring
 */

interface GDELTEvent {
  globalEventId: string;
  dateAdded: string;
  sourceUrl: string;
  actor1Name: string;
  actor1CountryCode: string;
  actor2Name: string;
  actor2CountryCode: string;
  eventCode: string;
  eventBaseCode: string;
  eventRootCode: string;
  quadClass: number;
  goldsteinScale: number;
  numMentions: number;
  numSources: number;
  avgTone: number;
  actionGeoCountryCode: string;
  actionGeoStateName: string;
  actionGeoCityName: string;
  actionGeoLat: number;
  actionGeoLong: number;
}

interface GDELTTrend {
  term: string;
  count: number;
  trend: 'rising' | 'falling' | 'stable';
  percentChange: number;
  timeframe: string;
}

interface GDELTRealTimeStream {
  lastUpdate: string;
  articles: unknown[];
  events: GDELTEvent[];
  trends: GDELTTrend[];
  alerts: Array<{
    type: 'breaking' | 'trending' | 'crisis';
    message: string;
    timestamp: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Fetch real-time GDELT event stream
 */
export async function fetchGDELTRealTimeEvents(
  keywords: string[],
  timeframe: '15min' | '1hour' | '6hour' | '24hour' = '1hour'
): Promise<GDELTEvent[]> {
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const queryTerms = keywords.map(k => encodeURIComponent(k)).join(' OR ');

    // Use GDELT GEO 2.0 API for real-time events
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${queryTerms}&mode=pointdata&format=json&timespan=${timeframe}&output=json`;

    logger.info('Fetching GDELT real-time events', {
      keywords,
      timeframe,
      operation: 'gdelt_realtime_events_fetch',
    });

    rateLimiter.recordCall();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new GDELTAPIError(
        `GDELT GEO API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    return data.events || [];
  });
}

/**
 * Fetch trending political topics from GDELT
 */
export async function fetchGDELTTrends(
  category: 'politics' | 'government' | 'congress' | 'elections' = 'politics',
  timeframe: '1hour' | '6hour' | '24hour' = '6hour'
): Promise<GDELTTrend[]> {
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const categoryQueries = {
      politics: 'politics OR political OR politician OR campaign',
      government: 'government OR federal OR agency OR department',
      congress: 'congress OR senate OR house OR representative OR senator',
      elections: 'election OR voting OR ballot OR candidate',
    };

    const query = encodeURIComponent(categoryQueries[category]);

    // Use GDELT TV 2.0 API for trending analysis
    const url = `https://api.gdeltproject.org/api/v2/tv/tv?query=${query}&mode=timelinevol&format=json&timespan=${timeframe}`;

    logger.info('Fetching GDELT trends', {
      category,
      timeframe,
      operation: 'gdelt_trends_fetch',
    });

    rateLimiter.recordCall();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new GDELTAPIError(
        `GDELT TV API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();

    // Process timeline data into trends
    const timeline = data.timeline || [];
    return processTrendData(timeline, category);
  });
}

/**
 * Get comprehensive real-time GDELT data stream
 */
export async function getGDELTRealTimeStream(
  representativeName: string,
  state: string,
  district?: string
): Promise<GDELTRealTimeStream> {
  const searchTerms = generateOptimizedSearchTerms(representativeName, state, district);
  const keywords = [representativeName, state];

  try {
    // Fetch all data in parallel
    const [articlesWithStats, events, trends] = await Promise.all([
      // Recent articles with deduplication
      Promise.all(searchTerms.map(term => fetchGDELTNewsWithDeduplication(term, 5))).then(
        results => {
          // Combine all articles and their stats
          const allArticles = results.flatMap(r => r.articles);
          const _combinedStats = results.reduce(
            (acc, r) => ({
              originalCount: acc.originalCount + r.stats.originalCount,
              duplicatesRemoved: acc.duplicatesRemoved + r.stats.duplicatesRemoved,
              finalCount: acc.finalCount + r.stats.finalCount,
              duplicatesDetected: [...acc.duplicatesDetected, ...r.stats.duplicatesDetected],
            }),
            {
              originalCount: 0,
              duplicatesRemoved: 0,
              finalCount: 0,
              duplicatesDetected: [] as {
                method: string;
                originalIndex: number;
                duplicateIndex: number;
                similarity: number;
              }[],
            }
          );

          // Final deduplication across search terms
          const { articles: finalArticles } = deduplicateNews(
            allArticles.map(article => ({
              url: article.url,
              title: article.title || 'Untitled',
              seendate: article.seendate,
              domain: article.domain || 'unknown',
              socialimage: article.socialimage || undefined,
              urlmobile: article.urlmobile || undefined,
              language: article.language || 'English',
              sourcecountry: article.sourcecountry || 'US',
            })),
            { maxArticlesPerDomain: 1, titleSimilarityThreshold: 0.9 }
          );

          return finalArticles.slice(0, 10).map(article => ({
            url: article.url,
            urlmobile: article.urlmobile,
            title: article.title,
            seendate: article.seendate,
            socialimage: article.socialimage,
            domain: article.domain,
            language: article.language || 'English',
            sourcecountry: article.sourcecountry || 'US',
          })) as GDELTArticle[];
        }
      ),

      // Real-time events
      fetchGDELTRealTimeEvents(keywords, '6hour'),

      // Trending topics
      fetchGDELTTrends('politics', '6hour'),
    ]);

    // Generate alerts based on data
    const alerts = generateAlerts(articlesWithStats, events, trends, representativeName);

    return {
      lastUpdate: new Date().toISOString(),
      articles: articlesWithStats.map((article: GDELTArticle) => normalizeGDELTArticle(article)),
      events: events.slice(0, 20),
      trends: trends.slice(0, 10),
      alerts,
    };
  } catch (error) {
    logger.error('Error fetching GDELT real-time stream', error as Error, {
      representativeName,
      state,
      district,
      operation: 'gdelt_realtime_stream_error',
    });

    // Return empty stream on error
    return {
      lastUpdate: new Date().toISOString(),
      articles: [],
      events: [],
      trends: [],
      alerts: [
        {
          type: 'crisis',
          message: 'News data temporarily unavailable',
          timestamp: new Date().toISOString(),
          urgency: 'low',
        },
      ],
    };
  }
}

/**
 * Monitor for breaking news about a representative
 */
export async function monitorBreakingNews(
  representativeName: string,
  state: string,
  lastCheckTime: string
): Promise<
  Array<{
    article: unknown;
    urgency: 'low' | 'medium' | 'high';
    category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
  }>
> {
  const searchTerms = generateOptimizedSearchTerms(representativeName, state);
  const breakingNews: Array<{
    article: unknown;
    urgency: 'low' | 'medium' | 'high';
    category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
  }> = [];

  try {
    // Fetch deduplicated articles for all search terms
    const results = await Promise.all(
      searchTerms.map(term => fetchGDELTNewsWithDeduplication(term, 5))
    );

    // Combine and deduplicate across all terms
    const allArticles = results.flatMap(r => r.articles);
    const { articles: deduplicatedArticles } = deduplicateNews(
      allArticles.map(article => ({
        url: article.url,
        title: article.title || 'Untitled',
        seendate: article.seendate,
        domain: article.domain || 'unknown',
        socialimage: article.socialimage || undefined,
        urlmobile: article.urlmobile || undefined,
        language: article.language || 'English',
        sourcecountry: article.sourcecountry || 'US',
      })),
      { titleSimilarityThreshold: 0.9, maxArticlesPerDomain: 2 }
    );

    // Filter for articles since last check
    const recentArticles = deduplicatedArticles.filter(
      article => new Date(normalizeDate(article.seendate)) > new Date(lastCheckTime)
    );

    for (const article of recentArticles) {
      const gdeltArticle: GDELTArticle = {
        url: article.url,
        urlmobile: article.urlmobile,
        title: article.title,
        seendate: article.seendate,
        socialimage: article.socialimage,
        domain: article.domain,
        language: article.language || 'English',
        sourcecountry: article.sourcecountry || 'US',
      };

      const normalized = normalizeGDELTArticle(gdeltArticle);
      const normalizedData = normalized as { title: string; source: string };
      const analysis = analyzeNewsUrgency(normalizedData.title, normalizedData.source);

      if (analysis.urgency !== 'low') {
        breakingNews.push({
          article: normalized,
          urgency: analysis.urgency,
          category: analysis.category,
        });
      }
    }

    // Sort by urgency and recency
    return breakingNews
      .sort((a, b) => {
        const urgencyWeight: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
        return (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
      })
      .slice(0, 10);
  } catch (error) {
    logger.error('Error monitoring breaking news', error as Error, {
      representativeName,
      state,
      operation: 'gdelt_breaking_news_error',
    });
    return [];
  }
}

/**
 * Process trend data from GDELT timeline
 */
function processTrendData(timeline: unknown[], _category: string): GDELTTrend[] {
  if (!timeline || timeline.length === 0) return [];

  const trends: GDELTTrend[] = [];
  const termCounts = new Map<string, number[]>();

  // Aggregate mentions over time
  timeline.forEach((entry: unknown) => {
    const entryData = entry as { terms?: Array<{ term: string; count?: number }> };
    const terms = entryData.terms || [];
    terms.forEach(term => {
      if (!termCounts.has(term.term)) {
        termCounts.set(term.term, []);
      }
      termCounts.get(term.term)!.push(term.count || 0);
    });
  });

  // Calculate trends
  termCounts.forEach((counts, term) => {
    if (counts.length < 2) return;

    const recent = counts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = counts.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    const percentChange = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (percentChange > 20) trend = 'rising';
    else if (percentChange < -20) trend = 'falling';

    trends.push({
      term,
      count: Math.round(recent),
      trend,
      percentChange: Math.round(percentChange * 100) / 100,
      timeframe: '6 hours',
    });
  });

  return trends
    .filter(trend => trend.count > 5) // Filter low-volume terms
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * Generate alerts based on GDELT data
 */
function generateAlerts(
  articles: unknown[],
  events: GDELTEvent[],
  trends: GDELTTrend[],
  representativeName: string
): Array<{
  type: 'breaking' | 'trending' | 'crisis';
  message: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
}> {
  const alerts: Array<{
    type: 'breaking' | 'trending' | 'crisis';
    message: string;
    timestamp: string;
    urgency: 'low' | 'medium' | 'high';
  }> = [];
  const now = new Date().toISOString();

  // Check for breaking news
  const recentArticles = articles.filter((article: unknown) => {
    const articleData = article as { publishedDate: string };
    const articleTime = new Date(articleData.publishedDate);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return articleTime > hourAgo;
  });

  if (recentArticles.length > 3) {
    alerts.push({
      type: 'breaking',
      message: `${recentArticles.length} recent news articles about ${representativeName}`,
      timestamp: now,
      urgency: 'medium',
    });
  }

  // Check for trending topics
  const risingTrends = trends.filter(trend => trend.trend === 'rising' && trend.percentChange > 50);
  if (risingTrends.length > 0 && risingTrends[0]) {
    alerts.push({
      type: 'trending',
      message: `Trending: ${risingTrends[0].term} (+${risingTrends[0].percentChange}%)`,
      timestamp: now,
      urgency: 'low',
    });
  }

  // Check for high-volume events
  const significantEvents = events.filter(
    event => event.numMentions > 10 && Math.abs(event.goldsteinScale) > 5
  );

  if (significantEvents.length > 0) {
    alerts.push({
      type: 'crisis',
      message: `${significantEvents.length} significant political events detected`,
      timestamp: now,
      urgency: 'high',
    });
  }

  return alerts.slice(0, 5);
}

/**
 * Analyze news urgency and categorization
 */
function analyzeNewsUrgency(
  title: string,
  source: string
): {
  urgency: 'low' | 'medium' | 'high';
  category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
} {
  const titleLower = title.toLowerCase();

  // High urgency keywords
  const highUrgencyTerms = [
    'breaking',
    'urgent',
    'resign',
    'scandal',
    'investigation',
    'indicted',
    'arrested',
    'charged',
    'impeach',
    'emergency',
  ];

  // Medium urgency keywords
  const mediumUrgencyTerms = [
    'announces',
    'proposes',
    'introduces',
    'votes',
    'passes',
    'opposes',
    'supports',
    'committee',
    'hearing',
    'debate',
  ];

  // Category keywords
  const categoryKeywords = {
    legislation: ['bill', 'vote', 'law', 'legislation', 'amendment', 'act'],
    scandal: ['scandal', 'investigation', 'ethics', 'corruption', 'fraud'],
    election: ['election', 'campaign', 'candidate', 'primary', 'ballot'],
    policy: ['policy', 'budget', 'healthcare', 'immigration', 'climate'],
  };

  let urgency: 'low' | 'medium' | 'high' = 'low';
  let category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other' = 'other';

  // Determine urgency
  if (highUrgencyTerms.some(term => titleLower.includes(term))) {
    urgency = 'high';
  } else if (mediumUrgencyTerms.some(term => titleLower.includes(term))) {
    urgency = 'medium';
  }

  // Determine category
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      category = cat as 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
      break;
    }
  }

  // Boost urgency for trusted sources
  const trustedSources = ['Reuters', 'Associated Press', 'NPR', 'Congress.gov'];
  if (trustedSources.includes(source) && urgency === 'low') {
    urgency = 'medium';
  }

  return { urgency, category };
}

// Export new functions
export type { GDELTEvent, GDELTTrend, GDELTRealTimeStream };
