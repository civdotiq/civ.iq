/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Enhanced Representative Types
 *
 * This file defines comprehensive types for representative data,
 * combining our existing structure with congress-legislators enhancements.
 * Includes error handling and batch API response types.
 */

// Base representative interface (existing structure)
export interface BaseRepresentative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
}

// Enhanced representative with congress-legislators data
export interface EnhancedRepresentative extends BaseRepresentative {
  // Status information
  isHistorical?: boolean;

  // Enhanced name information
  fullName?: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };

  // Biographical information
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
  };

  // Current term details
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

  // Social media presence
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };

  // Cross-platform IDs
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

  // Leadership roles
  leadershipRoles?: Array<{
    title: string;
    start: string;
    end?: string;
  }>;

  // Enhanced contact information
  contact?: {
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

  // Data source metadata
  metadata?: {
    lastUpdated: string;
    dataSources: Array<'congress.gov' | 'congress-legislators' | 'fec' | 'openstates'>;
    completeness?: {
      basicInfo: boolean;
      socialMedia: boolean;
      contact: boolean;
      committees: boolean;
      finance: boolean;
    };
  };
}

// Representative summary for list views
export interface RepresentativeSummary {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
  website?: string;
  phone?: string;
}

// Representative search result
export interface RepresentativeSearchResult extends RepresentativeSummary {
  relevanceScore?: number;
  matchedFields?: string[];
}

// Committee information
export interface CommitteeMembership {
  committeeId: string;
  name: string;
  fullName: string;
  role: 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member';
  subcommittees?: Array<{
    name: string;
    role: string;
  }>;
  startDate?: string;
  endDate?: string;
}

// Enhanced committee data
export interface EnhancedCommitteeInfo {
  current: CommitteeMembership[];
  historical: CommitteeMembership[];
  leadership: Array<{
    committee: string;
    role: string;
    startDate: string;
    endDate?: string;
  }>;
}

// Representative analytics data
export interface RepresentativeAnalytics {
  effectiveness?: {
    billsSponsored: number;
    billsPassed: number;
    amendmentsOffered: number;
    successRate: number;
  };
  engagement?: {
    townHalls: number;
    pressReleases: number;
    socialMediaActivity: number;
    lastUpdate: string;
  };
  voting?: {
    totalVotes: number;
    partyLineVotes: number;
    bipartisanVotes: number;
    absences: number;
    votingScore: number;
  };
}

// Contact attempt tracking
export interface ContactAttempt {
  id: string;
  bioguideId: string;
  userId?: string;
  method: 'email' | 'phone' | 'contact_form' | 'office_visit';
  timestamp: string;
  subject?: string;
  status: 'sent' | 'delivered' | 'responded' | 'failed';
  response?: {
    receivedAt: string;
    type: 'automated' | 'personal';
    content?: string;
  };
}

// ZIP code to representative mapping
export interface ZipCodeRepresentatives {
  zipCode: string;
  state: string;
  representatives: {
    house?: RepresentativeSummary;
    senate: RepresentativeSummary[];
  };
  district?: string;
  lastUpdated: string;
}

// Type guards
export function isEnhancedRepresentative(rep: unknown): rep is EnhancedRepresentative {
  return (
    typeof rep === 'object' &&
    rep !== null &&
    'bioguideId' in rep &&
    'name' in rep &&
    typeof (rep as Record<string, unknown>).bioguideId === 'string' &&
    typeof (rep as Record<string, unknown>).name === 'string'
  );
}

export function isRepresentativeSummary(rep: unknown): rep is RepresentativeSummary {
  return (
    typeof rep === 'object' &&
    rep !== null &&
    'bioguideId' in rep &&
    'name' in rep &&
    'party' in rep &&
    typeof (rep as Record<string, unknown>).bioguideId === 'string' &&
    typeof (rep as Record<string, unknown>).name === 'string' &&
    typeof (rep as Record<string, unknown>).party === 'string'
  );
}

// Utility types
export type RepresentativeField = keyof EnhancedRepresentative;
export type SocialMediaPlatform = keyof NonNullable<EnhancedRepresentative['socialMedia']>;
export type RepresentativeId = keyof NonNullable<EnhancedRepresentative['ids']>;

// API response types
export interface RepresentativeApiResponse {
  representative: EnhancedRepresentative;
  success: boolean;
  error?: string;
  metadata?: {
    cacheHit?: boolean;
    responseTime?: number;
    dataSource?: string;
  };
}

export interface RepresentativesListResponse {
  representatives: RepresentativeSummary[];
  total: number;
  page?: number;
  perPage?: number;
  hasMore?: boolean;
  success: boolean;
  error?: string;
}

// Filter and search options
export interface RepresentativeFilters {
  state?: string;
  party?: string;
  chamber?: 'House' | 'Senate';
  committee?: string;
  leadership?: boolean;
  hasTwitter?: boolean;
  hasFacebook?: boolean;
  hasWebsite?: boolean;
}

export interface RepresentativeSearchOptions {
  query?: string;
  filters?: RepresentativeFilters;
  sortBy?: 'name' | 'state' | 'party' | 'seniority';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Enhanced error handling types
export interface APIError {
  message: string;
  statusCode: number;
  endpoint?: string;
  timestamp: string;
  requestId?: string;
}

// Specific data types for batch responses
export interface VoteData {
  vote_id: string;
  position: string;
  date: string;
  bill: {
    title: string;
    number: string;
  };
}

export interface BillData {
  bill_id: string;
  title: string;
  number: string;
  congress: number;
  introduced_date: string;
  status: string;
}

export interface FinanceData {
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand?: number;
  cycle: string;
}

export interface NewsData {
  title: string;
  url: string;
  published_date: string;
  source: string;
}

// Batch API response types
export interface BatchApiResponse {
  success: boolean;
  data: {
    votes?: VoteData[];
    bills?: BillData[];
    finance?: FinanceData;
    news?: NewsData[];
    profile?: EnhancedRepresentative;
    [key: string]: unknown;
  };
  errors: Record<string, string>;
  metadata: {
    timestamp: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    totalTime: number;
  };
  executionTime: number;
}

// Enhanced type for batch API hook
export interface BatchApiHookResult {
  data: {
    votes?: VoteData[];
    bills?: BillData[];
    finance?: FinanceData;
    news?: NewsData[];
    profile?: EnhancedRepresentative;
    [key: string]: unknown;
  };
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  metadata?: BatchApiResponse['metadata'];
  partialErrors?: Record<string, string>;
}

// Profile data structure for batch response
export interface RepresentativeProfile {
  profile: EnhancedRepresentative;
  votes?: VoteData[];
  bills?: BillData[];
  finance?: FinanceData;
  news?: NewsData[];
  'party-alignment'?: {
    score: number;
    total_votes: number;
    party_line_votes: number;
  };
  committees?: CommitteeMembership[];
  leadership?: {
    positions: string[];
    current_role?: string;
  };
  district?: {
    id: string;
    state: string;
    number: string;
  };
}

// Individual endpoint response wrapper
export interface EndpointResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  executionTime?: number;
}
