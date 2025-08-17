/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates.org API Integration
 *
 * This module provides utilities for integrating with the OpenStates.org API
 * to fetch real state legislature and bill data.
 *
 * API Documentation: https://docs.openstates.org/
 */

interface OpenStatesConfig {
  apiKey?: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

// GraphQL Response Types
interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

// GraphQL Edge/Node Pattern Types
interface GraphQLEdge<T> {
  node: T;
  cursor?: string;
}

interface GraphQLConnection<T> {
  edges: GraphQLEdge<T>[];
  pageInfo?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
}

// Raw GraphQL Node Types (before transformation)
interface RawLegislatorNode {
  id: string;
  name: string;
  party?: string;
  currentMemberships?: Array<{
    organization?: {
      chamber?: string;
      name?: string;
      jurisdiction?: {
        name?: string;
      };
    };
    post?: {
      label?: string;
    };
    startDate?: string;
    endDate?: string;
  }>;
  contactDetails?: Array<{
    type: string;
    value: string;
    note?: string;
  }>;
  image?: string;
  links?: Array<{
    url: string;
    note?: string;
  }>;
  extras?: Record<string, unknown>;
}

interface RawBillNode {
  id: string;
  identifier: string;
  title: string;
  abstract?: string;
  fromOrganization?: {
    chamber?: string;
    name?: string;
  };
  classification?: string[];
  subject?: string[];
  sponsorships?: Array<{
    name: string;
    entityType: string;
    classification: string;
    primary: boolean;
  }>;
  actions?: Array<{
    date: string;
    description: string;
    organization?: {
      name?: string;
    };
    classification?: string[];
  }>;
  votes?: Array<{
    identifier: string;
    motionText: string;
    startDate: string;
    result: string;
    counts?: Array<{
      option: string;
      value: number;
    }>;
  }>;
  sources?: Array<{
    url: string;
    note?: string;
  }>;
  extras?: Record<string, unknown>;
}

interface RawJurisdictionNode {
  id: string;
  name: string;
  classification: string;
  divisionId: string;
  url: string;
  organizations?: Array<{
    name: string;
    chamber?: string;
    classification: string;
  }>;
  legislativeSessions?: Array<{
    name: string;
    startDate: string;
    endDate: string;
    active: boolean;
  }>;
}

// Response Data Types
interface LegislatorsResponse {
  people: GraphQLConnection<RawLegislatorNode>;
}

interface BillsResponse {
  bills: GraphQLConnection<RawBillNode>;
}

interface JurisdictionResponse {
  jurisdiction: RawJurisdictionNode;
}

interface OpenStatesLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  roles: Array<{
    type: string;
    chamber: string;
    district: string;
    start_date: string;
    end_date?: string;
  }>;
  links?: Array<{
    url: string;
    note?: string;
  }>;
  extras?: Record<string, unknown>;
}

interface OpenStatesBill {
  id: string;
  identifier: string;
  title: string;
  abstract?: string;
  chamber: 'upper' | 'lower';
  classification: string[];
  subject: string[];
  from_organization: string;
  sponsorships: Array<{
    name: string;
    entity_type: string;
    classification: string;
    primary: boolean;
  }>;
  actions: Array<{
    date: string;
    description: string;
    organization: string;
    classification: string[];
  }>;
  votes?: Array<{
    identifier: string;
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
    note?: string;
  }>;
  extras?: Record<string, unknown>;
}

interface OpenStatesJurisdiction {
  id: string;
  name: string;
  classification: string;
  division_id: string;
  url: string;
  chambers: Record<
    string,
    {
      name: string;
      title: string;
    }
  >;
  session?: {
    name: string;
    start_date: string;
    end_date: string;
  };
}

class OpenStatesAPI {
  private config: OpenStatesConfig;
  private cache: Map<string, { data: unknown; timestamp: number; ttl: number }>;

  constructor(config?: Partial<OpenStatesConfig>) {
    this.config = {
      apiKey: process.env.OPENSTATES_API_KEY,
      baseUrl: 'https://openstates.org/graphql',
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    this.cache = new Map();
  }

  private async makeRequest<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const cacheKey = JSON.stringify({ query, variables });
    const cached = this.cache.get(cacheKey);

    // Check cache first
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }

    const requestBody = {
      query,
      variables: variables || {},
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CivIQ-Hub/1.0',
    };

    if (this.config.apiKey) {
      headers['X-API-KEY'] = this.config.apiKey;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: GraphQLResponse<T> = await response.json();

        if (data.errors) {
          throw new Error(
            `GraphQL Error: ${data.errors.map((e: GraphQLError) => e.message).join(', ')}`
          );
        }

        // Cache successful response for 30 minutes
        this.cache.set(cacheKey, {
          data: data.data,
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000,
        });

        if (!data.data) {
          throw new Error('No data returned from GraphQL API');
        }

        return data.data;
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
   * Get legislators for a specific state
   */
  async getLegislators(
    state: string,
    chamber?: 'upper' | 'lower'
  ): Promise<OpenStatesLegislator[]> {
    const query = `
      query GetLegislators($state: String!, $chamber: String) {
        people(jurisdiction: $state, memberOf: $chamber) {
          edges {
            node {
              id
              name
              party
              currentMemberships {
                organization {
                  chamber
                  name
                }
                post {
                  label
                }
                startDate
                endDate
              }
              contactDetails {
                type
                value
                note
              }
              image
              links {
                url
                note
              }
              extras
            }
          }
        }
      }
    `;

    const variables = { state: state.toLowerCase(), chamber };
    const result = await this.makeRequest<LegislatorsResponse>(query, variables);

    return result.people.edges.map((edge: GraphQLEdge<RawLegislatorNode>) =>
      this.transformLegislator(edge.node, state)
    );
  }

  /**
   * Get bills for a specific state and session
   */
  async getBills(
    state: string,
    session?: string,
    chamber?: 'upper' | 'lower',
    subject?: string,
    limit = 50
  ): Promise<OpenStatesBill[]> {
    const query = `
      query GetBills($state: String!, $session: String, $chamber: String, $subject: String, $first: Int) {
        bills(
          jurisdiction: $state
          session: $session
          chamber: $chamber
          subject: $subject
          first: $first
        ) {
          edges {
            node {
              id
              identifier
              title
              abstract
              fromOrganization {
                chamber
                name
              }
              classification
              subject
              sponsorships {
                name
                entityType
                classification
                primary
              }
              actions {
                date
                description
                organization {
                  name
                }
                classification
              }
              votes {
                identifier
                motionText
                startDate
                result
                counts {
                  option
                  value
                }
              }
              sources {
                url
                note
              }
              extras
            }
          }
        }
      }
    `;

    const variables = {
      state: state.toLowerCase(),
      session,
      chamber,
      subject,
      first: limit,
    };

    const result = await this.makeRequest<BillsResponse>(query, variables);

    return result.bills.edges.map((edge: GraphQLEdge<RawBillNode>) =>
      this.transformBill(edge.node, state)
    );
  }

  /**
   * Get jurisdiction information for a state
   */
  async getJurisdiction(state: string): Promise<OpenStatesJurisdiction> {
    const query = `
      query GetJurisdiction($state: String!) {
        jurisdiction(name: $state) {
          id
          name
          classification
          divisionId
          url
          organizations {
            name
            chamber
            classification
          }
          legislativeSessions {
            name
            startDate
            endDate
            active
          }
        }
      }
    `;

    const result = await this.makeRequest<JurisdictionResponse>(query, {
      state: state.toLowerCase(),
    });
    return this.transformJurisdiction(result.jurisdiction);
  }

  /**
   * Search for legislators by name
   */
  async searchLegislators(name: string, state?: string): Promise<OpenStatesLegislator[]> {
    const query = `
      query SearchLegislators($name: String!, $state: String) {
        people(name: $name, jurisdiction: $state) {
          edges {
            node {
              id
              name
              party
              currentMemberships {
                organization {
                  chamber
                  name
                  jurisdiction {
                    name
                  }
                }
                post {
                  label
                }
              }
              contactDetails {
                type
                value
              }
              image
            }
          }
        }
      }
    `;

    const result = await this.makeRequest<LegislatorsResponse>(query, {
      name,
      state: state?.toLowerCase(),
    });
    return result.people.edges.map((edge: GraphQLEdge<RawLegislatorNode>) =>
      this.transformLegislator(edge.node, state || 'unknown')
    );
  }

  private transformLegislator(node: RawLegislatorNode, state: string): OpenStatesLegislator {
    const membership = node.currentMemberships?.[0];
    const contactDetails = node.contactDetails || [];

    const email = contactDetails.find(c => c.type === 'email')?.value;
    const phone = contactDetails.find(c => c.type === 'voice')?.value;

    return {
      id: node.id,
      name: node.name,
      party: node.party || 'Unknown',
      chamber: (membership?.organization?.chamber as 'upper' | 'lower') || 'upper',
      district: membership?.post?.label || 'Unknown',
      state: state.toUpperCase(),
      email,
      phone,
      photo_url: node.image,
      roles:
        node.currentMemberships?.map(m => ({
          type: 'legislator',
          chamber: m.organization?.chamber || 'unknown',
          district: m.post?.label || 'unknown',
          start_date: m.startDate || '',
          end_date: m.endDate,
        })) || [],
      links: node.links || [],
      extras: node.extras || {},
    };
  }

  private transformBill(node: RawBillNode, _state: string): OpenStatesBill {
    return {
      id: node.id,
      identifier: node.identifier,
      title: node.title,
      abstract: node.abstract,
      chamber: (node.fromOrganization?.chamber as 'upper' | 'lower') || 'upper',
      classification: node.classification || [],
      subject: node.subject || [],
      from_organization: node.fromOrganization?.name || 'Unknown',
      sponsorships:
        node.sponsorships?.map(s => ({
          name: s.name,
          entity_type: s.entityType,
          classification: s.classification,
          primary: s.primary,
        })) || [],
      actions:
        node.actions?.map(a => ({
          date: a.date,
          description: a.description,
          organization: a.organization?.name || 'Unknown',
          classification: a.classification || [],
        })) || [],
      votes:
        node.votes?.map(v => ({
          identifier: v.identifier,
          motion_text: v.motionText,
          start_date: v.startDate,
          result: v.result,
          counts: v.counts || [],
        })) || [],
      sources: node.sources || [],
      extras: node.extras || {},
    };
  }

  private transformJurisdiction(node: RawJurisdictionNode): OpenStatesJurisdiction {
    const chambers: Record<string, { name: string; title: string }> = {};

    node.organizations?.forEach(org => {
      if (org.chamber) {
        chambers[org.chamber] = {
          name: org.name,
          title: org.chamber === 'upper' ? 'Senator' : 'Representative',
        };
      }
    });

    const currentSession = node.legislativeSessions?.find(s => s.active);

    return {
      id: node.id,
      name: node.name,
      classification: node.classification,
      division_id: node.divisionId,
      url: node.url,
      chambers,
      session: currentSession
        ? {
            name: currentSession.name,
            start_date: currentSession.startDate,
            end_date: currentSession.endDate,
          }
        : undefined,
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Default instance
export const openStatesAPI = new OpenStatesAPI();

// Export types
export type { OpenStatesLegislator, OpenStatesBill, OpenStatesJurisdiction, OpenStatesConfig };

// Export class for custom instances
export { OpenStatesAPI };

/**
 * Utility functions for working with OpenStates data
 */
export const OpenStatesUtils = {
  /**
   * Check if OpenStates API is configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENSTATES_API_KEY;
  },

  /**
   * Get state abbreviation from full name
   */
  getStateAbbreviation(stateName: string): string | null {
    const stateMap: Record<string, string> = {
      alabama: 'AL',
      alaska: 'AK',
      arizona: 'AZ',
      arkansas: 'AR',
      california: 'CA',
      colorado: 'CO',
      connecticut: 'CT',
      delaware: 'DE',
      florida: 'FL',
      georgia: 'GA',
      hawaii: 'HI',
      idaho: 'ID',
      illinois: 'IL',
      indiana: 'IN',
      iowa: 'IA',
      kansas: 'KS',
      kentucky: 'KY',
      louisiana: 'LA',
      maine: 'ME',
      maryland: 'MD',
      massachusetts: 'MA',
      michigan: 'MI',
      minnesota: 'MN',
      mississippi: 'MS',
      missouri: 'MO',
      montana: 'MT',
      nebraska: 'NE',
      nevada: 'NV',
      'new hampshire': 'NH',
      'new jersey': 'NJ',
      'new mexico': 'NM',
      'new york': 'NY',
      'north carolina': 'NC',
      'north dakota': 'ND',
      ohio: 'OH',
      oklahoma: 'OK',
      oregon: 'OR',
      pennsylvania: 'PA',
      'rhode island': 'RI',
      'south carolina': 'SC',
      'south dakota': 'SD',
      tennessee: 'TN',
      texas: 'TX',
      utah: 'UT',
      vermont: 'VT',
      virginia: 'VA',
      washington: 'WA',
      'west virginia': 'WV',
      wisconsin: 'WI',
      wyoming: 'WY',
    };

    return stateMap[stateName.toLowerCase()] || null;
  },

  /**
   * Format bill identifier for display
   */
  formatBillIdentifier(identifier: string): string {
    return identifier.toUpperCase().replace(/([A-Z]+)(\d+)/, '$1 $2');
  },

  /**
   * Get party color for UI display
   */
  getPartyColor(party: string): string {
    switch (party.toLowerCase()) {
      case 'democratic':
        return '#3B82F6'; // Blue
      case 'republican':
        return '#EF4444'; // Red
      case 'independent':
        return '#8B5CF6'; // Purple
      default:
        return '#6B7280'; // Gray
    }
  },
};
