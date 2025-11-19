/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { BookOpen, ExternalLink, GraduationCap, Briefcase, AlertCircle } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { fetchBiography } from '@/lib/api/wikipedia';
import { fetchWikidataBiography } from '@/lib/api/wikidata';
import { sanitizeAndValidateWikipediaHtml } from '@/utils/sanitize';
import { loadStaticBiography } from '@/lib/data/static-biographies';

interface BiographyCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

interface LegislativeStats {
  billsSponsored?: number;
  committeesCount?: number;
  yearsInOffice?: number;
}

interface BillData {
  title: string;
  date?: string;
  type?: string;
}

interface BatchData {
  bills?: {
    totalCareer?: number;
    currentCongress?: {
      count: number;
      congress: number;
    };
    recentBills?: BillData[];
  };
  votes?: {
    votes?: { position?: string }[];
  };
  finance?: unknown;
}

interface Term {
  startYear?: string;
  endYear?: string;
  congress?: string;
}

/**
 * Combined biography data from both Wikipedia and Wikidata
 */
interface CombinedBiography {
  // Wikipedia fields
  wikipediaSummary?: string;
  wikipediaHtmlSummary?: string;
  wikipediaImageUrl?: string;
  wikipediaPageUrl?: string;
  // Wikidata fields
  birthPlace?: string;
  education?: string[];
  occupations?: string[];
  spouse?: string;
  children?: number;
  awards?: string[];
  wikidataDescription?: string;
  lastUpdated: string;
  // Metadata for partial failures
  wikipediaSuccess: boolean;
  wikidataSuccess: boolean;
  wikipediaError?: string;
  wikidataError?: string;
}

/**
 * Persistent cache configuration
 */
const CACHE_KEY_PREFIX = 'civ-bio-';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_AVAILABLE = typeof window !== 'undefined' && window.localStorage;

/**
 * Get cached data from localStorage
 */
function getCachedData(bioguideId: string): CombinedBiography | null {
  if (!STORAGE_AVAILABLE) return null;

  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${bioguideId}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * Save data to localStorage cache
 */
function setCachedData(bioguideId: string, data: CombinedBiography): void {
  if (!STORAGE_AVAILABLE) return;

  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${bioguideId}`;
    const cacheData = {
      data,
      timestamp: Date.now(),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Cache write error:', error);
    // Continue without caching rather than failing
  }
}

/**
 * Calculate years in office from terms data
 */
function calculateYearsInOffice(terms?: Term[]): number {
  if (!terms || terms.length === 0) return 0;

  const earliestYear = Math.min(...terms.map(t => parseInt(t.startYear || '9999')));
  const currentYear = new Date().getFullYear();

  if (earliestYear === 9999) return 0;
  return currentYear - earliestYear;
}

/**
 * Production-hardened SWR fetcher with graceful degradation and persistent caching
 * HYBRID APPROACH: Check static data first, fall back to API if not found
 */
const biographyFetcher = async (
  bioguideId: string,
  representativeName: string
): Promise<CombinedBiography> => {
  // 1. Check persistent localStorage cache first
  const cached = getCachedData(bioguideId);
  if (cached) {
    return cached;
  }

  // 2. Check static pre-generated data (99% of cases - NO API CALLS!)
  const staticData = await loadStaticBiography(bioguideId);
  if (staticData) {
    // Convert static data to CombinedBiography format
    const combined: CombinedBiography = {
      wikipediaSummary: staticData.wikipediaSummary || undefined,
      wikipediaHtmlSummary: staticData.wikipediaHtmlSummary || undefined,
      wikipediaImageUrl: staticData.wikipediaImageUrl || undefined,
      wikipediaPageUrl: staticData.wikipediaPageUrl || undefined,
      birthPlace: staticData.birthPlace || undefined,
      education: staticData.education || undefined,
      occupations: staticData.occupations || undefined,
      spouse: staticData.spouse || undefined,
      children: staticData.children || undefined,
      awards: staticData.awards || undefined,
      wikidataDescription: staticData.wikidataDescription || undefined,
      lastUpdated: staticData.lastUpdated,
      wikipediaSuccess: staticData.wikipediaSuccess,
      wikidataSuccess: staticData.wikidataSuccess,
    };

    // Cache it in localStorage for next time
    setCachedData(bioguideId, combined);
    return combined;
  }

  // 3. Fall back to API for new representatives not in static data
  // Use Promise.allSettled to handle partial failures gracefully
  const [wikipediaResult, wikidataResult] = await Promise.allSettled([
    fetchBiography(bioguideId, representativeName),
    fetchWikidataBiography(bioguideId),
  ]);

  // Extract data and errors from settled promises
  const wikipediaSuccess = wikipediaResult.status === 'fulfilled';
  const wikidataSuccess = wikidataResult.status === 'fulfilled';

  const wikipediaData = wikipediaSuccess ? wikipediaResult.value : null;
  const wikidataData = wikidataSuccess ? wikidataResult.value : null;

  const wikipediaError = wikipediaSuccess ? undefined : wikipediaResult.reason?.message;
  const wikidataError = wikidataSuccess ? undefined : wikidataResult.reason?.message;

  // Combine available data, even if one source failed
  const combined: CombinedBiography = {
    // Wikipedia data (may be null if failed)
    wikipediaSummary: wikipediaData?.wikipediaSummary,
    wikipediaHtmlSummary: wikipediaData?.wikipediaHtmlSummary,
    wikipediaImageUrl: wikipediaData?.wikipediaImageUrl,
    wikipediaPageUrl: wikipediaData?.wikipediaPageUrl,
    // Wikidata data (may be null if failed)
    birthPlace: wikidataData?.birthPlace,
    education: wikidataData?.education,
    occupations: wikidataData?.occupations,
    spouse: wikidataData?.spouse,
    children: wikidataData?.children,
    awards: wikidataData?.awards,
    wikidataDescription: wikidataData?.wikidataDescription,
    // Metadata
    lastUpdated: new Date().toISOString(),
    wikipediaSuccess,
    wikidataSuccess,
    wikipediaError,
    wikidataError,
  };

  // Cache the result (even partial data) to reduce API calls
  if (wikipediaSuccess || wikidataSuccess) {
    setCachedData(bioguideId, combined);
  }

  return combined;
};

/**
 * SWR fetcher for batch data
 */
const batchFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch batch data');
  return response.json();
};

export function BiographyCard({ representative, className = '' }: BiographyCardProps) {
  const representativeName =
    representative.name || `${representative.firstName} ${representative.lastName}`;

  // Use SWR for biography data with production-ready configuration
  const {
    data: biographyData,
    error: biographyError,
    isLoading: biographyLoading,
  } = useSWR(
    ['biography', representative.bioguideId, representativeName],
    ([, bioguideId, name]) => biographyFetcher(bioguideId, name),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 600000, // 10 minutes - higher due to localStorage caching
      errorRetryCount: 2, // Fewer retries since we handle partial failures
      errorRetryInterval: 3000, // 3 seconds between retries
      keepPreviousData: true, // Keep showing data during revalidation
    }
  );

  // Use SWR for batch data
  const {
    data: batchResponse,
    error: _batchError,
    isLoading: batchLoading,
  } = useSWR(`/api/representative/${representative.bioguideId}/batch`, batchFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 300000, // 5 minutes
    errorRetryCount: 2,
  });

  // Process batch data for legislative stats
  const batchData: BatchData | null = batchResponse?.success ? batchResponse.data : null;
  const legislativeStats: LegislativeStats = {
    billsSponsored: batchData?.bills?.totalCareer || 0,
    committeesCount: representative.committees?.length || 0,
    yearsInOffice: calculateYearsInOffice(representative.terms as Term[]),
  };

  // Generate meaningful bio summary from legislative data
  const generateBioSummary = (): string | null => {
    const parts = [];

    // Add professional background if not generic
    const meaningfulOccupations = biographyData?.occupations?.filter(
      occ => !['politician', 'legislator', 'senator', 'representative'].includes(occ.toLowerCase())
    );

    if (meaningfulOccupations && meaningfulOccupations.length > 0) {
      const occupation = meaningfulOccupations[0];
      parts.push(`Former ${occupation}`);
    }

    // Add birthplace for context
    if (biographyData?.birthPlace && !biographyData.birthPlace.includes('United States')) {
      parts.push(`born in ${biographyData.birthPlace}`);
    }

    // Add education highlight
    if (biographyData?.education && biographyData.education.length > 0) {
      const topSchool = biographyData.education[0];
      if (topSchool && (topSchool.includes('University') || topSchool.includes('College'))) {
        parts.push(`educated at ${topSchool}`);
      }
    }

    // Add years of service for context
    if (legislativeStats.yearsInOffice && legislativeStats.yearsInOffice > 0) {
      parts.push(`serving ${representative.state} for ${legislativeStats.yearsInOffice} years`);
    }

    // Focus areas from recent bills
    const focusAreas = new Set<string>();
    batchData?.bills?.recentBills?.forEach(bill => {
      const title = bill.title.toLowerCase();
      if (title.includes('social security')) focusAreas.add('Social Security');
      else if (title.includes('health') || title.includes('medicare')) focusAreas.add('Healthcare');
      else if (title.includes('climate') || title.includes('environment'))
        focusAreas.add('Environment');
      else if (title.includes('education')) focusAreas.add('Education');
      else if (title.includes('defense') || title.includes('military')) focusAreas.add('Defense');
      else if (title.includes('tax')) focusAreas.add('Tax Reform');
      else if (title.includes('immigration')) focusAreas.add('Immigration');
      else if (title.includes('infrastructure')) focusAreas.add('Infrastructure');
    });

    if (focusAreas.size > 0) {
      const areas = Array.from(focusAreas).slice(0, 3).join(', ');
      parts.push(`focused on ${areas}`);
    }

    return parts.length > 0 ? parts.join(', ') : null;
  };

  const bioSummary = generateBioSummary();
  const hasWikipediaContent =
    biographyData?.wikipediaHtmlSummary || biographyData?.wikipediaSummary;
  const hasBiographicalData = hasWikipediaContent || bioSummary || biographyData?.education?.length;
  const isLoading = biographyLoading || batchLoading;

  // Check for partial failure states
  const hasPartialData =
    biographyData && (biographyData.wikipediaSuccess || biographyData.wikidataSuccess);
  const hasErrors =
    biographyData && (!biographyData.wikipediaSuccess || !biographyData.wikidataSuccess);

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 border-2 border-black hover:border-2 border-black transition-border-2 border-black duration-200 ${className}`}
      >
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50">
              <BookOpen className="w-5 h-5" style={{ color: '#e21f0a' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
              Biography
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state only if we have no data at all (complete failure)
  if (biographyError && !hasPartialData && !hasBiographicalData) {
    return (
      <div
        className={`bg-white rounded-xl border border-gray-200 border-2 border-black hover:border-2 border-black transition-border-2 border-black duration-200 ${className}`}
      >
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50">
              <BookOpen className="w-5 h-5" style={{ color: '#e21f0a' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
              Biography
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 text-gray-600">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className="text-sm">
              Biography information is temporarily unavailable. Please try again later.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no biographical data available
  if (!hasBiographicalData && !batchData) {
    return null;
  }

  // Sanitize HTML content on the client side
  const sanitizedHtmlSummary = biographyData?.wikipediaHtmlSummary
    ? sanitizeAndValidateWikipediaHtml(biographyData.wikipediaHtmlSummary)
    : null;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-2 border-black hover:border-2 border-black transition-border-2 border-black duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50">
            <BookOpen className="w-5 h-5" style={{ color: '#e21f0a' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
            Biography
            {/* Show partial data indicator if there were errors */}
            {hasErrors && (
              <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Partial
              </span>
            )}
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Client-sanitized Wikipedia HTML Summary - SAFE to render */}
        {sanitizedHtmlSummary && (
          <div className="group">
            <div
              className="text-gray-700 leading-relaxed text-lg"
              style={{ fontFamily: 'inherit' }}
              // SECURITY: This HTML is sanitized on the client using DOMPurify
              dangerouslySetInnerHTML={{
                __html: sanitizedHtmlSummary,
              }}
            />
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Source: Wikipedia</span>
                {biographyData?.wikipediaPageUrl && (
                  <a
                    href={biographyData.wikipediaPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors hover:underline"
                  >
                    Read full biography
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wikipedia Plain Summary - Safe text rendering */}
        {biographyData?.wikipediaSummary && !sanitizedHtmlSummary && (
          <div className="group">
            <div className="text-gray-700 leading-relaxed text-lg">
              {biographyData.wikipediaSummary.split('.').slice(0, 2).join('.').trim()}.
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">Source: Wikipedia</span>
                {biographyData.wikipediaPageUrl && (
                  <a
                    href={biographyData.wikipediaPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors hover:underline"
                  >
                    Read full biography
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Generated Bio Summary - Safe text rendering */}
        {bioSummary && !hasWikipediaContent && (
          <div>
            <div className="text-lg text-gray-800 font-medium leading-relaxed">
              {representative.name} is a {bioSummary}.
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 font-medium">
                Source: Congressional and Legislative Records
              </span>
            </div>
          </div>
        )}

        {/* Background & Education - Safe data rendering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {biographyData?.education && biographyData.education.length > 0 && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <GraduationCap className="w-3 h-3 inline mr-1" />
                Education
              </label>
              <div className="mt-1.5 space-y-1">
                {biographyData.education.slice(0, 2).map((school, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    {school}
                  </div>
                ))}
              </div>
            </div>
          )}

          {biographyData?.occupations && biographyData.occupations.length > 0 && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <Briefcase className="w-3 h-3 inline mr-1" />
                Professional Background
              </label>
              <div className="mt-1.5 space-y-1">
                {biographyData.occupations
                  .filter(
                    occ =>
                      !['politician', 'legislator', 'senator', 'representative'].includes(
                        occ.toLowerCase()
                      )
                  )
                  .slice(0, 2)
                  .map((occupation, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {occupation}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Error reporting for partial failures (dev/debug info) */}
        {hasErrors && process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-xs text-yellow-800">
              <strong>Debug Info (dev only):</strong>
              {biographyData?.wikipediaError && (
                <div>Wikipedia: {biographyData.wikipediaError}</div>
              )}
              {biographyData?.wikidataError && <div>Wikidata: {biographyData.wikidataError}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
