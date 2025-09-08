/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Representative Type System
 *
 * This file consolidates 3 competing RepresentativeResponse types:
 * 1. src/types/representative.ts - RepresentativeApiResponse with EnhancedRepresentative
 * 2. src/types/models/Representative.ts - RepresentativeResponse
 * 3. src/types/api/representatives.types.ts - RepresentativeDetailResponse
 *
 * Goal: Single source of truth that supports all existing usage patterns
 * with backwards compatibility and comprehensive field coverage.
 */

/**
 * Core Representative interface merging all 3 competing variants
 * Includes all fields from:
 * - EnhancedRepresentative (type 1)
 * - Representative + RepresentativeResponse (type 2)
 * - RepresentativeDetailResponse metadata (type 3)
 */
export interface UnifiedRepresentative {
  // === CORE IDENTIFYING FIELDS (all 3 types) ===
  bioguideId: string;

  // === NAME FIELDS (merged from all 3 types) ===
  // Simple name (from types 1 & 2 & 3)
  name: string;

  // Structured name (from type 2: Representative.name)
  firstName?: string; // from type 1: BaseRepresentative
  lastName?: string; // from type 1: BaseRepresentative

  // Enhanced structured name (from type 2: Representative.name)
  structuredName?: {
    first: string; // from Representative.name.first
    last: string; // from Representative.name.last
    official_full: string; // from Representative.name.official_full
    nickname?: string; // from Representative.name.nickname
    suffix?: string; // from Representative.name.suffix
  };

  // Comprehensive name (from type 1: EnhancedRepresentative.fullName)
  fullName?: {
    first: string; // from EnhancedRepresentative.fullName.first
    middle?: string; // from EnhancedRepresentative.fullName.middle
    last: string; // from EnhancedRepresentative.fullName.last
    suffix?: string; // from EnhancedRepresentative.fullName.suffix
    nickname?: string; // from EnhancedRepresentative.fullName.nickname
    official?: string; // from EnhancedRepresentative.fullName.official
  };

  // === POLITICAL IDENTIFICATION (all 3 types) ===
  party: string;
  state: string;
  district?: string | null; // nullable for senators

  // Chamber - unified to support both cases (from types 1, 2, 3)
  chamber: 'House' | 'Senate' | 'house' | 'senate';

  title: string;

  // === BASIC CONTACT (all 3 types have variants) ===
  // Simple contact fields (from types 1 & 2)
  phone?: string;
  email?: string;
  website?: string;

  // Basic contact object (from type 2: Representative.contact)
  contact?: {
    phone?: string; // from Representative.contact.phone
    website?: string; // from Representative.contact.website
    email?: string; // from Representative.contact.email
    office?: string; // from Representative.contact.office
    address?: string; // from Representative.contact.address
  };

  // Enhanced contact info (from type 1: EnhancedRepresentative.contact)
  enhancedContact?: {
    dcOffice?: {
      address?: string;
      phone?: string;
      fax?: string;
      hours?: string;
    };
    districtOffices?: Array<{
      address: string;
      phone?: string;
      fax?: string;
      hours?: string;
    }>;
    contactForm?: string;
    schedulingUrl?: string;
  };

  // Simple contact info object (from type 2: RepresentativeResponse.contactInfo)
  contactInfo?: {
    phone: string;
    website: string;
    office: string;
  };

  // === VISUAL REPRESENTATION ===
  imageUrl?: string; // from type 1: BaseRepresentative.imageUrl
  photo_url?: string; // from type 2: Representative.photo_url

  // === TERMS OF SERVICE (from types 1 & 2) ===
  // Basic terms (from type 1: BaseRepresentative.terms)
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;

  // Enhanced terms (from type 2: Representative.terms)
  enhancedTerms?: ReadonlyArray<{
    type: 'rep' | 'sen';
    start: string;
    end: string;
    state: string;
    district?: string;
    party: string;
    phone?: string;
    website?: string;
    office?: string;
    address?: string;
    class?: number; // For senators
  }>;

  // Current term (from types 1 & 2)
  currentTerm?: {
    start: string;
    end: string;
    office?: string;
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
    rssUrl?: string;
    stateRank?: 'junior' | 'senior';
    class?: number; // Senate class
  };

  // === COMMITTEES (from type 1) ===
  committees?: Array<{
    name: string;
    role?: string;
  }>;

  // === BIOGRAPHICAL INFO (from types 1 & 2) ===
  // Basic bio (from type 1: EnhancedRepresentative.bio)
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
  };

  // Enhanced biographical (from type 2: Representative.biographical)
  biographical?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
    occupation?: string;
  };

  // === SOCIAL MEDIA (from types 1 & 2) ===
  // Enhanced social media (from type 1: EnhancedRepresentative.socialMedia)
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };

  // Basic social (from type 2: Representative.social)
  social?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
  };

  // === EXTERNAL IDS (from type 1) ===
  ids?: {
    govtrack?: number;
    opensecrets?: string;
    votesmart?: number;
    fec?: string[];
    cspan?: number;
    wikipedia?: string;
    wikidata?: string;
    ballotpedia?: string;
  };

  // === LEADERSHIP & ROLES (from type 1) ===
  leadershipRoles?: Array<{
    title: string;
    start: string;
    end?: string;
  }>;

  // === STATUS FLAGS (from type 1) ===
  isHistorical?: boolean;

  // === METADATA (from types 1 & 3) ===
  metadata?: {
    // From type 1: EnhancedRepresentative.metadata
    lastUpdated?: string;
    dataSources?: Array<'congress.gov' | 'congress-legislators' | 'fec' | 'openstates'>;
    completeness?: {
      basicInfo: boolean;
      socialMedia: boolean;
      contact: boolean;
      committees: boolean;
      finance: boolean;
    };
  };
}

/**
 * Unified Representative Response extending core representative
 * This is the main response type that should replace all 3 competing variants
 */
export interface UnifiedRepresentativeResponse extends UnifiedRepresentative {
  // Placeholder to avoid empty interface ESLint error
  _placeholder?: never;
}

/**
 * Unified Representative Summary for list views
 * Combines fields from RepresentativeSummary and basic response types
 */
export interface UnifiedRepresentativeSummary {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string | null;
  chamber: 'House' | 'Senate' | 'house' | 'senate';
  title: string;
  imageUrl?: string;
  photo_url?: string;
  website?: string;
  phone?: string;
}

/**
 * Type guard for UnifiedRepresentative
 */
export function isUnifiedRepresentative(rep: unknown): rep is UnifiedRepresentative {
  return (
    typeof rep === 'object' &&
    rep !== null &&
    'bioguideId' in rep &&
    'name' in rep &&
    'party' in rep &&
    'state' in rep &&
    'chamber' in rep &&
    typeof (rep as Record<string, unknown>).bioguideId === 'string' &&
    typeof (rep as Record<string, unknown>).name === 'string' &&
    typeof (rep as Record<string, unknown>).party === 'string' &&
    typeof (rep as Record<string, unknown>).state === 'string' &&
    typeof (rep as Record<string, unknown>).chamber === 'string'
  );
}

/**
 * Type guard for UnifiedRepresentativeSummary
 */
export function isUnifiedRepresentativeSummary(rep: unknown): rep is UnifiedRepresentativeSummary {
  return isUnifiedRepresentative(rep);
}

/**
 * Migration mapping documentation
 *
 * OLD TYPE 1 (src/types/representative.ts) → UNIFIED MAPPINGS:
 * - RepresentativeApiResponse.representative → UnifiedRepresentativeResponse
 * - EnhancedRepresentative.fullName → UnifiedRepresentative.fullName
 * - EnhancedRepresentative.bio → UnifiedRepresentative.bio
 * - EnhancedRepresentative.currentTerm → UnifiedRepresentative.currentTerm
 * - EnhancedRepresentative.socialMedia → UnifiedRepresentative.socialMedia
 * - EnhancedRepresentative.contact → UnifiedRepresentative.enhancedContact
 * - BaseRepresentative.terms → UnifiedRepresentative.terms
 *
 * OLD TYPE 2 (src/types/models/Representative.ts) → UNIFIED MAPPINGS:
 * - Representative.name → UnifiedRepresentative.structuredName
 * - Representative.contact → UnifiedRepresentative.contact
 * - Representative.social → UnifiedRepresentative.social
 * - Representative.biographical → UnifiedRepresentative.biographical
 * - Representative.terms → UnifiedRepresentative.enhancedTerms
 * - RepresentativeResponse.contactInfo → UnifiedRepresentative.contactInfo
 *
 * OLD TYPE 3 (src/types/api/representatives.types.ts) → UNIFIED MAPPINGS:
 * - RepresentativeDetailResponse.data → UnifiedRepresentativeResponse
 * - RepresentativeDetailResponse.metadata.lastUpdated → UnifiedRepresentative.metadata.lastUpdated
 */
