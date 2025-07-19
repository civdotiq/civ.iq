/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { unifiedSearch, SearchResult } from './unified-search';
import { getAllEnhancedRepresentatives } from '@/lib/congress-legislators';
import { structuredLogger } from '@/lib/logging/logger';
import { EnhancedRepresentative } from '@/types/representative';

export interface SearchResponse {
  success: boolean;
  searchType: string;
  input: string;
  hasMultipleMatches: boolean;
  matches?: Array<{
    id: string;
    address?: string;
    state: string;
    district: string;
    confidence: number;
  }>;
  representatives?: EnhancedRepresentative[];
  error?: {
    code: string;
    message: string;
    suggestions?: string[];
  };
  metadata: {
    searchTime: number;
    resultCount: number;
    dataSource: string;
  };
}

/**
 * Handle search and return representatives
 */
export async function handleSearch(input: string): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    // Perform unified search
    const searchResult = await unifiedSearch(input);
    
    // Handle search errors
    if (!searchResult.success) {
      return {
        success: false,
        searchType: searchResult.searchType,
        input: searchResult.input,
        hasMultipleMatches: false,
        error: {
          code: searchResult.error?.code || 'SEARCH_FAILED',
          message: searchResult.error?.message || 'Search failed',
          suggestions: searchResult.suggestions
        },
        metadata: {
          searchTime: Date.now() - startTime,
          resultCount: 0,
          dataSource: 'search_error'
        }
      };
    }
    
    // Check if we have multiple matches
    if (searchResult.results && searchResult.results.length > 1) {
      // Return matches for user selection
      return {
        success: true,
        searchType: searchResult.searchType,
        input: searchResult.input,
        hasMultipleMatches: true,
        matches: searchResult.results.map((result, index) => ({
          id: `${result.state}-${result.district}-${index}`,
          address: result.matchedAddress,
          state: result.state,
          district: result.district,
          confidence: result.confidence
        })),
        metadata: {
          searchTime: Date.now() - startTime,
          resultCount: searchResult.results.length,
          dataSource: searchResult.results[0].source
        }
      };
    }
    
    // Single match - fetch representatives
    if (searchResult.results && searchResult.results.length === 1) {
      const districtInfo = searchResult.results[0];
      const representatives = await fetchRepresentativesForDistrict(
        districtInfo.state,
        districtInfo.district
      );
      
      return {
        success: true,
        searchType: searchResult.searchType,
        input: searchResult.input,
        hasMultipleMatches: false,
        representatives,
        metadata: {
          searchTime: Date.now() - startTime,
          resultCount: representatives.length,
          dataSource: districtInfo.source
        }
      };
    }
    
    // No results
    return {
      success: false,
      searchType: searchResult.searchType,
      input: searchResult.input,
      hasMultipleMatches: false,
      error: {
        code: 'NO_RESULTS',
        message: 'No congressional district found for this location'
      },
      metadata: {
        searchTime: Date.now() - startTime,
        resultCount: 0,
        dataSource: 'no_results'
      }
    };
    
  } catch (error) {
    structuredLogger.error('Search handler error', error as Error, {
      input,
      duration: Date.now() - startTime
    });
    
    return {
      success: false,
      searchType: 'unknown',
      input,
      hasMultipleMatches: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during search'
      },
      metadata: {
        searchTime: Date.now() - startTime,
        resultCount: 0,
        dataSource: 'error'
      }
    };
  }
}

/**
 * Fetch representatives for a specific district
 */
async function fetchRepresentativesForDistrict(
  state: string,
  district: string
): Promise<EnhancedRepresentative[]> {
  try {
    const allRepresentatives = await getAllEnhancedRepresentatives();
    
    if (!allRepresentatives || allRepresentatives.length === 0) {
      structuredLogger.warn('No representatives data available');
      return [];
    }
    
    // Filter for this district
    const districtReps = allRepresentatives.filter(rep => {
      // Include senators from the state
      if (rep.chamber === 'Senate' && rep.state === state) {
        return true;
      }
      
      // Include house representative from the district
      if (rep.chamber === 'House' && rep.state === state) {
        // Handle at-large districts
        if (district === 'AL' || district === '00') {
          return rep.district === '00' || rep.district === '0' || !rep.district;
        }
        
        // Regular district comparison
        const repDistrict = parseInt(rep.district || '0', 10);
        const targetDistrict = parseInt(district, 10);
        return repDistrict === targetDistrict;
      }
      
      return false;
    });
    
    structuredLogger.info('Representatives found for district', {
      state,
      district,
      count: districtReps.length,
      representatives: districtReps.map(r => ({
        name: r.name,
        chamber: r.chamber,
        party: r.party
      }))
    });
    
    return districtReps;
    
  } catch (error) {
    structuredLogger.error('Error fetching representatives', error as Error, {
      state,
      district
    });
    return [];
  }
}

/**
 * Handle selection when multiple matches exist
 */
export async function handleMatchSelection(
  matchId: string,
  state: string,
  district: string
): Promise<SearchResponse> {
  const startTime = Date.now();
  
  try {
    const representatives = await fetchRepresentativesForDistrict(state, district);
    
    return {
      success: true,
      searchType: 'selected',
      input: `${state}-${district}`,
      hasMultipleMatches: false,
      representatives,
      metadata: {
        searchTime: Date.now() - startTime,
        resultCount: representatives.length,
        dataSource: 'match_selection'
      }
    };
    
  } catch (error) {
    structuredLogger.error('Match selection error', error as Error, {
      matchId,
      state,
      district
    });
    
    return {
      success: false,
      searchType: 'selected',
      input: `${state}-${district}`,
      hasMultipleMatches: false,
      error: {
        code: 'SELECTION_ERROR',
        message: 'Failed to load representatives for selected location'
      },
      metadata: {
        searchTime: Date.now() - startTime,
        resultCount: 0,
        dataSource: 'error'
      }
    };
  }
}