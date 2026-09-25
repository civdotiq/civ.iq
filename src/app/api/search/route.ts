/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllEnhancedRepresentatives,
  getCommitteeNamesByMember,
} from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import { cache } from '@/lib/cache';
import { getServerBaseUrl } from '@/lib/server-url';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getMemberSponsoredCounts } from '@/lib/data-sources/member-sponsored-counts/load';
import { getFundraisingIndex } from '@/features/record-card/money-index';

// Dynamic route with ISR caching - uses searchParams
export const dynamic = 'force-dynamic';

import {
  geocodeAddress,
  extractDistrictFromResult,
  parseAddressComponents,
} from '@/lib/census-geocoder';
import { getZipAccuracyNote, type InputMode } from '@/lib/backbone/zip-accuracy';
import type { DataQuality } from '@/types/backbone-response';

interface SearchFilters {
  query?: string;
  party?: 'all' | 'D' | 'R' | 'I';
  chamber?: 'all' | 'House' | 'Senate';
  state?: string;
  committee?: string;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  billsIntroducedMin?: number;
  billsIntroducedMax?: number;
  raisedMin?: number;
  raisedMax?: number;
  page?: number;
  limit?: number;
  sort?: 'name' | 'state' | 'party' | 'yearsInOffice' | 'billsIntroduced' | 'raised';
  order?: 'asc' | 'desc';
}

interface SearchResult {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  /** Years in the current chamber, from congress-legislators terms. */
  yearsInOffice: number;
  /**
   * Bills and resolutions sponsored this Congress (amendments excluded), as of
   * the corpus build — the Record Card's "introduced" count. Null when the
   * GovInfo-derived corpus is unavailable, never a stand-in zero.
   */
  billsIntroduced: number | null;
  /**
   * FEC total receipts this 2-year cycle — the Record Card's "Total raised
   * this cycle". Null when the member has no FEC receipts or the index has no
   * row for them yet, never a stand-in zero.
   */
  raisedThisCycle: number | null;
  /** End of the FEC report period behind raisedThisCycle (YYYY-MM-DD). */
  raisedThroughDate: string | null;
  committees: string[];
  imageUrl?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
}

// Detect if query looks like an address
function isAddressQuery(query: string): boolean {
  const addressPatterns = [
    /\d+\s+[A-Za-z\s]+(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Place|Pl|Court|Ct)/i,
    /\b\d{5}(-\d{4})?\b/, // ZIP code
    /\d+\s+[^,]+,\s*[^,]+,\s*[A-Z]{2}/i, // Address, City, State format
  ];
  return addressPatterns.some(pattern => pattern.test(query));
}

interface SearchOutcome {
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
  /** When the bills-introduced counts were built; null when unavailable. */
  billsIntroducedAsOf: string | null;
  /** Fundraising index coverage; null when the index could not be read. */
  fundraising: FundraisingMeta | null;
}

interface FundraisingMeta {
  source: 'FEC';
  cycle: number;
  /** Sitting members the index has an answer for (receipts or none). */
  membersCovered: number;
  totalMembers: number;
}

interface FundraisingLookup {
  of: (bioguideId: string) => { raised: number | null; throughDate: string | null };
  meta: FundraisingMeta | null;
}

/**
 * Per-member "raised this cycle" from the index the warm-record-money cron
 * keeps (~14h per member). A member without a row is unknown, not $0.
 */
async function getFundraisingLookup(rosterIds: readonly string[]): Promise<FundraisingLookup> {
  const index = await getFundraisingIndex();
  if (!index) return { of: () => ({ raised: null, throughDate: null }), meta: null };
  return {
    of: bioguideId => {
      const entry = index.entries.get(bioguideId);
      return { raised: entry?.raised ?? null, throughDate: entry?.coverageEnd ?? null };
    },
    meta: {
      source: 'FEC',
      cycle: index.cycle,
      membersCovered: rosterIds.filter(id => index.entries.has(id)).length,
      totalMembers: rosterIds.length,
    },
  };
}

interface Lookups {
  bills: BillsIntroducedLookup;
  money: FundraisingLookup;
}

async function getLookups(): Promise<Lookups & { roster: EnhancedRep[] }> {
  const [roster, bills] = await Promise.all([
    getAllEnhancedRepresentatives(),
    getBillsIntroducedLookup(),
  ]);
  const money = await getFundraisingLookup((roster ?? []).map(r => r.bioguideId));
  return { roster: roster ?? [], bills, money };
}

type EnhancedRep = Awaited<ReturnType<typeof getAllEnhancedRepresentatives>>[number];

interface BillsIntroducedLookup {
  of: (bioguideId: string) => number | null;
  asOf: string | null;
}

/**
 * Per-member introduced counts from the committed BILLSTATUS corpus. The
 * corpus lists every member who sponsored anything, so a member absent from a
 * current-Congress corpus genuinely had introduced zero as of its build. A
 * missing corpus, or one from a past Congress, makes every count null.
 */
async function getBillsIntroducedLookup(): Promise<BillsIntroducedLookup> {
  const corpus = await getMemberSponsoredCounts();
  if (!corpus || corpus.congress !== getCurrentCongressNumber()) {
    return { of: () => null, asOf: null };
  }
  return {
    of: bioguideId => corpus.counts[bioguideId]?.introduced ?? 0,
    asOf: corpus.generatedAt,
  };
}

// Perform address-based search using geocoding
async function performAddressSearch(filters: SearchFilters): Promise<SearchOutcome> {
  if (!filters.query) {
    return {
      results: [],
      totalResults: 0,
      page: 1,
      totalPages: 0,
      billsIntroducedAsOf: null,
      fundraising: null,
    };
  }

  // A roster failure must not sink the ZIP path, which brings its own reps;
  // the geocode path then finds nobody, as it did before the lookups existed.
  const { roster, ...lookups } = await getLookups().catch(error => {
    logger.warn('Search lookups failed; continuing without them', { error: error as Error });
    const unknown: Lookups & { roster: EnhancedRep[] } = {
      roster: [],
      bills: { of: () => null, asOf: null },
      money: { of: () => ({ raised: null, throughDate: null }), meta: null },
    };
    return unknown;
  });
  const outcome = (results: SearchResult[]): SearchOutcome => ({
    results,
    totalResults: results.length,
    page: 1,
    totalPages: results.length > 0 ? 1 : 0,
    billsIntroducedAsOf: lookups.bills.asOf,
    fundraising: lookups.money.meta,
  });
  const none = () => outcome([]);
  try {
    const committeesByMember = await getCommitteeNamesByMember();
    const toResult = (rep: unknown) => transformToSearchResult(rep, committeesByMember, lookups);

    // Try to extract ZIP code first for faster lookup
    const addressComponents = parseAddressComponents(filters.query);

    // If we have a ZIP code, try direct ZIP lookup first
    if (addressComponents.zip) {
      try {
        const zipResponse = await fetch(
          `${getServerBaseUrl()}/api/representatives-multi-district?zip=${addressComponents.zip}`
        );
        if (zipResponse.ok) {
          // representatives-multi-district returns a BackboneResponse
          // envelope: failure = `error` present, payload under `data`
          const zipData = await zipResponse.json();
          const zipReps = zipData.data?.representatives;
          if (!zipData.error && zipReps?.length > 0) {
            return outcome(zipReps.map(toResult));
          }
        }
      } catch (error) {
        logger.warn('ZIP lookup failed, falling back to geocoding', {
          error: error as Error,
        });
      }
    }

    // Fall back to full address geocoding
    const geocodeResult = await geocodeAddress(filters.query);

    if ('error' in geocodeResult) {
      logger.warn('Address geocoding failed', {
        query: filters.query,
        error: geocodeResult.error,
      });
      return none();
    }

    // Extract district information from geocode results
    const districts = geocodeResult
      .map(extractDistrictFromResult)
      .filter((district): district is NonNullable<typeof district> => district !== null);

    if (districts.length === 0) {
      return none();
    }

    // Get representatives for the found districts
    const representatives = roster;
    const results: SearchResult[] = [];

    for (const district of districts) {
      // Find House representative for this district
      const houseRep = representatives.find(
        rep =>
          rep.chamber === 'House' &&
          rep.state === district.state &&
          rep.district === district.district
      );

      if (houseRep) {
        results.push(toResult(houseRep));
      }

      // Find Senate representatives for this state
      const senateReps = representatives.filter(
        rep => rep.chamber === 'Senate' && rep.state === district.state
      );

      for (const senateRep of senateReps) {
        if (!results.find(r => r.bioguideId === senateRep.bioguideId)) {
          results.push(toResult(senateRep));
        }
      }
    }

    return outcome(results);
  } catch (error) {
    logger.error('Address search error', error as Error, { query: filters.query });
    return none();
  }
}

// Transform representative to search result format
function transformToSearchResult(
  rep: unknown,
  committeesByMember: Map<string, string[]>,
  lookups: Lookups
): SearchResult {
  const representative = rep as SearchResult;
  const money = lookups.money.of(representative.bioguideId);
  return {
    bioguideId: representative.bioguideId,
    name: representative.name,
    party: representative.party,
    state: representative.state,
    district: representative.district,
    chamber: representative.chamber,
    yearsInOffice: representative.yearsInOffice || 0,
    billsIntroduced: lookups.bills.of(representative.bioguideId),
    raisedThisCycle: money.raised,
    raisedThroughDate: money.throughDate,
    committees: committeesByMember.get(representative.bioguideId) ?? [],
    imageUrl: representative.imageUrl,
    socialMedia: representative.socialMedia,
  };
}

async function performSearch(filters: SearchFilters): Promise<SearchOutcome> {
  try {
    const startTime = Date.now();
    logger.info('Performing representative search', { filters });

    // Check if query is an address
    if (filters.query && isAddressQuery(filters.query)) {
      return await performAddressSearch(filters);
    }

    // The bulk roster carries no committees; join them from the membership roster.
    const [{ roster: representatives, bills, money }, committeesByMember] = await Promise.all([
      getLookups(),
      getCommitteeNamesByMember(),
    ]);
    const committeesOf = (bioguideId: string) => committeesByMember.get(bioguideId) ?? [];

    if (!representatives || representatives.length === 0) {
      return {
        results: [],
        totalResults: 0,
        page: 1,
        totalPages: 0,
        billsIntroducedAsOf: bills.asOf,
        fundraising: money.meta,
      };
    }

    // Apply filters
    const filtered = representatives.filter(rep => {
      // Text search across multiple fields with enhanced name matching
      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();

        // Common nickname mappings for flexible name matching
        const nicknameMap: { [key: string]: string[] } = {
          bernard: ['bernie'],
          bernie: ['bernard'],
          william: ['bill', 'billy'],
          bill: ['william'],
          robert: ['bob', 'bobby'],
          bob: ['robert'],
          richard: ['rick', 'dick'],
          rick: ['richard'],
          elizabeth: ['liz', 'beth'],
          liz: ['elizabeth'],
          charles: ['chuck', 'charlie'],
          chuck: ['charles'],
          thomas: ['tom', 'tommy'],
          tom: ['thomas'],
          michael: ['mike'],
          mike: ['michael'],
          joseph: ['joe'],
          joe: ['joseph'],
          alexandra: ['alex'],
          alex: ['alexandra', 'alexander'],
        };

        // Function to check if a search word matches a name considering nicknames
        const nameMatches = (searchWord: string, repName: string): boolean => {
          const searchLower = searchWord.toLowerCase();
          const nameLower = repName.toLowerCase();

          // Direct match
          if (nameLower.includes(searchLower)) return true;

          // Check nickname equivalents
          for (const [formal, nicknames] of Object.entries(nicknameMap)) {
            if (searchLower === formal && nameLower.includes(formal)) return true;
            if (nicknames.includes(searchLower) && nameLower.includes(formal)) return true;
            if (searchLower === formal && nicknames.some(nick => nameLower.includes(nick)))
              return true;
          }

          return false;
        };

        // Build searchable text for non-name fields
        const searchableText = [rep.state, rep.party, rep.district, ...committeesOf(rep.bioguideId)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Check if search term matches
        const searchWords = searchTerm.split(' ').filter(word => word.length > 0);
        const matchesAll = searchWords.every(word => {
          // Check name with nickname support
          if (rep.name && nameMatches(word, rep.name)) return true;
          // Check other fields
          return searchableText.includes(word.toLowerCase());
        });

        if (!matchesAll) {
          return false;
        }
      }

      // Party filter
      if (filters.party && filters.party !== 'all') {
        const partyAbbrev = rep.party?.charAt(0).toUpperCase();
        if (partyAbbrev !== filters.party) {
          return false;
        }
      }

      // Chamber filter
      if (filters.chamber && filters.chamber !== 'all' && rep.chamber !== filters.chamber) {
        return false;
      }

      // State filter
      if (filters.state && rep.state !== filters.state) {
        return false;
      }

      // Committee filter
      if (filters.committee) {
        const committeeFilter = filters.committee.toLowerCase();
        const hasCommittee = committeesOf(rep.bioguideId).some(name =>
          name.toLowerCase().includes(committeeFilter)
        );
        if (!hasCommittee) {
          return false;
        }
      }

      // Experience years filter
      const yearsInOffice = rep.yearsInOffice ?? 0;

      if (filters.experienceYearsMin !== undefined && yearsInOffice < filters.experienceYearsMin) {
        return false;
      }
      if (filters.experienceYearsMax !== undefined && yearsInOffice > filters.experienceYearsMax) {
        return false;
      }

      // Bills-introduced filter. An unknown count never satisfies a bound.
      if (filters.billsIntroducedMin !== undefined || filters.billsIntroducedMax !== undefined) {
        const introduced = bills.of(rep.bioguideId);
        if (introduced === null) return false;
        if (filters.billsIntroducedMin !== undefined && introduced < filters.billsIntroducedMin) {
          return false;
        }
        if (filters.billsIntroducedMax !== undefined && introduced > filters.billsIntroducedMax) {
          return false;
        }
      }

      // Fundraising filter. An unknown total never satisfies a bound.
      if (filters.raisedMin !== undefined || filters.raisedMax !== undefined) {
        const { raised } = money.of(rep.bioguideId);
        if (raised === null) return false;
        if (filters.raisedMin !== undefined && raised < filters.raisedMin) return false;
        if (filters.raisedMax !== undefined && raised > filters.raisedMax) return false;
      }

      return true;
    });

    // Sort results
    const sortField = filters.sort || 'name';
    const sortOrder = filters.order || 'asc';

    // Unknown values sort last in either direction.
    const byNullableNumber = (aNum: number | null, bNum: number | null): number => {
      if (aNum === null || bNum === null) {
        return (aNum === null ? 1 : 0) - (bNum === null ? 1 : 0);
      }
      return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
    };

    filtered.sort((a, b) => {
      if (sortField === 'billsIntroduced') {
        return byNullableNumber(bills.of(a.bioguideId), bills.of(b.bioguideId));
      }
      if (sortField === 'raised') {
        return byNullableNumber(money.of(a.bioguideId).raised, money.of(b.bioguideId).raised);
      }

      let aVal: unknown, bVal: unknown;

      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'state':
          aVal = a.state;
          bVal = b.state;
          break;
        case 'party':
          aVal = a.party;
          bVal = b.party;
          break;
        case 'yearsInOffice':
          aVal = a.yearsInOffice ?? 0;
          bVal = b.yearsInOffice ?? 0;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      if (sortOrder === 'asc') {
        return (aVal as string | number) < (bVal as string | number)
          ? -1
          : (aVal as string | number) > (bVal as string | number)
            ? 1
            : 0;
      } else {
        return (aVal as string | number) > (bVal as string | number)
          ? -1
          : (aVal as string | number) < (bVal as string | number)
            ? 1
            : 0;
      }
    });

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    // Transform to search results
    const results: SearchResult[] = paginatedResults.map(rep => {
      const raised = money.of(rep.bioguideId);
      return {
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party || 'Unknown',
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber as 'House' | 'Senate',
        yearsInOffice: rep.yearsInOffice ?? 0,
        billsIntroduced: bills.of(rep.bioguideId),
        raisedThisCycle: raised.raised,
        raisedThroughDate: raised.throughDate,
        committees: committeesOf(rep.bioguideId),
        imageUrl: rep.imageUrl,
        socialMedia: rep.socialMedia,
      };
    });

    const executionTime = Date.now() - startTime;
    logger.info('Search completed', {
      resultCount: filtered.length,
      executionTime,
      page,
      totalPages: Math.ceil(filtered.length / limit),
    });

    return {
      results,
      totalResults: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      billsIntroducedAsOf: bills.asOf,
      fundraising: money.meta,
    };
  } catch (error) {
    logger.error('Search error', error as Error, { filters });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // parseInt('abc') is NaN: it serializes to null in the cache key (colliding
    // distinct garbage queries) and bypasses every range comparison — treat
    // non-numeric values as absent instead.
    const intParam = (name: string): number | undefined => {
      const raw = searchParams.get(name);
      if (!raw) return undefined;
      const parsed = parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    // Parse filters from query params
    const filters: SearchFilters = {
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      party: (searchParams.get('party') as SearchFilters['party']) || undefined,
      chamber: (searchParams.get('chamber') as SearchFilters['chamber']) || undefined,
      state: searchParams.get('state') || undefined,
      committee: searchParams.get('committee') || undefined,
      experienceYearsMin: intParam('experienceYearsMin'),
      experienceYearsMax: intParam('experienceYearsMax'),
      billsIntroducedMin: intParam('billsIntroducedMin'),
      billsIntroducedMax: intParam('billsIntroducedMax'),
      raisedMin: intParam('raisedMin'),
      raisedMax: intParam('raisedMax'),
      page: Math.max(intParam('page') ?? 1, 1),
      limit: Math.max(intParam('limit') ?? 20, 1),
      sort: (searchParams.get('sort') as SearchFilters['sort']) || 'name',
      order: (searchParams.get('order') as SearchFilters['order']) || 'asc',
    };

    // Create cache key from filters
    // v2: results no longer carry placeholder bills/voting/finance zeros.
    // v3: results carry billsIntroduced from the BILLSTATUS corpus.
    // v4: results carry raisedThisCycle from the fundraising index.
    const cacheKey = `search:v4:${JSON.stringify(filters)}`;

    // Read cache directly — and treat zero-result hits as a miss. Zero is
    // almost always an upstream failure (the dataset has ~535 reps), so a
    // cached empty result would poison subsequent identical queries until
    // TTL expires.
    let searchResults = await cache.get<SearchOutcome>(cacheKey);
    if (!searchResults || (searchResults.results?.length ?? 0) === 0) {
      searchResults = await performSearch(filters);
      // Only cache non-empty results.
      if (searchResults.results && searchResults.results.length > 0) {
        await cache.set(cacheKey, searchResults, 300); // 5 minutes
      } else {
        logger.warn('Search returned zero results; skipping cache write', {
          query: filters.query,
        });
      }
    }

    // Detect whether the search term resolved through ZIP. A ZIP-only query
    // (or a query that parses to a ZIP without street) triggers ZIP-based
    // district resolution, which is approximate. Address queries with a
    // street component are authoritative.
    const inputMode: InputMode = (() => {
      if (!filters.query) return 'address';
      const components = parseAddressComponents(filters.query);
      const hasZip = !!components.zip;
      const hasStreet = /\d+\s+[A-Za-z]/.test(filters.query);
      return hasZip && !hasStreet ? 'zip' : 'address';
    })();
    const accuracyNote = getZipAccuracyNote(inputMode);

    // BackboneResponse envelope. ZIP-resolved queries are never 'complete'
    // (approximate join); an authoritative query with zero hits is 'empty'.
    const hasResults = (searchResults.results?.length ?? 0) > 0;
    const dataQuality: DataQuality =
      inputMode === 'zip' ? 'partial' : hasResults ? 'complete' : 'empty';

    return NextResponse.json(
      {
        data: {
          ...searchResults,
          searchTerm: filters.query || '',
          filters,
          metadata: {
            cacheHit: false, // Would need to track this in cachedFetch
            dataSource: 'congress-legislators',
            billsIntroducedAsOf: searchResults.billsIntroducedAsOf,
            fundraising: searchResults.fundraising,
          },
        },
        dataQuality,
        sourceStatus: [
          {
            source: 'congress-legislators',
            status: 'ok',
            fetchedAt: new Date().toISOString(),
          },
        ],
        ...(accuracyNote ? { accuracyNote } : {}),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    logger.error('Search API error', error as Error);

    return NextResponse.json(
      {
        data: { results: [], totalResults: 0, page: 1, totalPages: 0, searchTerm: '', filters: {} },
        dataQuality: 'unavailable',
        sourceStatus: [
          {
            source: 'search-api',
            status: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            fetchedAt: new Date().toISOString(),
          },
        ],
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to perform search',
        },
      },
      { status: 500 }
    );
  }
}
