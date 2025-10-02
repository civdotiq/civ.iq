/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Search Term Generator Service
 * Generates optimized search terms for news queries about representatives
 */

import type { EnhancedRepresentative } from '@/types/representative';
import stateMappings from '@/data/state-mappings.json';

export interface SearchTermOptions {
  includeCommittees?: boolean;
  includeLocation?: boolean;
  includeParty?: boolean;
  maxTerms?: number;
}

export interface GeneratedSearchTerms {
  primary: string[];
  secondary: string[];
  location: string[];
  metadata: {
    representative: string;
    state: string;
    party: string;
    termCount: number;
  };
}

/**
 * Generate search terms for a representative
 */
export function generateSearchTerms(
  representative: EnhancedRepresentative,
  options: SearchTermOptions = {}
): GeneratedSearchTerms {
  const {
    includeCommittees = true,
    includeLocation = true,
    includeParty = false,
    maxTerms = 10,
  } = options;

  const primary: string[] = [];
  const secondary: string[] = [];
  const location: string[] = [];

  // Primary terms: Name variations
  const firstName = representative.firstName || representative.name?.split(' ')[0] || '';
  const lastName = representative.lastName || representative.name?.split(' ').pop() || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    primary.push(fullName);
  }

  // Add middle name variation if available
  const middleName = representative.fullName?.middle;
  if (middleName) {
    primary.push(`${firstName} ${middleName} ${lastName}`);
  }

  // Add role-based terms
  const title = representative.chamber === 'Senate' ? 'Senator' : 'Representative';
  if (lastName) {
    primary.push(`${title} ${lastName}`);
  }

  // Location terms
  if (includeLocation && representative.state) {
    const stateFullName =
      stateMappings.abbreviationToFullName[
        representative.state as keyof typeof stateMappings.abbreviationToFullName
      ];
    if (stateFullName) {
      location.push(stateFullName);
      if (fullName) {
        primary.push(`${fullName} ${stateFullName}`);
      }
    }

    if (representative.district) {
      const districtTerm = `${representative.state}-${representative.district}`;
      location.push(districtTerm);
    }
  }

  // Committee terms
  if (includeCommittees && representative.committees?.length) {
    representative.committees.slice(0, 3).forEach(committee => {
      if (committee.name) {
        secondary.push(committee.name);
      }
    });
  }

  // Party terms (optional)
  if (includeParty && representative.party) {
    secondary.push(representative.party);
  }

  // Trim to max terms
  const trimmedPrimary = primary.slice(0, Math.floor(maxTerms * 0.6));
  const trimmedSecondary = secondary.slice(0, Math.floor(maxTerms * 0.3));
  const trimmedLocation = location.slice(0, Math.floor(maxTerms * 0.1));

  return {
    primary: trimmedPrimary,
    secondary: trimmedSecondary,
    location: trimmedLocation,
    metadata: {
      representative: fullName,
      state: representative.state || '',
      party: representative.party || '',
      termCount: trimmedPrimary.length + trimmedSecondary.length + trimmedLocation.length,
    },
  };
}

/**
 * Format search terms for GDELT API
 */
export function formatForGDELT(terms: GeneratedSearchTerms): string {
  const { primary, secondary } = terms;

  if (primary.length === 0) {
    return '';
  }

  // Primary terms are required (OR)
  const primaryQuery = primary.map(t => `"${t}"`).join(' OR ');

  // Secondary terms are optional boosters (AND)
  if (secondary.length > 0) {
    const secondaryQuery = secondary.map(t => `"${t}"`).join(' OR ');
    return `(${primaryQuery}) AND (${secondaryQuery})`;
  }

  return primaryQuery;
}

/**
 * Format search terms for Google News RSS
 */
export function formatForGoogleNews(terms: GeneratedSearchTerms): string {
  // Google News uses simple query format
  const { primary } = terms;
  return primary[0] || ''; // Use most specific term
}

/**
 * Format search terms for basic search
 */
export function formatForBasicSearch(terms: GeneratedSearchTerms): string {
  const { primary } = terms;
  return primary[0] || ''; // Use most specific term
}
