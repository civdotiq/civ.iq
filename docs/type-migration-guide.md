# Type System Migration Guide

## Overview

This document guides the migration from the current fragmented type system to a unified, consistent type architecture for civic-intel-hub. Based on the analysis from Step 1.2, this migration consolidates:

- **3 competing RepresentativeResponse types** → 1 unified `UnifiedRepresentativeResponse`
- **5 different service patterns** → standardized service interfaces
- **15+ scattered response interfaces** → consistent API response wrappers

## Executive Summary

### Current State Analysis (Step 1.2 Findings)

**Fragmented Types:**
1. `RepresentativeResponse` (v1) from `src/types/representative.ts`
2. `RepresentativeResponseV2` from `src/types/representative.ts`  
3. `RepresentativeApiResponse` from `src/types/representative.ts`
4. `Representative` from `src/types/models/Representative.ts`
5. `RepresentativeDetailResponse` from `src/types/api/representatives.types.ts`

**Service Pattern Chaos:**
1. Direct API calls in components
2. Utility functions without interfaces
3. Service classes with different contracts
4. Hook-based data fetching
5. Context-based state management

## Migration Strategy

### Phase 1: Type System Consolidation

#### Old → New Type Mappings

| Old Type | Source File | New Type | Status |
|----------|-------------|----------|---------|
| `RepresentativeResponse` (v1) | `src/types/representative.ts` | `UnifiedRepresentativeResponse` | ⏳ To Migrate |
| `RepresentativeResponseV2` | `src/types/representative.ts` | `UnifiedRepresentativeResponse` | ⏳ To Migrate |
| `RepresentativeApiResponse` | `src/types/representative.ts` | `UnifiedRepresentativeResponse` | ⏳ To Migrate |
| `Representative` | `src/types/models/Representative.ts` | `UnifiedRepresentative` | ⏳ To Migrate |
| `RepresentativeDetailResponse` | `src/types/api/representatives.types.ts` | `UnifiedRepresentativeResponse` | ⏳ To Migrate |
| Various response wrappers | Multiple files | `ApiResponse<T>`, `ListApiResponse<T>`, `PaginatedApiResponse<T>` | ⏳ To Migrate |

#### Field Normalization

**Chamber Field Standardization:**
```typescript
// OLD (inconsistent)
chamber: "house" | "senate" | "House" | "Senate" | "rep" | "sen"

// NEW (standardized)  
chamber: "House" | "Senate"
```

**Party Field Standardization:**
```typescript
// OLD (inconsistent)
party: "D" | "R" | "I" | "Democratic" | "Republican" | "Independent"

// NEW (standardized)
party: "Democratic" | "Republican" | "Independent"
```

**Contact Information Consolidation:**
```typescript
// OLD (scattered across 3+ different formats)
contactInfo?: {
  phone?: string;
  website?: string;
  // Sometimes missing office, address, email
}

// NEW (comprehensive)
contactInfo: {
  phone?: string;
  website?: string;
  office?: string;
  address?: string;
  email?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
  };
}
```

### Implementation Steps

#### Step 1: Create Unified Type Definitions

**File:** `src/types/core/unified-types.ts`

```typescript
/**
 * Unified Representative Response
 * Consolidates 3 competing RepresentativeResponse types
 */
export interface UnifiedRepresentativeResponse {
  bioguideId: string;           // Primary key across all systems
  name: string;                 // Full name
  firstName?: string;           // Optional for backwards compatibility
  lastName?: string;            // Optional for backwards compatibility
  party: 'Democratic' | 'Republican' | 'Independent'; // Standardized values
  state: string;                // Two-letter state code
  chamber: 'House' | 'Senate';  // Standardized casing
  district: number | null;      // null for Senate
  title: string;                // "Senator" | "Representative"
  
  contactInfo: {
    phone?: string;
    website?: string;
    office?: string;
    address?: string;
    email?: string;
    socialMedia?: {
      twitter?: string;
      facebook?: string;
    };
  };
  
  // Extended information (merged from all sources)
  committees?: Array<{
    name: string;
    role: 'Chair' | 'Ranking Member' | 'Member';
  }>;
  
  // Metadata
  lastUpdated?: string;
  dataSource?: 'congress.gov' | 'house.gov' | 'senate.gov';
}

/**
 * Generic API Response Wrapper
 * Replaces 15+ scattered response interfaces
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
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

/**
 * List API Response
 * For endpoints returning arrays
 */
export interface ListApiResponse<T> extends ApiResponse<T[]> {
  total: number;
}

/**
 * Paginated API Response
 * For endpoints with pagination
 */
export interface PaginatedApiResponse<T> extends ListApiResponse<T> {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
```

#### Step 2: Create Migration Helpers

**File:** `src/types/core/migration-helpers.ts`

```typescript
export class RepresentativeMigrationHelper {
  /**
   * Converts legacy representative data to unified format
   */
  static fromLegacyRepresentative(data: any): UnifiedRepresentativeResponse {
    return {
      bioguideId: data.bioguideId,
      name: data.name,
      firstName: data.firstName,
      lastName: data.lastName,
      party: this.normalizeParty(data.party),
      state: data.state,
      chamber: this.normalizeChamber(data.chamber),
      district: data.district,
      title: data.title,
      contactInfo: this.normalizeContactInfo(data),
      committees: data.committees,
      lastUpdated: data.lastUpdated,
      dataSource: data.dataSource || 'congress.gov',
    };
  }
  
  static normalizeParty(party: string): 'Democratic' | 'Republican' | 'Independent' {
    const partyMap: Record<string, 'Democratic' | 'Republican' | 'Independent'> = {
      'D': 'Democratic',
      'Democratic': 'Democratic',
      'R': 'Republican', 
      'Republican': 'Republican',
      'I': 'Independent',
      'Independent': 'Independent',
    };
    return partyMap[party] || 'Independent';
  }
  
  static normalizeChamber(chamber: string): 'House' | 'Senate' {
    const lowerChamber = chamber.toLowerCase();
    if (lowerChamber.includes('house') || lowerChamber === 'rep') {
      return 'House';
    }
    return 'Senate';
  }
  
  private static normalizeContactInfo(data: any): UnifiedRepresentativeResponse['contactInfo'] {
    return {
      phone: data.phone || data.contactInfo?.phone,
      website: data.website || data.contactInfo?.website,
      office: data.office || data.contactInfo?.office,
      address: data.address || data.contactInfo?.address,
      email: data.email || data.contactInfo?.email,
      socialMedia: {
        twitter: data.socialMedia?.twitter || data.twitter,
        facebook: data.socialMedia?.facebook || data.facebook,
      },
    };
  }
}
```

#### Step 3: Create Service Interfaces

**File:** `src/types/core/service-interfaces.ts`

```typescript
/**
 * Standard service interface for all representative services
 * Consolidates 5 different service patterns
 */
export interface IRepresentativeService {
  getRepresentative(bioguideId: string): Promise<ApiResponse<UnifiedRepresentativeResponse>>;
  getAllRepresentatives(): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  getRepresentativesByState(state: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
  searchRepresentatives(query: string): Promise<ListApiResponse<UnifiedRepresentativeResponse>>;
}

/**
 * Base service interface for all API services
 */
export interface IApiService {
  healthCheck(): Promise<ApiResponse<{
    status: 'healthy' | 'degraded' | 'down';
    timestamp: string;
    services: Record<string, 'up' | 'down'>;
  }>>;
  getServiceInfo(): {
    name: string;
    version: string;
    description: string;
  };
}

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  cacheEnabled: boolean;
  cacheTtl: number;
  rateLimitEnabled: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number;
}
```

#### Step 4: Create Backwards Compatibility Adapters

**File:** `src/types/core/compatibility-adapters.ts`

```typescript
export class LegacyTypeAdapter {
  /**
   * Converts unified type back to legacy RepresentativeResponse format
   * For backwards compatibility during migration
   */
  static toLegacyRepresentativeResponse(
    unified: UnifiedRepresentativeResponse
  ): any {
    return {
      bioguideId: unified.bioguideId,
      name: unified.name,
      party: unified.party === 'Democratic' ? 'D' : 
             unified.party === 'Republican' ? 'R' : 'I',
      state: unified.state,
      chamber: unified.chamber.toLowerCase(),
      district: unified.district,
      title: unified.title,
      phone: unified.contactInfo.phone,
      website: unified.contactInfo.website,
    };
  }
  
  /**
   * Converts unified API response to legacy format
   */
  static toLegacyApiResponse<T>(
    unified: ApiResponse<T>
  ): any {
    return {
      data: unified.data,
      success: unified.success,
      error: unified.error,
      timestamp: unified.metadata.timestamp,
    };
  }
}
```

### Breaking Changes

#### High Impact Changes
1. **Chamber field casing**: `"house"/"senate"` → `"House"/"Senate"`
2. **Party field expansion**: `"D"/"R"/"I"` → `"Democratic"/"Republican"/"Independent"`
3. **Contact info structure**: Flat properties → nested `contactInfo` object
4. **Response wrapper**: Various formats → standardized `ApiResponse<T>`

#### Medium Impact Changes
1. **BioguideId consistency**: Some services use different primary keys
2. **Committee data structure**: Inconsistent committee formats
3. **Service method signatures**: Different parameter and return types

#### Low Impact Changes
1. **Optional field additions**: New optional fields won't break existing code
2. **Metadata additions**: New metadata fields are optional

### Migration Steps for Developers

#### Step 1: Install Migration Tools

```bash
# 1. Ensure unified types are available
npm run type-check

# 2. Run migration helper
npm run migrate:types --dry-run
```

#### Step 2: Update Imports

**Before:**
```typescript
import { RepresentativeResponse } from '@/types/representative';
import { Representative } from '@/types/models/Representative';
```

**After:**
```typescript
import { UnifiedRepresentativeResponse, ApiResponse } from '@/types/core/unified-types';
```

#### Step 3: Update Component Props

**Before:**
```typescript
interface Props {
  representative: RepresentativeResponse;
}
```

**After:**
```typescript
interface Props {
  representative: UnifiedRepresentativeResponse;
}
```

#### Step 4: Update API Calls

**Before:**
```typescript
const response = await fetch(`/api/representative/${id}`);
const data = await response.json();
```

**After:**
```typescript
const response = await fetch(`/api/representative/${id}`);
const data: ApiResponse<UnifiedRepresentativeResponse> = await response.json();
```

#### Step 5: Handle Field Changes

**Before:**
```typescript
const partyColor = rep.party === 'D' ? 'blue' : 'red';
```

**After:**
```typescript
const partyColor = rep.party === 'Democratic' ? 'blue' : 'red';
```

### Testing Migration

#### Validation Checklist

- [ ] All imports updated to use unified types
- [ ] Field mappings applied (chamber, party, contactInfo)  
- [ ] API responses wrapped in `ApiResponse<T>`
- [ ] Service interfaces implemented consistently
- [ ] Backwards compatibility adapters working
- [ ] Type guards validate data correctly
- [ ] Error handling standardized

#### Migration Test Commands

```bash
# Run type migration tests
npm run test:migration

# Check for breaking changes
npm run validate:migration

# Run full test suite
npm test

# TypeScript compilation
npm run type-check
```

### Post-Migration Cleanup

#### Files to Remove (After Migration Complete)

1. `src/types/representative.ts` (legacy versions)
2. `src/types/api/representatives.types.ts` (replaced by unified types)
3. Old service implementations without interfaces
4. Backwards compatibility adapters (after 6 months)

#### Files to Update

1. All component files using representative types
2. All API route handlers
3. All service implementations
4. All test files
5. Documentation

### Migration Timeline

#### Phase 1: Foundation (Week 1-2)
- [ ] Create unified type definitions
- [ ] Create migration helpers
- [ ] Create backwards compatibility adapters
- [ ] Update tests to use new types

#### Phase 2: Core Services (Week 3-4)  
- [ ] Migrate 5 service patterns to unified interfaces
- [ ] Update API endpoints to use unified responses
- [ ] Update data fetching hooks

#### Phase 3: Components (Week 5-6)
- [ ] Update all components to use unified types
- [ ] Update props and state management
- [ ] Fix any runtime issues

#### Phase 4: Cleanup (Week 7-8)
- [ ] Remove legacy type definitions
- [ ] Remove backwards compatibility code
- [ ] Update documentation
- [ ] Performance optimization

### Risk Mitigation

#### Rollback Plan
1. Keep legacy adapters for 6 months minimum
2. Feature flags for gradual rollout
3. Comprehensive test coverage
4. Monitoring for runtime errors

#### Compatibility Guarantees
1. External APIs remain unchanged during migration
2. Database schema unaffected
3. Component props backwards compatible via adapters
4. Service method signatures maintained via wrappers

---

## Quick Reference

### Essential Migration Commands

```bash
# Start migration
npm run migrate:start

# Check progress  
npm run migrate:status

# Validate changes
npm run migrate:validate

# Complete migration
npm run migrate:complete
```

### Emergency Rollback

```bash
# Revert to legacy types
npm run migrate:rollback

# Restore previous version
git checkout migration-start-point
```

---

**Next Steps:** Proceed to Step 1.4 (Service Layer Interface Standardization) once type migration is complete.