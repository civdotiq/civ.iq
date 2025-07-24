/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// ==================== Congress.gov API Types ====================

export interface CongressApiTerm {
  chamber: string;
  congress: number;
  endYear?: number;
  startYear: number;
}

export interface CongressApiDepiction {
  attribution?: string;
  imageUrl?: string;
}

export interface CongressApiMember {
  bioguideId: string;
  depiction?: CongressApiDepiction;
  district?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  name: string;
  party: string;
  partyName: string;
  state: string;
  terms: {
    item: CongressApiTerm[];
  };
  url?: string;
  updateDate: string;
}

export interface CongressApiMembersResponse {
  members: CongressApiMember[];
  pagination?: {
    count: number;
    next?: string;
    previous?: string;
  };
}

export interface CongressApiBillSummary {
  text: string;
  versionCode: string;
  actionDate: string;
  updateDate: string;
}

export interface CongressApiBillAction {
  actionCode?: string;
  actionDate: string;
  sourceSystem?: {
    code: number;
    name: string;
  };
  text: string;
  type: string;
}

export interface CongressApiBill {
  congress: number;
  number: string;
  originChamber: string;
  title: string;
  type: string;
  url: string;
  introducedDate: string;
  updateDate: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
  policyArea?: {
    name: string;
  };
  sponsors?: Array<{
    bioguideId: string;
    firstName: string;
    lastName: string;
    party: string;
    state: string;
    district?: string;
  }>;
  summaries?: CongressApiBillSummary[];
  actions?: CongressApiBillAction[];
}

export interface CongressApiBillsResponse {
  bills: CongressApiBill[];
  pagination?: {
    count: number;
    next?: string;
    previous?: string;
  };
}

export interface CongressApiVote {
  chamber: string;
  congress: number;
  date: string;
  number: number;
  result: string;
  sessionNumber: number;
  type: string;
  url: string;
  question: string;
  description?: string;
  recordedVotes?: {
    recordedVote: Array<{
      legislator: {
        bioguideId: string;
        firstName: string;
        lastName: string;
        party: string;
        state: string;
        district?: string;
      };
      vote: string;
    }>;
  };
}

export interface CongressApiVotesResponse {
  votes: CongressApiVote[];
  pagination?: {
    count: number;
    next?: string;
    previous?: string;
  };
}

// ==================== FEC API Types ====================

export interface FecApiCandidate {
  candidate_id: string;
  name: string;
  party: string;
  office: string;
  office_full: string;
  state: string;
  district?: string;
  cycles: number[];
  election_years: number[];
  candidate_status: string;
  active_through: number;
  incumbent_challenge: string;
  incumbent_challenge_full: string;
}

export interface FecApiCandidatesResponse {
  results: FecApiCandidate[];
  pagination: {
    count: number;
    page: number;
    pages: number;
    per_page: number;
  };
}

export interface FecApiCommittee {
  committee_id: string;
  name: string;
  committee_type: string;
  committee_type_full: string;
  designation: string;
  designation_full: string;
  organization_type: string;
  organization_type_full: string;
  party: string;
  party_full: string;
  state: string;
  cycles: number[];
  first_file_date: string;
  last_file_date?: string;
}

export interface FecApiFinancialSummary {
  candidate_id: string;
  cycle: number;
  receipts: number;
  disbursements: number;
  cash_on_hand_end_period: number;
  debts_owed_by_committee: number;
  coverage_start_date: string;
  coverage_end_date: string;
}

export interface FecApiContribution {
  committee_id: string;
  committee_name: string;
  contributor_name: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contributor_city?: string;
  contributor_state?: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  receipt_type: string;
  receipt_type_full: string;
}

export interface FecApiContributionsResponse {
  results: FecApiContribution[];
  pagination: {
    count: number;
    page: number;
    pages: number;
    per_page: number;
  };
}

// ==================== GDELT API Types ====================

export interface GdeltApiArticle {
  url: string;
  title: string;
  summary?: string;
  source: string;
  author?: string;
  published_date: string;
  language: string;
  theme?: string;
  tone?: number;
  location?: {
    country: string;
    state?: string;
    city?: string;
  };
  mentions?: Array<{
    name: string;
    type: string;
    confidence: number;
  }>;
}

export interface GdeltApiResponse {
  articles: GdeltApiArticle[];
  query_info: {
    query: string;
    language: string;
    startdatetime: string;
    enddatetime: string;
    total_articles: number;
  };
}

export interface GdeltApiTimelineEntry {
  date: string;
  count: number;
  articles: GdeltApiArticle[];
}

export interface GdeltApiTimelineResponse {
  timeline: GdeltApiTimelineEntry[];
  summary: {
    total_articles: number;
    date_range: {
      start: string;
      end: string;
    };
    top_sources: Array<{
      source: string;
      count: number;
    }>;
  };
}

// ==================== Census API Types ====================

export interface CensusApiGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

export interface CensusApiFeature {
  type: string;
  properties: {
    GEOID: string;
    NAME: string;
    STATE: string;
    DISTRICT?: string;
    [key: string]: string | number | undefined;
  };
  geometry: CensusApiGeometry;
}

export interface CensusApiResponse {
  type: string;
  features: CensusApiFeature[];
}

export interface CensusApiDemographics {
  NAME: string;
  B01003_001E?: number; // Total population
  B19013_001E?: number; // Median household income
  B25077_001E?: number; // Median home value
  B08303_001E?: number; // Commute time
  B15003_022E?: number; // Bachelor's degree
  B15003_023E?: number; // Master's degree
  B15003_024E?: number; // Professional degree
  B15003_025E?: number; // Doctorate degree
  [key: string]: string | number | undefined;
}

export interface CensusApiDemographicsResponse {
  data: CensusApiDemographics[];
}

export interface CensusApiGeocodingMatch {
  matchedAddress: string;
  coordinates: {
    x: number; // longitude
    y: number; // latitude
  };
  addressComponents: {
    zip: string;
    city: string;
    state: string;
  };
  tigerLine: {
    side: string;
    tigerLineId: string;
  };
}

export interface CensusApiGeocodingResponse {
  result: {
    input: {
      benchmark: string;
      vintage: string;
    };
    addressMatches: CensusApiGeocodingMatch[];
  };
}

// ==================== OpenStates API Types ====================

export interface OpenStatesApiBill {
  id: string;
  identifier: string;
  title: string;
  classification: string[];
  subject: string[];
  session: string;
  created_at: string;
  updated_at: string;
  first_action_date?: string;
  latest_action_date?: string;
  latest_action_description?: string;
  latest_passage_date?: string;
  abstracts: Array<{
    abstract: string;
    note: string;
    date: string;
  }>;
  other_titles: Array<{
    title: string;
    note: string;
  }>;
  sponsors: Array<{
    name: string;
    id: string;
    primary: boolean;
    classification: string;
  }>;
  actions: Array<{
    description: string;
    date: string;
    classification: string[];
    order: number;
  }>;
}

export interface OpenStatesApiBillsResponse {
  results: OpenStatesApiBill[];
  info: {
    count: number;
    total_count: number;
    page: number;
    max_page: number;
  };
}

export interface OpenStatesApiLegislator {
  id: string;
  name: string;
  party: string;
  current_role?: {
    title: string;
    district: string;
    start_date: string;
    end_date?: string;
    org_classification: string;
  };
  contact_details: Array<{
    type: string;
    value: string;
    note?: string;
  }>;
  links: Array<{
    url: string;
    note?: string;
  }>;
  extras: {
    [key: string]: string;
  };
}

export interface OpenStatesApiLegislatorsResponse {
  results: OpenStatesApiLegislator[];
  info: {
    count: number;
    total_count: number;
    page: number;
    max_page: number;
  };
}
