/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Fuse from 'fuse.js';
import logger from '@/lib/logging/simple-logger';
import { getCongressionalDistrictFromZip } from '@/lib/census-api';
import { geocodeAddress, extractDistrictFromResult, GeocodeError } from '@/lib/census-geocoder';
import { classifyInput, InputType, ClassificationResult } from './input-classifier';
import { ZIP_TO_DISTRICT_MAP } from '@/lib/data/zip-district-mapping-integrated';

export interface SearchResult {
  success: boolean;
  searchType: InputType;
  input: string;
  normalizedInput: string;
  results?: Array<{
    state: string;
    district: string;
    confidence: number;
    matchedAddress?: string;
    source: 'zip_lookup' | 'geocoder' | 'fallback';
  }>;
  suggestions?: string[];
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Create Fuse instance for fuzzy ZIP matching
const zipCodes = Object.keys(ZIP_TO_DISTRICT_MAP);
const fuseOptions = {
  threshold: 0.2, // Lower = more strict
  distance: 2, // Max distance for fuzzy match
};
const zipFuse = new Fuse(zipCodes, fuseOptions);

/**
 * Main search function that handles both ZIP and address inputs
 */
export async function unifiedSearch(input: string): Promise<SearchResult> {
  const startTime = Date.now();

  // Classify the input
  const classification = classifyInput(input);

  logger.info('Unified search initiated', {
    input,
    classification,
    operation: 'unifiedSearch',
  });

  try {
    switch (classification.type) {
      case 'zip':
      case 'zip_plus_4':
        return await handleZipSearch(classification);

      case 'address':
        return await handleAddressSearch(input, classification);

      case 'ambiguous':
        return await handleAmbiguousSearch(input, classification);

      default:
        return {
          success: false,
          searchType: classification.type,
          input,
          normalizedInput: classification.normalizedInput,
          error: {
            code: 'INVALID_INPUT',
            message: 'Unable to understand the search input',
            details: { classification },
          },
        };
    }
  } catch (error) {
    logger.error('Unified search error', error as Error, {
      input,
      classification,
      duration: Date.now() - startTime,
    });

    return {
      success: false,
      searchType: classification.type,
      input,
      normalizedInput: classification.normalizedInput,
      error: {
        code: 'SEARCH_ERROR',
        message: 'An error occurred during search',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    };
  }
}

/**
 * Handle ZIP code searches
 */
async function handleZipSearch(classification: ClassificationResult): Promise<SearchResult> {
  const zip = classification.components?.zip;
  if (!zip) {
    return createErrorResult(classification, 'INVALID_ZIP', 'Invalid ZIP code format');
  }

  // Try direct lookup first
  const directResult = ZIP_TO_DISTRICT_MAP[zip];
  if (directResult) {
    const districts = Array.isArray(directResult) ? directResult : [directResult];
    return {
      success: true,
      searchType: classification.type,
      input: classification.normalizedInput,
      normalizedInput: zip,
      results: districts.map(d => ({
        state: d.substring(0, 2),
        district: d.substring(2),
        confidence: 1.0,
        source: 'zip_lookup' as const,
      })),
    };
  }

  // Try fuzzy matching
  const fuzzyMatches = zipFuse.search(zip).slice(0, 5);
  if (fuzzyMatches.length > 0) {
    const suggestions = fuzzyMatches.map(match => match.item);
    return {
      success: false,
      searchType: classification.type,
      input: classification.normalizedInput,
      normalizedInput: zip,
      suggestions,
      error: {
        code: 'ZIP_NOT_FOUND',
        message: `ZIP code ${zip} not found. Did you mean one of these?`,
        details: { suggestions },
      },
    };
  }

  // Fallback to Census API
  try {
    const censusResult = await getCongressionalDistrictFromZip(zip);
    if (censusResult) {
      return {
        success: true,
        searchType: classification.type,
        input: classification.normalizedInput,
        normalizedInput: zip,
        results: [
          {
            state: censusResult.state,
            district: censusResult.district,
            confidence: 0.9,
            source: 'geocoder',
          },
        ],
      };
    }
  } catch (error) {
    logger.warn('Census API fallback failed for ZIP', {
      zip,
      error: error instanceof Error ? error : String(error),
    });
  }

  return createErrorResult(classification, 'ZIP_NOT_FOUND', `ZIP code ${zip} not found`);
}

/**
 * Handle address searches
 */
async function handleAddressSearch(
  input: string,
  classification: ClassificationResult
): Promise<SearchResult> {
  const geocodeResult = await geocodeAddress(input);

  // Handle geocoding errors
  if ('error' in geocodeResult) {
    return handleGeocodeError(geocodeResult, classification);
  }

  // Process successful geocoding results
  const results = geocodeResult
    .map(result => {
      const district = extractDistrictFromResult(result);
      return {
        state: district?.state || '',
        district: district?.district || '',
        confidence: 1.0,
        matchedAddress: result.matchedAddress,
        source: 'geocoder' as const,
      };
    })
    .filter(r => r.state && r.district);

  if (results.length === 0) {
    return createErrorResult(
      classification,
      'NO_DISTRICT_FOUND',
      'Address found but no congressional district information available'
    );
  }

  return {
    success: true,
    searchType: classification.type,
    input,
    normalizedInput: classification.normalizedInput,
    results,
  };
}

/**
 * Handle ambiguous searches - try both ZIP and address
 */
async function handleAmbiguousSearch(
  input: string,
  classification: ClassificationResult
): Promise<SearchResult> {
  // First try as ZIP (might be partial or malformed)
  const digits = input.replace(/\D/g, '');
  if (digits.length >= 3) {
    // Try fuzzy ZIP matching
    const fuzzyMatches = zipFuse.search(digits).slice(0, 5);
    if (fuzzyMatches.length > 0) {
      return {
        success: false,
        searchType: classification.type,
        input,
        normalizedInput: classification.normalizedInput,
        suggestions: fuzzyMatches.map(m => m.item),
        error: {
          code: 'AMBIGUOUS_INPUT',
          message: 'Input unclear. Did you mean one of these ZIP codes?',
          details: { partialZip: digits },
        },
      };
    }
  }

  // Try as address
  const addressResult = await handleAddressSearch(input, classification);
  if (addressResult.success) {
    return addressResult;
  }

  // Neither worked - provide helpful error
  const suggestions = [];
  if (digits.length > 0 && digits.length < 5) {
    suggestions.push('Enter a complete 5-digit ZIP code');
  }
  if (!input.includes(',')) {
    suggestions.push('For addresses, include city and state (e.g., "123 Main St, Detroit, MI")');
  }

  return {
    success: false,
    searchType: classification.type,
    input,
    normalizedInput: classification.normalizedInput,
    suggestions,
    error: {
      code: 'AMBIGUOUS_INPUT',
      message: 'Unable to find location. Please enter a ZIP code or full address.',
      details: { classification, suggestions },
    },
  };
}

/**
 * Handle geocoding errors
 */
function handleGeocodeError(
  error: GeocodeError,
  classification: ClassificationResult
): SearchResult {
  const suggestions = [];

  switch (error.code) {
    case 'NO_MATCH':
      suggestions.push('Check the street number and spelling');
      suggestions.push('Include city and state');
      suggestions.push('Try using ZIP code instead');
      break;

    case 'TIMEOUT':
      suggestions.push('Try again in a moment');
      suggestions.push('Use ZIP code for faster results');
      break;

    case 'INVALID_INPUT':
      suggestions.push('Enter a complete address with street, city, and state');
      break;
  }

  return {
    success: false,
    searchType: classification.type,
    input: classification.normalizedInput,
    normalizedInput: classification.normalizedInput,
    suggestions,
    error: {
      code: error.code,
      message: error.error,
      details: error.details,
    },
  };
}

/**
 * Create error result
 */
function createErrorResult(
  classification: ClassificationResult,
  code: string,
  message: string,
  details?: unknown
): SearchResult {
  return {
    success: false,
    searchType: classification.type,
    input: classification.normalizedInput,
    normalizedInput: classification.normalizedInput,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Get recent searches from localStorage
 */
export function getRecentSearches(limit: number = 5): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem('civiq_recent_searches');
    if (!stored) return [];

    const searches: string[] = JSON.parse(stored);
    return searches.slice(0, limit);
  } catch (error) {
    logger.error('Error reading recent searches', error as Error);
    return [];
  }
}

/**
 * Save search to recent searches
 */
export function saveRecentSearch(search: string): void {
  if (typeof window === 'undefined') return;

  try {
    const stored = localStorage.getItem('civiq_recent_searches');
    const searches: string[] = stored ? JSON.parse(stored) : [];

    // Remove duplicates and add new search at beginning
    const updated = [search, ...searches.filter(s => s !== search)].slice(0, 10);

    localStorage.setItem('civiq_recent_searches', JSON.stringify(updated));
  } catch (error) {
    logger.error('Error saving recent search', error as Error);
  }
}

/**
 * Clear recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('civiq_recent_searches');
  } catch (error) {
    logger.error('Error clearing recent searches', error as Error);
  }
}
