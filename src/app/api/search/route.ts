/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/lib/congress-legislators';
import { structuredLogger } from '@/lib/logging/logger';
import { cachedFetch } from '@/lib/cache';

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

async function performSearch(filters: SearchFilters): Promise<{
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
}> {
  try {
    const startTime = Date.now();
    const currentYear = new Date().getFullYear();
    structuredLogger.info('Performing representative search', { filters });
    
    // Get all representatives
    const representatives = await getAllEnhancedRepresentatives();
    
    if (!representatives || representatives.length === 0) {
      return { results: [], totalResults: 0, page: 1, totalPages: 0 };
    }
    
    // Apply filters
    let filtered = representatives.filter(rep => {
      // Text search across multiple fields
      if (filters.query) {
        const searchTerm = filters.query.toLowerCase();
        const searchableText = [
          rep.name,
          rep.state,
          rep.party,
          rep.district,
          ...(rep.committees || [])
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
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
      
      // Bills sponsored filter (would need real data)
      const billsSponsored = Math.floor(Math.random() * 300); // Placeholder
      if (filters.billsSponsoredMin !== undefined && billsSponsored < filters.billsSponsoredMin) {
        return false;
      }
      if (filters.billsSponsoredMax !== undefined && billsSponsored > filters.billsSponsoredMax) {
        return false;
      }
      
      return true;
    });
    
    // Sort results
    const sortField = filters.sort || 'name';
    const sortOrder = filters.order || 'asc';
    
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
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
          const aYear = a.terms && a.terms.length > 0 ? parseInt(a.terms[0].startYear) : currentYear;
          const bYear = b.terms && b.terms.length > 0 ? parseInt(b.terms[0].startYear) : currentYear;
          aVal = currentYear - aYear;
          bVal = currentYear - bYear;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
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
        committees: (rep.committees || []).map(c => typeof c === 'string' ? c : c.name),
        billsSponsored: Math.floor(Math.random() * 300), // Placeholder
        votingScore: Math.random() * 100, // Placeholder
        fundraisingTotal: Math.floor(Math.random() * 10000000), // Placeholder
        imageUrl: rep.imageUrl,
        socialMedia: rep.socialMedia
      };
    });
    
    const executionTime = Date.now() - startTime;
    structuredLogger.info('Search completed', { 
      resultCount: filtered.length, 
      executionTime,
      page,
      totalPages: Math.ceil(filtered.length / limit)
    });
    
    return {
      results,
      totalResults: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit)
    };
    
  } catch (error) {
    structuredLogger.error('Search error', error as Error, { filters });
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse filters from query params
    const filters: SearchFilters = {
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      party: (searchParams.get('party') as SearchFilters['party']) || undefined,
      chamber: (searchParams.get('chamber') as SearchFilters['chamber']) || undefined,
      state: searchParams.get('state') || undefined,
      committee: searchParams.get('committee') || undefined,
      votingPattern: (searchParams.get('votingPattern') as SearchFilters['votingPattern']) || undefined,
      experienceYearsMin: searchParams.get('experienceYearsMin') ? parseInt(searchParams.get('experienceYearsMin')!) : undefined,
      experienceYearsMax: searchParams.get('experienceYearsMax') ? parseInt(searchParams.get('experienceYearsMax')!) : undefined,
      campaignFinanceMin: searchParams.get('campaignFinanceMin') ? parseInt(searchParams.get('campaignFinanceMin')!) : undefined,
      campaignFinanceMax: searchParams.get('campaignFinanceMax') ? parseInt(searchParams.get('campaignFinanceMax')!) : undefined,
      billsSponsoredMin: searchParams.get('billsSponsoredMin') ? parseInt(searchParams.get('billsSponsoredMin')!) : undefined,
      billsSponsoredMax: searchParams.get('billsSponsoredMax') ? parseInt(searchParams.get('billsSponsoredMax')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      sort: (searchParams.get('sort') as SearchFilters['sort']) || 'name',
      order: (searchParams.get('order') as SearchFilters['order']) || 'asc'
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
        note: 'Voting scores, campaign finance, and bills sponsored are placeholder values pending integration'
      }
    });
    
  } catch (error) {
    structuredLogger.error('Search API error', error as Error);
    
    return NextResponse.json(
      {
        error: 'Failed to perform search',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}