/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates.org API v3 Integration
 *
 * This module provides utilities for integrating with the OpenStates.org v3 REST API
 * to fetch real state legislature and bill data.
 *
 * API Documentation: https://docs.openstates.org/api-v3/
 * Migration from v2 GraphQL to v3 REST (Dec 2023)
 */

import { getStateCode } from '@/lib/data/us-states';

interface OpenStatesConfig {
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

// v3 REST API Response Types
interface V3PaginatedResponse<T> {
  results: T[];
  pagination: {
    per_page: number;
    page: number;
    max_page: number;
    total_items: number;
  };
}

interface V3Person {
  id: string;
  name: string;
  party: string | null;
  current_role: {
    title: string;
    org_classification: string;
    district: string | null;
    division_id: string | null;
  } | null;
  jurisdiction: {
    id: string;
    name: string;
    classification: string;
  };
  email: string | null;
  image: string | null;
  links: Array<{
    url: string;
    note: string | null;
  }>;
  other_identifiers: Array<{
    scheme: string;
    identifier: string;
  }>;
  extras: Record<string, unknown>;
}

interface V3Jurisdiction {
  id: string;
  name: string;
  classification: string;
  division_id: string;
  url: string;
  latest_bill_update: string;
  latest_people_update: string;
}

interface V3Bill {
  id: string;
  identifier: string;
  title: string;
  session: string;
  classification: string[];
  subject: string[];
  abstracts: Array<{
    abstract: string;
    note: string | null;
  }>;
  from_organization: {
    id: string;
    name: string;
    classification: string;
  } | null;
  jurisdiction: {
    id: string;
    name: string;
    classification: string;
  };
  sponsorships: Array<{
    id: string;
    name: string;
    entity_type: string;
    classification: string;
    primary: boolean;
  }>;
  actions: Array<{
    description: string;
    date: string;
    classification: string[];
    order: number;
  }>;
  votes: Array<{
    id: string;
    motion_text: string;
    start_date: string;
    result: string;
    counts: Array<{
      option: string;
      value: number;
    }>;
  }>;
  sources: Array<{
    url: string;
    note: string | null;
  }>;
  // Bill text versions (introduced, amended, enrolled, etc.)
  versions: Array<{
    url: string;
    note: string | null;
    date: string | null;
    media_type: string | null;
  }>;
  // Supporting documents (fiscal notes, amendments, analyses)
  documents: Array<{
    url: string;
    note: string | null;
    date: string | null;
    media_type: string | null;
  }>;
  // Related legislation
  related_bills: Array<{
    identifier: string;
    legislative_session: string;
    relation_type: string;
  }>;
  // Alternative titles
  other_titles: Array<{
    title: string;
    note: string | null;
  }>;
  // Cross-references (e.g., state-specific IDs)
  other_identifiers: Array<{
    identifier: string;
    scheme: string;
    note: string | null;
  }>;
  // Key dates
  first_action_date: string | null;
  latest_action_date: string | null;
  latest_action_description: string | null;
  latest_passage_date: string | null;
  // State-specific extra data
  extras: Record<string, unknown>;
  openstates_url: string;
  created_at: string;
  updated_at: string;
}

// Exported types for backward compatibility
export interface OpenStatesLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
  photo_url?: string;
  email?: string;
  phone?: string;
  links?: Array<{ url: string; note?: string }>;
  // External profile links (BallotPedia, VoteSmart, etc.)
  other_identifiers?: Array<{
    scheme: string; // e.g., 'ballotpedia', 'votesmart', 'twitter', 'facebook'
    identifier: string; // e.g., username or ID
  }>;
  extras?: Record<string, unknown>;
}

export interface OpenStatesBill {
  id: string;
  identifier: string;
  title: string;
  session?: string;
  chamber?: 'upper' | 'lower';
  classification?: string[];
  subject?: string[];
  abstracts?: Array<{
    abstract: string;
    note?: string;
  }>;
  sponsorships?: Array<{
    name: string;
    entity_type: string;
    classification: string;
    primary: boolean;
  }>;
  actions?: Array<{
    description: string;
    date: string;
    classification: string[];
  }>;
  votes?: Array<{
    id: string;
    motion_text: string;
    start_date: string;
    result: string;
    counts: Array<{ option: string; value: number }>;
  }>;
  sources?: Array<{ url: string; note?: string }>;
  // Bill text versions (introduced, amended, enrolled, etc.)
  versions?: Array<{
    url: string;
    note?: string;
    date?: string;
    media_type?: string;
  }>;
  // Supporting documents (fiscal notes, amendments, analyses)
  documents?: Array<{
    url: string;
    note?: string;
    date?: string;
    media_type?: string;
  }>;
  // Related legislation
  related_bills?: Array<{
    identifier: string;
    legislative_session: string;
    relation_type: string;
  }>;
  // Key dates
  first_action_date?: string;
  latest_action_date?: string;
  latest_action_description?: string;
  latest_passage_date?: string;
  // Direct link to OpenStates page
  openstates_url?: string;
  // State-specific extra data
  extras?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface OpenStatesJurisdiction {
  id: string;
  name: string;
  classification: string;
  chambers: {
    upper: { name: string; title: string };
    lower: { name: string; title: string };
  };
  legislative_sessions?: Array<{
    identifier: string;
    name: string;
    start_date: string;
    end_date: string;
  }>;
}

/**
 * OpenStates v3 Vote Event (Individual Vote Record)
 */
export interface OpenStatesVote {
  id: string;
  identifier: string;
  motion_text: string;
  motion_classification: string[];
  start_date: string;
  result: 'pass' | 'fail';
  organization: {
    id: string;
    name: string;
    classification: string;
  };
  votes: Array<{
    option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
    voter_name: string;
    voter_id: string | null;
  }>;
  counts: Array<{
    option: string;
    value: number;
  }>;
  bill: {
    id: string;
    identifier: string;
    title: string;
  } | null;
  created_at: string;
  updated_at: string;
}

/**
 * OpenStates v3 Person Vote (vote cast by a specific person)
 */
export interface OpenStatesPersonVote {
  vote_id: string;
  identifier: string;
  motion_text: string;
  start_date: string;
  result: 'pass' | 'fail';
  option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
  bill_identifier: string | null;
  bill_title: string | null;
  bill_id: string | null;
  organization_name: string;
  chamber: 'upper' | 'lower';
}

/**
 * OpenStates v3 Committee
 */
export interface OpenStatesCommittee {
  id: string;
  name: string;
  classification: 'committee' | 'subcommittee';
  chamber: 'upper' | 'lower' | null;
  parent_id: string | null;
  memberships?: Array<{
    person_name: string;
    role: string;
    person_id?: string;
    person?: {
      id: string;
      name: string;
      party: string | null;
      current_role: {
        title: string;
        district: string | null;
      } | null;
    };
  }>;
  links?: Array<{
    url: string;
    note: string | null;
  }>;
  sources?: Array<{
    url: string;
    note: string | null;
  }>;
  extras?: Record<string, unknown>;
}

/**
 * OpenStates v3 Event (Legislative Calendar Event)
 */
export interface OpenStatesEvent {
  id: string;
  name: string;
  description: string | null;
  classification: string;
  start_date: string;
  end_date: string | null;
  timezone: string;
  all_day: boolean;
  status: string | null;
  location: {
    name: string | null;
    note: string | null;
    url: string | null;
  } | null;
  participants: Array<{
    entity_type: 'organization' | 'person';
    entity_id: string;
    entity_name: string;
    note: string | null;
  }>;
  agenda: Array<{
    order: number | null;
    description: string;
    subjects: string[];
    notes: Array<{
      description: string;
    }>;
    related_entities: Array<{
      entity_type: 'bill' | 'vote_event';
      entity_id: string;
      bill?: {
        id: string;
        identifier: string;
        title: string;
      };
    }>;
  }>;
  media: Array<{
    name: string;
    url: string;
    media_type: string;
    date: string | null;
  }>;
  sources: Array<{
    url: string;
    note: string | null;
  }>;
  created_at: string;
  updated_at: string;
}

class OpenStatesAPI {
  private config: OpenStatesConfig;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;

  constructor(config?: Partial<OpenStatesConfig>) {
    this.config = {
      apiKey: process.env.OPENSTATES_API_KEY,
      baseUrl: 'https://v3.openstates.org',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    this.cache = new Map();
  }

  /**
   * Make a REST API request to OpenStates v3
   * @param endpoint - API endpoint
   * @param params - Query parameters
   * @param cacheTTL - Optional cache TTL in milliseconds (default: smart based on endpoint)
   */
  private async makeRequest<T = unknown>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
    cacheTTL?: number
  ): Promise<T> {
    // Build cache key
    const cacheKey = JSON.stringify({ endpoint, params });
    const cached = this.cache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    // Build URL with query parameters
    const url = new URL(endpoint, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Build headers
    const headers: Record<string, string> = {
      'User-Agent': 'CivIQ-Hub/2.0 (OpenStates-v3)',
    };

    if (this.config.apiKey) {
      headers['X-API-KEY'] = this.config.apiKey;
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${response.statusText} - URL: ${url.toString()} - Response: ${errorText}`
          );
        }

        const data = await response.json();

        // Smart cache TTL based on data type and election cycles:
        // - Votes: 6 months (immutable historical records)
        // - Bills with session: 7 days (historical sessions immutable, current changes slowly)
        // - People/legislators: Election-aware (see below)
        // - Default: 30 minutes
        //
        // State legislator caching strategy (based on term length research):
        // - State legislators change primarily during biennial election cycles (every 2 years)
        // - Elections occur in November; certified results in December
        // - Mid-term changes (special elections) are rare (<5% annually)
        // - During election season (Oct-Dec): 3 days TTL to capture new legislators
        // - Rest of year: 30 days TTL (legislators rarely change between elections)
        let ttl: number;
        if (cacheTTL) {
          ttl = cacheTTL;
        } else if (endpoint.includes('/votes')) {
          ttl = 15552000000; // 6 months for vote records (immutable)
        } else if (endpoint.includes('/bills') && params?.session) {
          ttl = 604800000; // 7 days for bills with specific session
        } else if (endpoint.includes('/bills')) {
          ttl = 86400000; // 24 hours for current bills
        } else if (endpoint.includes('/people')) {
          // Election-aware TTL for state legislators
          const now = new Date();
          const month = now.getMonth(); // 0-11 (0=Jan, 9=Oct, 10=Nov, 11=Dec)
          const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec

          // During election season: 3 days (259200000ms)
          // Rest of year: 30 days (2592000000ms)
          // Rationale: State legislators change every 2 years via elections.
          // Representatives: 44 states change every 2 years
          // Senators: 45 states change every 2 years (staggered) or every 4 years
          ttl = isElectionSeason ? 259200000 : 2592000000;
        } else {
          ttl = 1800000; // 30 minutes default
        }

        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl,
        });

        return data as T;
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryAttempts) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Unknown error occurred');
  }

  /**
   * Get legislators by geographic location (lat/lng)
   * Uses OpenStates /people.geo endpoint for direct geographic lookup
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Array of state legislators representing that location (filters out federal officials)
   */
  async getLegislatorsByLocation(lat: number, lng: number): Promise<OpenStatesLegislator[]> {
    try {
      const params: Record<string, string | number> = {
        lat,
        lng,
      };

      const response = await this.makeRequest<V3PaginatedResponse<V3Person>>('/people.geo', params);

      // Filter to ONLY state legislators (exclude federal officials)
      // Federal officials have jurisdiction.classification === "country"
      // State officials have jurisdiction.classification === "state"
      const stateLegislators = response.results.filter(
        person => person.jurisdiction?.classification === 'state'
      );

      // Extract state code from first legislator (all should be same state)
      if (stateLegislators.length === 0) {
        return [];
      }

      // Get state code from jurisdiction name (e.g., "Michigan" -> "MI")
      const stateName = stateLegislators[0]?.jurisdiction?.name;
      if (!stateName) {
        return [];
      }

      const stateCode = getStateCode(stateName);
      if (!stateCode) {
        throw new Error(`Unable to map jurisdiction "${stateName}" to state code`);
      }

      // Transform to our format
      return stateLegislators.map(person => this.transformPerson(person, stateCode));
    } catch (error) {
      // If geo lookup fails, return empty array (caller can fallback to district-based lookup)
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get legislators for a specific state
   * @param state - State abbreviation (e.g., 'MI' or 'michigan')
   * @param chamber - Optional chamber filter ('upper' or 'lower')
   */
  async getLegislators(
    state: string,
    chamber?: 'upper' | 'lower'
  ): Promise<OpenStatesLegislator[]> {
    // v3 uses lowercase state abbreviations (e.g., 'mi' for Michigan)
    const jurisdiction = state.toLowerCase();

    // v3 API max per_page is 50, need to paginate for states with many legislators
    let allResults: V3Person[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, string | number> = {
        jurisdiction,
        per_page: 50, // v3 API maximum
        page,
      };

      const response = await this.makeRequest<V3PaginatedResponse<V3Person>>('/people', params);
      allResults = allResults.concat(response.results);

      // Check if there are more pages
      hasMore = page < response.pagination.max_page;
      page++;
    }

    // Filter by chamber if specified and transform to our format
    return allResults
      .filter(person => {
        if (!person.current_role) return false;
        if (!chamber) return true;

        // v3 uses organization classification, we need to map it
        // Check if the person's role matches the requested chamber
        const org = person.current_role;
        if (chamber === 'upper') {
          return (
            org.org_classification === 'upper' ||
            org.title?.toLowerCase().includes('senator') ||
            org.title?.toLowerCase().includes('senate')
          );
        } else {
          return (
            org.org_classification === 'lower' ||
            org.title?.toLowerCase().includes('representative') ||
            org.title?.toLowerCase().includes('delegate') ||
            org.title?.toLowerCase().includes('assembly')
          );
        }
      })
      .map(person => this.transformPerson(person, state.toUpperCase()));
  }

  /**
   * Transform v3 Person to our OpenStatesLegislator format
   */
  private transformPerson(person: V3Person, state: string): OpenStatesLegislator {
    // Determine chamber from current role
    let chamber: 'upper' | 'lower' = 'lower';
    if (person.current_role) {
      const title = person.current_role.title?.toLowerCase() || '';
      if (
        person.current_role.org_classification === 'upper' ||
        title.includes('senator') ||
        title.includes('senate')
      ) {
        chamber = 'upper';
      }
    }

    // Extract phone from extras (v3 structure)
    const phone = person.extras?.['capitol_phone'] as string | undefined;

    return {
      id: person.id,
      name: person.name,
      party: person.party || 'Unknown',
      chamber,
      district: person.current_role?.district || 'At-Large',
      state: state,
      photo_url: person.image || undefined,
      email: person.email || undefined,
      phone,
      links: person.links?.map(link => ({
        url: link.url,
        note: link.note ?? undefined,
      })),
      // External profile identifiers (BallotPedia, VoteSmart, Twitter, etc.)
      other_identifiers: person.other_identifiers?.map(oi => ({
        scheme: oi.scheme,
        identifier: oi.identifier,
      })),
      extras: person.extras,
    };
  }

  /**
   * Get jurisdiction (state) information
   * @param state - State abbreviation or name (e.g., 'MI' or 'michigan')
   */
  async getJurisdiction(state: string): Promise<OpenStatesJurisdiction | null> {
    const jurisdiction = state.toLowerCase();

    try {
      const response = await this.makeRequest<V3Jurisdiction>(`/jurisdictions/${jurisdiction}`);

      // v3 API doesn't return chamber info, use defaults
      return {
        id: response.id,
        name: response.name,
        classification: response.classification,
        chambers: {
          upper: {
            name: 'Senate',
            title: 'Senator',
          },
          lower: {
            name: 'House of Representatives',
            title: 'Representative',
          },
        },
        legislative_sessions: undefined,
      };
    } catch (error) {
      // If jurisdiction not found, return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get bills for a specific state and session
   * @param state - State abbreviation or name
   * @param session - Optional session identifier
   * @param chamber - Optional chamber filter
   * @param subject - Optional subject filter
   * @param limit - Maximum number of bills to return
   * @param query - Optional full-text search query (searches bill title and text)
   */
  async getBills(
    state: string,
    session?: string,
    chamber?: 'upper' | 'lower',
    subject?: string,
    limit = 50,
    query?: string
  ): Promise<OpenStatesBill[]> {
    const jurisdiction = state.toLowerCase();

    const params: Record<string, string | number> = {
      jurisdiction,
      per_page: Math.min(limit, 100), // v3 max is 100 per page
    };

    if (session) params.session = session;
    if (subject) params.subject = subject;
    if (query) params.q = query; // OpenStates full-text search parameter

    const response = await this.makeRequest<V3PaginatedResponse<V3Bill>>('/bills', params);

    // Filter by chamber if specified and transform to our format
    return response.results
      .filter(bill => {
        if (!chamber || !bill.from_organization) return true;
        const orgClass = bill.from_organization.classification;
        return orgClass === chamber;
      })
      .slice(0, limit)
      .map(bill => this.transformBill(bill));
  }

  /**
   * Get bills sponsored or cosponsored by a specific person
   * Uses server-side filtering for better performance
   * @param personId - OpenStates person ID (e.g., 'ocd-person/...')
   * @param state - State abbreviation (e.g., 'MI')
   * @param session - Optional session identifier
   * @param limit - Maximum number of bills to return (default 50, max 100)
   */
  async getBillsBySponsor(
    personId: string,
    state: string,
    session?: string,
    limit = 50
  ): Promise<OpenStatesBill[]> {
    const jurisdiction = state.toLowerCase();

    let allBills: V3Bill[] = [];
    let page = 1;
    let hasMore = true;

    // OpenStates v3 /bills API has a max per_page of 20 (not 100 like other endpoints)
    while (hasMore && allBills.length < limit) {
      const params: Record<string, string | number> = {
        jurisdiction,
        sponsor: personId,
        per_page: Math.min(20, limit - allBills.length), // /bills endpoint max is 20 per page
        page,
      };

      if (session) params.session = session;

      const response = await this.makeRequest<V3PaginatedResponse<V3Bill>>('/bills', params);
      allBills = allBills.concat(response.results);

      // Check if there are more pages
      hasMore = page < response.pagination.max_page && allBills.length < limit;
      page++;
    }

    return allBills.slice(0, limit).map(bill => this.transformBill(bill));
  }

  /**
   * Transform v3 Bill to our OpenStatesBill format
   */
  private transformBill(bill: V3Bill): OpenStatesBill {
    // Determine chamber from organization
    let chamber: 'upper' | 'lower' | undefined;
    if (bill.from_organization) {
      chamber = bill.from_organization.classification as 'upper' | 'lower';
    }

    return {
      id: bill.id,
      identifier: bill.identifier,
      title: bill.title,
      session: bill.session,
      chamber,
      classification: bill.classification,
      subject: bill.subject,
      abstracts:
        bill.abstracts?.map(a => ({
          abstract: a.abstract,
          note: a.note ?? undefined,
        })) ?? [],
      sponsorships:
        bill.sponsorships?.map(s => ({
          name: s.name,
          entity_type: s.entity_type,
          classification: s.classification,
          primary: s.primary,
        })) ?? [],
      actions:
        bill.actions?.map(a => ({
          description: a.description,
          date: a.date,
          classification: a.classification,
        })) ?? [],
      votes:
        bill.votes?.map(v => ({
          id: v.id,
          motion_text: v.motion_text,
          start_date: v.start_date,
          result: v.result,
          counts: v.counts,
        })) ?? [],
      sources:
        bill.sources?.map(source => ({
          url: source.url,
          note: source.note ?? undefined,
        })) ?? [],
      // Bill text versions (links to full bill text)
      versions:
        bill.versions?.map(v => ({
          url: v.url,
          note: v.note ?? undefined,
          date: v.date ?? undefined,
          media_type: v.media_type ?? undefined,
        })) ?? [],
      // Supporting documents (fiscal notes, amendments, analyses)
      documents:
        bill.documents?.map(d => ({
          url: d.url,
          note: d.note ?? undefined,
          date: d.date ?? undefined,
          media_type: d.media_type ?? undefined,
        })) ?? [],
      // Related legislation
      related_bills:
        bill.related_bills?.map(rb => ({
          identifier: rb.identifier,
          legislative_session: rb.legislative_session,
          relation_type: rb.relation_type,
        })) ?? [],
      // Key dates for tracking bill progress
      first_action_date: bill.first_action_date ?? undefined,
      latest_action_date: bill.latest_action_date ?? undefined,
      latest_action_description: bill.latest_action_description ?? undefined,
      latest_passage_date: bill.latest_passage_date ?? undefined,
      // Direct link to OpenStates page
      openstates_url: bill.openstates_url,
      // State-specific extra data
      extras: bill.extras,
      created_at: bill.created_at,
      updated_at: bill.updated_at,
    };
  }

  /**
   * Get a single bill by ID
   * @param billId - OpenStates bill ID (e.g., 'ocd-bill/...')
   */
  async getBillById(billId: string): Promise<OpenStatesBill | null> {
    try {
      const response = await this.makeRequest<V3Bill>(`/bills/${billId}`);
      return this.transformBill(response);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get a single person by ID
   * @param personId - OpenStates person ID (e.g., 'ocd-person/...')
   *
   * NOTE: OpenStates v3 API does NOT have a /people/{id} endpoint.
   * Instead, we use the /people list endpoint with id filter parameter.
   */
  async getPersonById(personId: string): Promise<OpenStatesLegislator | null> {
    try {
      // Use the /people list endpoint with id filter (OpenStates v3 API design)
      // The id parameter should be passed as a string (the API accepts single ID)
      const params: Record<string, string> = {
        id: personId,
      };

      const response = await this.makeRequest<V3PaginatedResponse<V3Person>>('/people', params);

      // Check if we got results
      if (!response.results || response.results.length === 0) {
        return null;
      }

      // Return the first (and should be only) result
      const person = response.results[0];
      if (!person) {
        return null;
      }

      // Convert jurisdiction name (e.g., "Michigan") to state code (e.g., "MI")
      const stateName = person.jurisdiction.name;
      const stateCode = getStateCode(stateName);
      if (!stateCode) {
        throw new Error(`Unable to map jurisdiction "${stateName}" to state code`);
      }
      return this.transformPerson(person, stateCode);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get votes cast by a specific person (legislator)
   * @param personId - OpenStates person ID (format: ocd-person-{uuid})
   * @param limit - Maximum number of votes to return (default: 50, max: 100)
   * @param page - Page number for pagination (default: 1)
   * @returns Array of votes cast by this person
   */
  async getVotesByPerson(
    personId: string,
    limit: number = 50,
    page: number = 1
  ): Promise<OpenStatesPersonVote[]> {
    try {
      // OpenStates v3 API endpoint: /people/{id}/votes
      const params: Record<string, string | number> = {
        per_page: Math.min(limit, 100), // API max is 100
        page,
      };

      interface V3PersonVoteResponse {
        results: Array<{
          vote_event_id: string;
          option: string;
          vote_event: {
            id: string;
            identifier: string;
            motion_text: string;
            motion_classification: string[];
            start_date: string;
            result: string;
            organization: {
              id: string;
              name: string;
              classification: string;
            };
            bill: {
              id: string;
              identifier: string;
              title: string;
            } | null;
          };
        }>;
        pagination: {
          per_page: number;
          page: number;
          max_page: number;
          total_items: number;
        };
      }

      const response = await this.makeRequest<V3PersonVoteResponse>(
        `/people/${personId}/votes`,
        params
      );

      // Transform v3 response to our interface
      return response.results.map(vote => ({
        vote_id: vote.vote_event.id,
        identifier: vote.vote_event.identifier,
        motion_text: vote.vote_event.motion_text,
        start_date: vote.vote_event.start_date,
        result: vote.vote_event.result as 'pass' | 'fail',
        option: vote.option as 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused',
        bill_identifier: vote.vote_event.bill?.identifier || null,
        bill_title: vote.vote_event.bill?.title || null,
        bill_id: vote.vote_event.bill?.id || null,
        organization_name: vote.vote_event.organization.name,
        chamber: vote.vote_event.organization.classification === 'upper' ? 'upper' : 'lower',
      }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Get a specific vote event by ID
   * @param voteId - OpenStates vote event ID
   * @returns Full vote event details including all voter positions
   */
  async getVoteById(voteId: string): Promise<OpenStatesVote | null> {
    try {
      interface V3VoteEvent {
        id: string;
        identifier: string;
        motion_text: string;
        motion_classification: string[];
        start_date: string;
        result: string;
        organization: {
          id: string;
          name: string;
          classification: string;
        };
        votes: Array<{
          option: string;
          voter_name: string;
          voter_id: string | null;
        }>;
        counts: Array<{
          option: string;
          value: number;
        }>;
        bill: {
          id: string;
          identifier: string;
          title: string;
        } | null;
        created_at: string;
        updated_at: string;
      }

      const response = await this.makeRequest<V3VoteEvent>(`/vote_events/${voteId}`);

      return {
        id: response.id,
        identifier: response.identifier,
        motion_text: response.motion_text,
        motion_classification: response.motion_classification,
        start_date: response.start_date,
        result: response.result as 'pass' | 'fail',
        organization: response.organization,
        votes: response.votes.map(v => ({
          option: v.option as 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused',
          voter_name: v.voter_name,
          voter_id: v.voter_id,
        })),
        counts: response.counts,
        bill: response.bill,
        created_at: response.created_at,
        updated_at: response.updated_at,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get committees for a specific state
   * @param state - State abbreviation (e.g., 'MI' or 'michigan')
   * @param chamber - Optional chamber filter ('upper' or 'lower')
   * @param classification - Optional classification filter ('committee' or 'subcommittee')
   * @param includeMemberships - Whether to include member rosters (default: true)
   * @returns Array of committees
   */
  async getCommittees(
    state: string,
    chamber?: 'upper' | 'lower',
    classification?: 'committee' | 'subcommittee',
    includeMemberships: boolean = true
  ): Promise<OpenStatesCommittee[]> {
    const jurisdiction = state.toLowerCase();

    let allResults: OpenStatesCommittee[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const params: Record<string, string | number> = {
        jurisdiction,
        per_page: 20, // v3 API max for committees (not 50)
        page,
      };

      if (chamber) params.chamber = chamber;
      if (classification) params.classification = classification;
      if (includeMemberships) params.include = 'memberships';

      interface CommitteeListResponse {
        results: OpenStatesCommittee[];
        pagination: {
          per_page: number;
          page: number;
          max_page: number;
          total_items: number;
        };
      }

      const response = await this.makeRequest<CommitteeListResponse>('/committees', params);
      allResults = allResults.concat(response.results);

      // Check if there are more pages
      hasMore = page < response.pagination.max_page;
      page++;
    }

    // Normalize chamber data from organization classification
    return allResults.map(committee => ({
      ...committee,
      chamber: this.normalizeCommitteeChamber(committee),
    }));
  }

  /**
   * Get a specific committee by ID
   * @param committeeId - OpenStates committee ID (e.g., 'ocd-organization/...')
   * @param includeMemberships - Whether to include member roster (default: true)
   * @returns Committee details or null if not found
   */
  async getCommitteeById(
    committeeId: string,
    includeMemberships: boolean = true
  ): Promise<OpenStatesCommittee | null> {
    try {
      const params: Record<string, string> = {};
      if (includeMemberships) {
        params.include = 'memberships';
      }

      const response = await this.makeRequest<OpenStatesCommittee>(
        `/committees/${committeeId}`,
        params
      );

      return {
        ...response,
        chamber: this.normalizeCommitteeChamber(response),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Normalize committee chamber from various sources
   * @private
   */
  private normalizeCommitteeChamber(committee: OpenStatesCommittee): 'upper' | 'lower' | null {
    // If chamber is already set, use it
    if (committee.chamber) return committee.chamber;

    // Try to infer from committee name
    const name = committee.name.toLowerCase();
    if (name.includes('senate')) return 'upper';
    if (name.includes('house') || name.includes('assembly')) return 'lower';

    // Try to infer from first membership
    if (committee.memberships && committee.memberships.length > 0) {
      const firstMember = committee.memberships[0];
      if (firstMember && firstMember.person?.current_role?.title) {
        const title = firstMember.person.current_role.title.toLowerCase();
        if (title.includes('senator')) return 'upper';
        if (title.includes('representative') || title.includes('delegate')) return 'lower';
      }
    }

    return null;
  }

  /**
   * Get legislative events (hearings, floor sessions, committee meetings)
   * @param state - State abbreviation (e.g., 'MI' or 'michigan')
   * @param startDate - Optional start date filter (ISO 8601 format: YYYY-MM-DD)
   * @param endDate - Optional end date filter (ISO 8601 format: YYYY-MM-DD)
   * @param limit - Maximum number of events to return (default 50)
   * @returns Array of legislative events
   */
  async getEvents(
    state: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ): Promise<OpenStatesEvent[]> {
    const jurisdiction = state.toLowerCase();

    let allEvents: OpenStatesEvent[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && allEvents.length < limit) {
      const params: Record<string, string | number> = {
        jurisdiction,
        per_page: Math.min(20, limit - allEvents.length), // /events API max is 20 per page
        page,
      };

      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      interface EventListResponse {
        results: OpenStatesEvent[];
        pagination: {
          per_page: number;
          page: number;
          max_page: number;
          total_items: number;
        };
      }

      const response = await this.makeRequest<EventListResponse>('/events', params);
      allEvents = allEvents.concat(response.results);

      // Check if there are more pages
      hasMore = page < response.pagination.max_page && allEvents.length < limit;
      page++;
    }

    return allEvents.slice(0, limit);
  }

  /**
   * Get a specific event by ID
   * @param eventId - OpenStates event ID (e.g., 'ocd-event/...')
   * @returns Event details or null if not found
   */
  async getEventById(eventId: string): Promise<OpenStatesEvent | null> {
    try {
      const response = await this.makeRequest<OpenStatesEvent>(`/events/${eventId}`);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get events associated with a specific bill
   * @param billId - OpenStates bill ID (e.g., 'ocd-bill/...')
   * @param limit - Maximum number of events to return (default 20)
   * @returns Array of events where this bill appears on the agenda
   */
  async getEventsByBill(billId: string, limit: number = 20): Promise<OpenStatesEvent[]> {
    // NOTE: OpenStates v3 API doesn't have a direct bill_id filter on /events
    // We need to fetch events and filter client-side for bills in the agenda
    // This is less efficient but necessary given API limitations
    // Extract jurisdiction from bill ID (format: ocd-bill/{uuid}/{state}/{session}/{identifier})
    const billIdParts = billId.split('/');
    if (billIdParts.length < 3) {
      throw new Error(`Invalid bill ID format: ${billId}`);
    }
    const state = billIdParts[2]; // Extract state from bill ID
    if (!state) {
      throw new Error(`Unable to extract state from bill ID: ${billId}`);
    }

    const allEvents = await this.getEvents(state, undefined, undefined, 100); // Fetch more to filter

    // Filter events that have this bill in their agenda
    const relevantEvents = allEvents.filter(event =>
      event.agenda.some(item =>
        item.related_entities?.some(
          entity => entity.entity_type === 'bill' && entity.entity_id === billId
        )
      )
    );

    return relevantEvents.slice(0, limit);
  }

  /**
   * Clear cache for a specific key or all cache entries
   * Useful for cache invalidation when data needs to be refreshed
   * @param key - Optional specific cache key to clear
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get current cache size (number of entries)
   * @returns Number of cached entries
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const openStatesAPI = new OpenStatesAPI();

// Export class for testing
export { OpenStatesAPI };

// Export utilities
export const OpenStatesUtils = {
  /**
   * Check if OpenStates API is configured with an API key
   */
  isConfigured(): boolean {
    return !!process.env.OPENSTATES_API_KEY;
  },
};
