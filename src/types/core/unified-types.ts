/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * TDD Stub Implementation: Unified Type System
 *
 * STATUS: STUB IMPLEMENTATION - TESTS SHOULD FAIL
 * These are minimal stubs to allow TypeScript compilation.
 * Real implementation will be done after tests are written.
 */

// UNIFIED CORE TYPES - Target for consolidating 3 competing RepresentativeResponse types
// Import types for internal use
import type {
  UnifiedRepresentative,
  UnifiedRepresentativeResponse,
  UnifiedRepresentativeSummary,
} from '../unified/representative';
import { isUnifiedRepresentative, isUnifiedRepresentativeSummary } from '../unified/representative';

// Re-export for external use
export type { UnifiedRepresentative, UnifiedRepresentativeResponse, UnifiedRepresentativeSummary };
export { isUnifiedRepresentative, isUnifiedRepresentativeSummary };

// UNIFIED API RESPONSES - Target for consolidating 15+ scattered response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
    timestamp: string;
  };
  metadata: {
    timestamp: string;
    processingTime: number;
    cacheHit: boolean;
    dataSource: string;
  };
}

export interface ListApiResponse<T> extends ApiResponse<T[]> {
  total: number;
}

export interface PaginatedApiResponse<T> extends ListApiResponse<T> {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface BatchApiResponse<T> extends ApiResponse<Record<string, T>> {
  // Will be expanded during implementation - placeholder to avoid empty interface
  _placeholder?: never;
}

// SERVICE CONTRACTS - Target for defining interfaces for 5 different service patterns
export interface IRepresentativeService {
  getRepresentative(bioguideId: string): Promise<ApiResponse<UnifiedRepresentativeResponse>>;
  getAllRepresentatives(): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  getRepresentativesByState(state: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  searchRepresentatives(query: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
}

export interface IApiService {
  healthCheck(): Promise<
    ApiResponse<{
      status: string;
      timestamp: string;
      services: Record<string, string>;
    }>
  >;
  getServiceInfo(): {
    name: string;
    version: string;
    description: string;
  };
}

export interface ServiceConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}

// TYPE GUARDS & MIGRATION HELPERS - Production implementations
export class TypeValidator {
  isValidUnifiedRepresentative(data: unknown): data is UnifiedRepresentativeResponse {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check required fields
    return (
      typeof obj.bioguideId === 'string' &&
      obj.bioguideId.length > 0 &&
      typeof obj.name === 'string' &&
      obj.name.length > 0 &&
      typeof obj.party === 'string' &&
      typeof obj.state === 'string' &&
      typeof obj.chamber === 'string' &&
      (obj.chamber === 'House' ||
        obj.chamber === 'Senate' ||
        obj.chamber === 'house' ||
        obj.chamber === 'senate') &&
      typeof obj.title === 'string'
    );
  }

  validateUnifiedRepresentative(data: unknown): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      return { isValid: false, errors: ['Data must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    // Validate required fields
    if (typeof obj.bioguideId !== 'string' || obj.bioguideId.length === 0) {
      errors.push('bioguideId is required');
    }

    if (typeof obj.name !== 'string' || obj.name.length === 0) {
      errors.push('name is required');
    }

    if (typeof obj.party !== 'string') {
      errors.push('party is required');
    }

    if (typeof obj.state !== 'string') {
      errors.push('state is required');
    }

    if (typeof obj.title !== 'string') {
      errors.push('title is required');
    }

    if (typeof obj.chamber !== 'string') {
      errors.push('chamber is required');
    } else if (
      obj.chamber !== 'House' &&
      obj.chamber !== 'Senate' &&
      obj.chamber !== 'house' &&
      obj.chamber !== 'senate'
    ) {
      errors.push('chamber must be "House", "Senate", "house", or "senate"');
    }

    // Validate optional fields if present
    if (obj.district !== undefined && obj.district !== null && typeof obj.district !== 'string') {
      errors.push('district must be a string or null');
    }

    if (obj.phone !== undefined && typeof obj.phone !== 'string') {
      errors.push('phone must be a string if provided');
    }

    if (obj.email !== undefined && typeof obj.email !== 'string') {
      errors.push('email must be a string if provided');
    }

    if (obj.website !== undefined && typeof obj.website !== 'string') {
      errors.push('website must be a string if provided');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export class RepresentativeMigrationHelper {
  fromLegacyRepresentative(data: unknown): UnifiedRepresentativeResponse {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid data: must be an object');
    }

    const obj = data as Record<string, unknown>;

    // Create base unified representative from any legacy format
    const unified: UnifiedRepresentativeResponse = {
      bioguideId: this.extractBioguideId(obj),
      name: this.extractName(obj),
      party: this.normalizeParty(this.extractParty(obj)),
      state: this.extractState(obj),
      chamber: this.normalizeChamber(this.extractChamber(obj)),
      title: this.extractTitle(obj),
      district: this.extractDistrict(obj),
    };

    // Add optional fields if present
    this.addOptionalFields(unified, obj);

    return unified;
  }

  normalizeChamber(chamber: string): 'House' | 'Senate' {
    const normalized = chamber.toLowerCase().trim();

    if (normalized === 'house' || normalized === 'rep' || normalized === 'representative') {
      return 'House';
    }

    if (normalized === 'senate' || normalized === 'sen' || normalized === 'senator') {
      return 'Senate';
    }

    // Default to proper case if already correct
    if (chamber === 'House' || chamber === 'Senate') {
      return chamber as 'House' | 'Senate';
    }

    throw new Error(`Invalid chamber value: ${chamber}`);
  }

  normalizeParty(party: string): string {
    const normalized = party.toLowerCase().trim();

    // Normalize common party abbreviations
    const partyMap: Record<string, string> = {
      d: 'Democratic',
      dem: 'Democratic',
      democrat: 'Democratic',
      democratic: 'Democratic',
      r: 'Republican',
      rep: 'Republican',
      republican: 'Republican',
      i: 'Independent',
      ind: 'Independent',
      independent: 'Independent',
      l: 'Libertarian',
      lib: 'Libertarian',
      libertarian: 'Libertarian',
      g: 'Green',
      green: 'Green',
    };

    return partyMap[normalized] || party; // Return original if no mapping found
  }

  private extractBioguideId(obj: Record<string, unknown>): string {
    const bioguideId = obj.bioguideId || obj.bioguide_id || obj.id;
    if (typeof bioguideId !== 'string' || bioguideId.length === 0) {
      throw new Error('Missing or invalid bioguideId');
    }
    return bioguideId;
  }

  private extractName(obj: Record<string, unknown>): string {
    // Handle various name formats
    if (typeof obj.name === 'string' && obj.name.length > 0) {
      return obj.name;
    }

    // Handle structured names
    const nameObj = obj.name as Record<string, unknown>;
    if (nameObj && typeof nameObj === 'object') {
      if (typeof nameObj.official_full === 'string') {
        return nameObj.official_full;
      }
      if (typeof nameObj.first === 'string' && typeof nameObj.last === 'string') {
        return `${nameObj.first} ${nameObj.last}`;
      }
    }

    // Handle fullName object
    const fullNameObj = obj.fullName as Record<string, unknown>;
    if (fullNameObj && typeof fullNameObj === 'object') {
      if (typeof fullNameObj.official === 'string') {
        return fullNameObj.official;
      }
      if (typeof fullNameObj.first === 'string' && typeof fullNameObj.last === 'string') {
        return `${fullNameObj.first} ${fullNameObj.last}`;
      }
    }

    // Fallback to firstName + lastName
    if (typeof obj.firstName === 'string' && typeof obj.lastName === 'string') {
      return `${obj.firstName} ${obj.lastName}`;
    }

    throw new Error('Missing or invalid name');
  }

  private extractParty(obj: Record<string, unknown>): string {
    const party = obj.party;
    if (typeof party !== 'string' || party.length === 0) {
      throw new Error('Missing or invalid party');
    }
    return party;
  }

  private extractState(obj: Record<string, unknown>): string {
    const state = obj.state;
    if (typeof state !== 'string' || state.length === 0) {
      throw new Error('Missing or invalid state');
    }
    return state;
  }

  private extractChamber(obj: Record<string, unknown>): string {
    const chamber = obj.chamber;
    if (typeof chamber !== 'string' || chamber.length === 0) {
      throw new Error('Missing or invalid chamber');
    }
    return chamber;
  }

  private extractTitle(obj: Record<string, unknown>): string {
    const title = obj.title;
    if (typeof title === 'string' && title.length > 0) {
      return title;
    }

    // Fallback: generate title based on chamber
    const chamber = this.extractChamber(obj);
    const normalizedChamber = this.normalizeChamber(chamber);

    if (normalizedChamber === 'House') {
      return 'Representative';
    } else if (normalizedChamber === 'Senate') {
      return 'Senator';
    }

    return 'Member of Congress'; // Final fallback
  }

  private extractDistrict(obj: Record<string, unknown>): string | null {
    const district = obj.district;
    if (district === null || district === undefined) {
      return null;
    }
    if (typeof district === 'string') {
      return district;
    }
    return String(district);
  }

  private addOptionalFields(
    unified: UnifiedRepresentativeResponse,
    obj: Record<string, unknown>
  ): void {
    // Add contact information
    if (obj.phone && typeof obj.phone === 'string') {
      unified.phone = obj.phone;
    }
    if (obj.email && typeof obj.email === 'string') {
      unified.email = obj.email;
    }
    if (obj.website && typeof obj.website === 'string') {
      unified.website = obj.website;
    }

    // Add image URLs
    if (obj.imageUrl && typeof obj.imageUrl === 'string') {
      unified.imageUrl = obj.imageUrl;
    }
    if (obj.photo_url && typeof obj.photo_url === 'string') {
      unified.photo_url = obj.photo_url;
    }

    // Add contact objects
    if (obj.contact && typeof obj.contact === 'object' && obj.contact !== null) {
      unified.contact = obj.contact as UnifiedRepresentative['contact'];
    }
    if (obj.contactInfo && typeof obj.contactInfo === 'object' && obj.contactInfo !== null) {
      unified.contactInfo = obj.contactInfo as UnifiedRepresentative['contactInfo'];
    }

    // Add structured names
    if (
      obj.structuredName &&
      typeof obj.structuredName === 'object' &&
      obj.structuredName !== null
    ) {
      unified.structuredName = obj.structuredName as UnifiedRepresentative['structuredName'];
    }
    if (obj.fullName && typeof obj.fullName === 'object' && obj.fullName !== null) {
      unified.fullName = obj.fullName as UnifiedRepresentative['fullName'];
    }

    // Add other optional fields
    if (obj.committees && Array.isArray(obj.committees)) {
      unified.committees = obj.committees;
    }
    if (obj.terms && Array.isArray(obj.terms)) {
      unified.terms = obj.terms;
    }
    if (obj.enhancedTerms && Array.isArray(obj.enhancedTerms)) {
      unified.enhancedTerms = obj.enhancedTerms;
    }
    if (obj.currentTerm && typeof obj.currentTerm === 'object' && obj.currentTerm !== null) {
      unified.currentTerm = obj.currentTerm as UnifiedRepresentative['currentTerm'];
    }
  }
}

// BACKWARDS COMPATIBILITY - Production implementations for legacy type adapters
export class LegacyTypeAdapter {
  toLegacyRepresentativeResponse(data: UnifiedRepresentativeResponse): unknown {
    // Convert to src/types/representative.ts RepresentativeResponse format
    // Tests expect the representative data directly at root level
    return {
      // Core fields
      bioguideId: data.bioguideId,
      name: data.name,
      firstName: data.firstName || this.extractFirstName(data.name),
      lastName: data.lastName || this.extractLastName(data.name),
      party: data.party,
      state: data.state,
      district: data.district,
      chamber: data.chamber,
      title: data.title,
      phone: data.phone,
      email: data.email,
      website: data.website,
      imageUrl: data.imageUrl,

      // Enhanced fields
      fullName: data.fullName,
      bio: data.bio,
      currentTerm: data.currentTerm,
      socialMedia: data.socialMedia,
      ids: data.ids,
      leadershipRoles: data.leadershipRoles,
      contact: data.enhancedContact,
      metadata: data.metadata,
      terms: data.terms,
      committees: data.committees,
      isHistorical: data.isHistorical,
    };
  }

  toLegacyModelRepresentative(data: UnifiedRepresentativeResponse): unknown {
    // Convert to src/types/models/Representative.ts Representative format
    return {
      id: data.bioguideId,
      bioguideId: data.bioguideId,
      name: data.structuredName || {
        first: data.firstName || this.extractFirstName(data.name),
        last: data.lastName || this.extractLastName(data.name),
        official_full: data.name,
        nickname: data.fullName?.nickname,
        suffix: data.fullName?.suffix,
      },
      state: data.state,
      district: data.district,
      party: data.party,
      chamber: data.chamber.toLowerCase(), // models use lowercase
      title: data.title,
      photo_url: data.photo_url || data.imageUrl,
      contact: data.contact || {
        phone: data.phone,
        website: data.website,
        email: data.email,
        office: data.contactInfo?.office,
        address: data.contactInfo?.office,
      },
      // Add contactInfo property that tests expect
      contactInfo: data.contactInfo || {
        phone: data.phone || '',
        website: data.website || '',
        office: '',
      },
      terms: data.enhancedTerms,
      currentTerm: data.currentTerm,
      social: data.social || data.socialMedia,
      biographical: data.biographical || data.bio,
    };
  }

  toLegacyApiResponse(data: ApiResponse<UnifiedRepresentativeResponse>): unknown {
    // Convert to src/types/api/representatives.types.ts RepresentativeDetailResponse format
    if (!data.data) {
      return {
        success: data.success,
        error: data.error,
        metadata: data.metadata,
      };
    }

    return {
      success: data.success,
      data: this.toLegacyModelRepresentative(data.data),
      error: data.error,
      metadata: {
        ...data.metadata,
        bioguideId: data.data.bioguideId,
        lastUpdated: data.data.metadata?.lastUpdated,
      },
    };
  }

  private extractFirstName(fullName: string): string {
    return fullName.split(' ')[0] || '';
  }

  private extractLastName(fullName: string): string {
    const parts = fullName.split(' ');
    return parts[parts.length - 1] || '';
  }
}
