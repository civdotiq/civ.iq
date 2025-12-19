/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';

// Dynamic route with ISR caching - uses searchParams
export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const revalidate = 300; // 5 minutes - search results can update frequently
import {
  geocodeAddress,
  extractDistrictFromResult,
  parseAddressComponents,
} from '@/lib/census-geocoder';

interface SearchFilters {
  query?: string;
  party?: 'all' | 'D' | 'R' | 'I';
  chamber?: 'all' | 'House' | 'Senate';
  state?: string;
  committee?: string;
  votingPattern?: 'all' | 'progressive' | 'conservative' | 'moderate';
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  campaignFinanceMin?: number;
  campaignFinanceMax?: number;
  billsSponsoredMin?: number;
  billsSponsoredMax?: number;
  page?: number;
  limit?: number;
  sort?: 'name' | 'state' | 'party' | 'yearsInOffice' | 'billsSponsored';
  order?: 'asc' | 'desc';
}

interface SearchResult {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  committees: string[];
  billsSponsored: number;
  votingScore?: number;
  fundraisingTotal?: number;
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

// Perform address-based search using geocoding
async function performAddressSearch(filters: SearchFilters): Promise<{
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
}> {
  if (!filters.query) {
    return { results: [], totalResults: 0, page: 1, totalPages: 0 };
  }

  try {
    // Try to extract ZIP code first for faster lookup
    const addressComponents = parseAddressComponents(filters.query);

    // If we have a ZIP code, try direct ZIP lookup first
    if (addressComponents.zip) {
      try {
        const zipResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/representatives-multi-district?zip=${addressComponents.zip}`
        );
        if (zipResponse.ok) {
          const zipData = await zipResponse.json();
          if (zipData.success && zipData.representatives?.length > 0) {
            return {
              results: zipData.representatives.map((rep: unknown) =>
                transformToSearchResult(rep as SearchResult)
              ),
              totalResults: zipData.representatives.length,
              page: 1,
              totalPages: 1,
            };
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
      return { results: [], totalResults: 0, page: 1, totalPages: 0 };
    }

    // Extract district information from geocode results
    const districts = geocodeResult
      .map(extractDistrictFromResult)
      .filter((district): district is NonNullable<typeof district> => district !== null);

    if (districts.length === 0) {
      return { results: [], totalResults: 0, page: 1, totalPages: 0 };
    }

    // Get representatives for the found districts
    const representatives = await getAllEnhancedRepresentatives();
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
        results.push(transformToSearchResult(houseRep));
      }

      // Find Senate representatives for this state
      const senateReps = representatives.filter(
        rep => rep.chamber === 'Senate' && rep.state === district.state
      );

      for (const senateRep of senateReps) {
        if (!results.find(r => r.bioguideId === senateRep.bioguideId)) {
          results.push(transformToSearchResult(senateRep));
        }
      }
    }

    return {
      results,
      totalResults: results.length,
      page: 1,
      totalPages: 1,
    };
  } catch (error) {
    logger.error('Address search error', error as Error, { query: filters.query });
    return { results: [], totalResults: 0, page: 1, totalPages: 0 };
  }
}

// Transform representative to search result format
function transformToSearchResult(rep: unknown): SearchResult {
  const representative = rep as SearchResult;
  return {
    bioguideId: representative.bioguideId,
    name: representative.name,
    party: representative.party,
    state: representative.state,
    district: representative.district,
    chamber: representative.chamber,
    yearsInOffice: representative.yearsInOffice || 0,
    committees: representative.committees || [],
    billsSponsored: representative.billsSponsored || 0,
    votingScore: representative.votingScore,
    fundraisingTotal: representative.fundraisingTotal,
    imageUrl: representative.imageUrl,
    socialMedia: representative.socialMedia,
  };
}

async function performSearch(filters: SearchFilters): Promise<{
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
}> {
  try {
    const startTime = Date.now();
    const currentYear = new Date().getFullYear();
    logger.info('Performing representative search', { filters });

    // Check if query is an address
    if (filters.query && isAddressQuery(filters.query)) {
      return await performAddressSearch(filters);
    }

    // Get all representatives
    const representatives = await getAllEnhancedRepresentatives();

    if (!representatives || representatives.length === 0) {
      return { results: [], totalResults: 0, page: 1, totalPages: 0 };
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
        const searchableText = [rep.state, rep.party, rep.district, ...(rep.committees || [])]
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
      if (filters.committee && rep.committees) {
        const hasCommittee = rep.committees.some(c => {
          const committeeName = typeof c === 'string' ? c : c.name;
          return committeeName.toLowerCase().includes(filters.committee!.toLowerCase());
        });
        if (!hasCommittee) {
          return false;
        }
      }

      // Experience years filter
      const currentYear = new Date().getFullYear();
      const firstTerm = rep.terms && rep.terms.length > 0 ? rep.terms[0] : null;
      const yearsInOffice = firstTerm ? currentYear - parseInt(firstTerm.startYear) : 0;

      if (filters.experienceYearsMin !== undefined && yearsInOffice < filters.experienceYearsMin) {
        return false;
      }
      if (filters.experienceYearsMax !== undefined && yearsInOffice > filters.experienceYearsMax) {
        return false;
      }

      // Bills sponsored filter - requires real Congress.gov data
      // Filtering disabled until real data integration
      if (filters.billsSponsoredMin !== undefined || filters.billsSponsoredMax !== undefined) {
        // Bills sponsored data unavailable - cannot filter by this criteria
        logger.info('Bills sponsored filter requested but real data unavailable');
      }

      return true;
    });

    // Sort results
    const sortField = filters.sort || 'name';
    const sortOrder = filters.order || 'asc';

    filtered.sort((a, b) => {
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
          const aYear =
            a.terms && a.terms.length > 0
              ? parseInt(a.terms[0]?.startYear || String(currentYear))
              : currentYear;
          const bYear =
            b.terms && b.terms.length > 0
              ? parseInt(b.terms[0]?.startYear || String(currentYear))
              : currentYear;
          aVal = currentYear - aYear;
          bVal = currentYear - bYear;
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
      const currentYear = new Date().getFullYear();
      const firstTerm = rep.terms && rep.terms.length > 0 ? rep.terms[0] : null;
      const yearsInOffice = firstTerm ? currentYear - parseInt(firstTerm.startYear) : 0;

      return {
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party || 'Unknown',
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber as 'House' | 'Senate',
        yearsInOffice,
        committees: (rep.committees || []).map(c => (typeof c === 'string' ? c : c.name)),
        billsSponsored: 0, // Real data requires Congress.gov API integration
        votingScore: 0, // Real data requires voting record analysis
        fundraisingTotal: 0, // Real data requires FEC API integration
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
    };
  } catch (error) {
    logger.error('Search error', error as Error, { filters });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse filters from query params
    const filters: SearchFilters = {
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      party: (searchParams.get('party') as SearchFilters['party']) || undefined,
      chamber: (searchParams.get('chamber') as SearchFilters['chamber']) || undefined,
      state: searchParams.get('state') || undefined,
      committee: searchParams.get('committee') || undefined,
      votingPattern:
        (searchParams.get('votingPattern') as SearchFilters['votingPattern']) || undefined,
      experienceYearsMin: searchParams.get('experienceYearsMin')
        ? parseInt(searchParams.get('experienceYearsMin')!)
        : undefined,
      experienceYearsMax: searchParams.get('experienceYearsMax')
        ? parseInt(searchParams.get('experienceYearsMax')!)
        : undefined,
      campaignFinanceMin: searchParams.get('campaignFinanceMin')
        ? parseInt(searchParams.get('campaignFinanceMin')!)
        : undefined,
      campaignFinanceMax: searchParams.get('campaignFinanceMax')
        ? parseInt(searchParams.get('campaignFinanceMax')!)
        : undefined,
      billsSponsoredMin: searchParams.get('billsSponsoredMin')
        ? parseInt(searchParams.get('billsSponsoredMin')!)
        : undefined,
      billsSponsoredMax: searchParams.get('billsSponsoredMax')
        ? parseInt(searchParams.get('billsSponsoredMax')!)
        : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sort: (searchParams.get('sort') as SearchFilters['sort']) || 'name',
      order: (searchParams.get('order') as SearchFilters['order']) || 'asc',
    };

    // Create cache key from filters
    const cacheKey = `search-${JSON.stringify(filters)}`;

    // Perform search with caching
    const searchResults = await cachedFetch(
      cacheKey,
      () => performSearch(filters),
      5 * 60 * 1000 // 5 minutes cache
    );

    return NextResponse.json({
      ...searchResults,
      searchTerm: filters.query || '',
      filters,
      metadata: {
        cacheHit: false, // Would need to track this in cachedFetch
        dataSource: 'congress-legislators',
        note: 'Voting scores, campaign finance, and bills sponsored are placeholder values pending integration',
      },
    });
  } catch (error) {
    logger.error('Search API error', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to perform search',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
