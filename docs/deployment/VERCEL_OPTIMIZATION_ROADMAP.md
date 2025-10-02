# Vercel Deployment Optimization Roadmap

**Generated**: 2025-10-01
**Status**: Implementation Ready
**Estimated Total Time**: 30-40 hours over 2-3 weeks

## 📋 Overview

This roadmap provides step-by-step implementation tasks to optimize civic-intel-hub for production deployment on Vercel. Tasks are organized by priority and include time estimates, validation steps, and rollback strategies.

---

## 🔴 PHASE 1: Critical Pre-Deployment (4-6 hours)

**Goal**: Make app deployment-safe and prevent timeouts
**Timeline**: Complete before initial deployment

### Task 1.1: Create Vercel Configuration File

**Priority**: CRITICAL
**Time**: 30 minutes
**Files**: Create `vercel.json`

#### Implementation

```json
{
  "version": 2,
  "functions": {
    "src/app/api/representative/[bioguideId]/votes/route.ts": {
      "maxDuration": 30,
      "memory": 1024
    },
    "src/app/api/representative/[bioguideId]/news/route.ts": {
      "maxDuration": 20,
      "memory": 1024
    },
    "src/app/api/districts/all/route.ts": {
      "maxDuration": 15,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300, stale-while-revalidate=600"
        }
      ]
    }
  ],
  "redirects": [],
  "rewrites": []
}
```

#### Validation

```bash
# Test configuration is valid
npx vercel --prod --dry-run

# Check timeout configuration
cat vercel.json | jq '.functions'
```

#### Success Criteria

- ✅ `vercel.json` created with timeout configs
- ✅ Heavy API routes have 15-30s maxDuration
- ✅ Cache headers configured for API routes
- ✅ Configuration validates with `vercel` CLI

---

### Task 1.2: Remove Unused Dependencies

**Priority**: CRITICAL
**Time**: 1 hour
**Files**: `package.json`, `package-lock.json`

#### Implementation

```bash
# Remove unused production dependencies
npm uninstall @redis/client autoprefixer critters lru-cache react-window-infinite-loader

# Remove unused dev dependencies
npm uninstall -D audit-ci bcryptjs jest-environment-jsdom npm-audit-resolver papaparse terser-webpack-plugin

# Install missing dev dependency
npm install --save-dev @next/bundle-analyzer

# Verify no broken imports
npm run type-check

# Update lockfile
npm ci
```

#### Validation

```bash
# Run full validation suite
npm run validate:all

# Check for unused dependencies again
npx depcheck

# Verify bundle size improvement
npm run build 2>&1 | grep "First Load JS"
```

#### Rollback Strategy

```bash
# If issues occur
git checkout package.json package-lock.json
npm ci
```

#### Success Criteria

- ✅ 11 packages removed (~100 MB savings)
- ✅ `@next/bundle-analyzer` installed
- ✅ All tests pass (`npm test`)
- ✅ No TypeScript errors (`npm run type-check`)
- ✅ Build succeeds (`npm run build`)

---

### Task 1.3: Optimize Vote Enrichment Caching

**Priority**: CRITICAL
**Time**: 1 hour
**Files**: `src/app/api/representative/[bioguideId]/votes/route.ts`

#### Implementation

**Current** (lines 561-767):

```typescript
// 15-minute cache for enriched votes
const cacheKey = `votes-enriched:${bioguideId}:${limit}`;
await unifiedCache.set(cacheKey, enrichedVotes, {
  dataType: 'votes',
  ttl: 15 * 60 * 1000, // 15 minutes
});
```

**Optimized**:

```typescript
// 24-hour cache - votes don't change once cast
const cacheKey = `votes-enriched:${bioguideId}:${limit}`;
await unifiedCache.set(cacheKey, enrichedVotes, {
  dataType: 'votes',
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});
```

#### Additional Changes

Add maxDuration export at top of file:

```typescript
// At top of route.ts
export const maxDuration = 30; // Vercel Pro plan max
export const dynamic = 'force-dynamic';
```

#### Validation

```bash
# Start dev server
npm run dev

# Test vote endpoint (should be slow first time, fast second time)
time curl http://localhost:3000/api/representative/K000367/votes

# Wait 1 second and test again (should use cache)
sleep 1
time curl http://localhost:3000/api/representative/K000367/votes

# Verify cache hit
curl http://localhost:3000/api/cache/status | jq '.redis'
```

#### Success Criteria

- ✅ Cache TTL changed to 24 hours
- ✅ `maxDuration: 30` export added
- ✅ First request: 8-10s (normal)
- ✅ Second request: <500ms (cached)
- ✅ Cache hit rate increases in monitoring

---

### Task 1.4: Add Edge Runtime to Lightweight Routes

**Priority**: HIGH
**Time**: 30 minutes
**Files**: `src/app/api/health/route.ts`, `src/app/api/cache/status/route.ts`

#### Implementation

**Add to `src/app/api/health/route.ts`**:

```typescript
// Add at top of file
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
```

**Add to `src/app/api/cache/status/route.ts`**:

```typescript
// Add at top of file
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Rest of implementation stays the same
```

#### Validation

```bash
# Build and check for edge runtime
npm run build 2>&1 | grep -A 5 "Route (app)"

# Look for edge runtime indicators
# Should show: λ (api)/health (Edge Runtime)
```

#### Success Criteria

- ✅ Health endpoint uses Edge runtime
- ✅ Cache status endpoint uses Edge runtime
- ✅ Build output shows Edge Runtime markers
- ✅ Cold start improves from ~500ms → <50ms

---

## 🟡 PHASE 2: News Route Optimization (6-8 hours)

**Goal**: Reduce news/route.ts from 885 → <200 lines
**Timeline**: Week 1

### Task 2.1: Extract State Name Mappings to JSON

**Priority**: HIGH
**Time**: 1 hour
**Files**: Create `src/data/state-mappings.json`, update `src/app/api/representative/[bioguideId]/news/route.ts`

#### Implementation

**Create `src/data/state-mappings.json`**:

```json
{
  "fullNameToAbbreviation": {
    "Alabama": "AL",
    "Alaska": "AK",
    "Arizona": "AZ",
    "Arkansas": "AR",
    "California": "CA",
    "Colorado": "CO",
    "Connecticut": "CT",
    "Delaware": "DE",
    "Florida": "FL",
    "Georgia": "GA",
    "Hawaii": "HI",
    "Idaho": "ID",
    "Illinois": "IL",
    "Indiana": "IN",
    "Iowa": "IA",
    "Kansas": "KS",
    "Kentucky": "KY",
    "Louisiana": "LA",
    "Maine": "ME",
    "Maryland": "MD",
    "Massachusetts": "MA",
    "Michigan": "MI",
    "Minnesota": "MN",
    "Mississippi": "MS",
    "Missouri": "MO",
    "Montana": "MT",
    "Nebraska": "NE",
    "Nevada": "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    "Ohio": "OH",
    "Oklahoma": "OK",
    "Oregon": "OR",
    "Pennsylvania": "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    "Tennessee": "TN",
    "Texas": "TX",
    "Utah": "UT",
    "Vermont": "VT",
    "Virginia": "VA",
    "Washington": "WA",
    "West Virginia": "WV",
    "Wisconsin": "WI",
    "Wyoming": "WY"
  },
  "abbreviationToFullName": {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming"
  }
}
```

**Update `news/route.ts`** (remove lines 285-336, replace with):

```typescript
import stateMappings from '@/data/state-mappings.json';

// Replace inline mapping with:
const stateFullName =
  stateMappings.fullNameToAbbreviation[representative.state] || representative.state;
```

#### Validation

```bash
# Type check
npm run type-check

# Test news endpoint
curl http://localhost:3000/api/representative/K000367/news | jq '.articles | length'

# Verify state name resolution works
curl http://localhost:3000/api/representative/K000367/news | jq '.metadata.searchTerms'
```

#### Success Criteria

- ✅ `state-mappings.json` created
- ✅ Inline mapping removed from route (50 lines saved)
- ✅ News endpoint still returns results
- ✅ State names resolve correctly

---

### Task 2.2: Create Search Term Generator Service

**Priority**: HIGH
**Time**: 2-3 hours
**Files**: Create `src/services/news/search-term-generator.service.ts`

#### Implementation

**Create `src/services/news/search-term-generator.service.ts`**:

```typescript
/**
 * Search Term Generator Service
 * Generates optimized search terms for news queries
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
  const fullName = `${representative.firstName} ${representative.lastName}`;
  primary.push(fullName);

  if (representative.middleName) {
    primary.push(
      `${representative.firstName} ${representative.middleName} ${representative.lastName}`
    );
  }

  // Add role-based terms
  const title = representative.chamber === 'Senate' ? 'Senator' : 'Representative';
  primary.push(`${title} ${representative.lastName}`);

  // Location terms
  if (includeLocation) {
    const stateFullName =
      stateMappings.abbreviationToFullName[
        representative.state as keyof typeof stateMappings.abbreviationToFullName
      ];
    if (stateFullName) {
      location.push(stateFullName);
      primary.push(`${fullName} ${stateFullName}`);
    }

    if (representative.district) {
      const districtTerm = `${representative.state}-${representative.district}`;
      location.push(districtTerm);
    }
  }

  // Committee terms
  if (includeCommittees && representative.committees?.length) {
    representative.committees.slice(0, 3).forEach(committee => {
      secondary.push(committee.name);
    });
  }

  // Party terms (optional)
  if (includeParty) {
    secondary.push(representative.party);
  }

  // Trim to max terms
  const allTerms = [...primary, ...secondary, ...location];
  const trimmedPrimary = primary.slice(0, Math.floor(maxTerms * 0.6));
  const trimmedSecondary = secondary.slice(0, Math.floor(maxTerms * 0.3));
  const trimmedLocation = location.slice(0, Math.floor(maxTerms * 0.1));

  return {
    primary: trimmedPrimary,
    secondary: trimmedSecondary,
    location: trimmedLocation,
    metadata: {
      representative: fullName,
      state: representative.state,
      party: representative.party,
      termCount: trimmedPrimary.length + trimmedSecondary.length + trimmedLocation.length,
    },
  };
}

/**
 * Format search terms for GDELT API
 */
export function formatForGDELT(terms: GeneratedSearchTerms): string {
  const { primary, secondary } = terms;

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
  return primary[0]; // Use most specific term
}
```

**Update `news/route.ts`** to use service:

```typescript
import {
  generateSearchTerms,
  formatForGDELT,
  formatForGoogleNews,
} from '@/services/news/search-term-generator.service';

// Replace inline search term generation (lines 398-473) with:
const searchTerms = generateSearchTerms(representative, {
  includeCommittees: true,
  includeLocation: true,
  maxTerms: 10,
});

const gdeltQuery = formatForGDELT(searchTerms);
const googleNewsQuery = formatForGoogleNews(searchTerms);
```

#### Validation

```bash
# Type check
npm run type-check

# Unit test the service
npx tsx -e "
import { generateSearchTerms } from './src/services/news/search-term-generator.service.ts';
const terms = generateSearchTerms({
  firstName: 'Amy',
  lastName: 'Klobuchar',
  state: 'MN',
  party: 'Democratic',
  chamber: 'Senate'
});
console.log(JSON.stringify(terms, null, 2));
"

# Test news endpoint still works
curl http://localhost:3000/api/representative/K000367/news | jq '.articles | length'
```

#### Success Criteria

- ✅ Service created with full type safety
- ✅ Generates primary, secondary, location terms
- ✅ Formats correctly for GDELT and Google News
- ✅ News route uses service (75+ lines removed)
- ✅ News endpoint returns same/better results

---

### Task 2.3: Refactor News Route to Orchestration Layer

**Priority**: HIGH
**Time**: 3-4 hours
**Files**: `src/app/api/representative/[bioguideId]/news/route.ts`

#### Goal

Reduce route from 885 lines → <200 lines by extracting:

1. ✅ State mappings → JSON (Task 2.1)
2. ✅ Search term generation → Service (Task 2.2)
3. Clustering logic → Use existing `clustering.service.ts`
4. Data source fallback → Separate function

#### Implementation

**Refactored `route.ts` structure**:

```typescript
import { NextRequest } from 'next/server';
import { unifiedCache } from '@/services/cache/unified-cache.service';
import { getEnhancedRepresentative } from '@/services/congress/batch-data.service';
import {
  generateSearchTerms,
  formatForGDELT,
  formatForGoogleNews,
} from '@/services/news/search-term-generator.service';
import { fetchGoogleNewsRSS } from '@/features/news/services/google-news-rss';
import { searchArticles as searchGDELTArticles } from '@/features/news/services/gdelt-api';
import { clusterArticles } from '@/services/news/clustering.service';
import type { NewsArticle } from '@/types/news';

export const maxDuration = 20;
export const dynamic = 'force-dynamic';

/**
 * Fetch news from multiple sources with fallback strategy
 */
async function fetchNewsWithFallback(
  representative: EnhancedRepresentative,
  limit: number
): Promise<NewsArticle[]> {
  const searchTerms = generateSearchTerms(representative, {
    includeCommittees: true,
    includeLocation: true,
    maxTerms: 10,
  });

  // Strategy 1: Google News RSS (fastest, most relevant)
  try {
    const googleNewsQuery = formatForGoogleNews(searchTerms);
    const rssArticles = await fetchGoogleNewsRSS(googleNewsQuery, limit);
    if (rssArticles.length >= limit * 0.7) {
      return rssArticles;
    }
  } catch (error) {
    console.warn('Google News RSS failed, trying GDELT');
  }

  // Strategy 2: GDELT Advanced Search
  try {
    const gdeltQuery = formatForGDELT(searchTerms);
    const gdeltArticles = await searchGDELTArticles(gdeltQuery, {
      mode: 'artlist',
      maxRecords: limit * 2,
      timespan: '7d',
    });

    if (gdeltArticles.length > 0) {
      return gdeltArticles;
    }
  } catch (error) {
    console.warn('GDELT advanced search failed, trying basic');
  }

  // Strategy 3: GDELT Basic Search
  try {
    const basicQuery = searchTerms.primary[0];
    const basicArticles = await searchGDELTArticles(basicQuery, {
      mode: 'artlist',
      maxRecords: limit,
      timespan: '14d',
    });
    return basicArticles;
  } catch (error) {
    console.error('All news sources failed');
    return [];
  }
}

/**
 * GET /api/representative/[bioguideId]/news
 */
export async function GET(request: NextRequest, { params }: { params: { bioguideId: string } }) {
  const { bioguideId } = params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
  const cluster = searchParams.get('cluster') === 'true';

  // Check cache
  const cacheKey = `news:${bioguideId}:${limit}:${cluster}`;
  const cached = await unifiedCache.get<NewsArticle[]>(cacheKey);
  if (cached) {
    return Response.json({
      articles: cached,
      source: 'cache',
      bioguideId,
    });
  }

  // Get representative data
  const representative = await getEnhancedRepresentative(bioguideId);
  if (!representative) {
    return Response.json({ error: 'Representative not found' }, { status: 404 });
  }

  // Fetch news articles
  let articles = await fetchNewsWithFallback(representative, limit);

  // Apply clustering if requested
  if (cluster && articles.length > 5) {
    articles = clusterArticles(articles, {
      maxClusters: 5,
      minClusterSize: 2,
    });
  }

  // Cache results
  await unifiedCache.set(cacheKey, articles, {
    dataType: 'news',
    ttl: 30 * 60 * 1000, // 30 minutes
  });

  return Response.json({
    articles,
    count: articles.length,
    bioguideId,
    representative: {
      name: `${representative.firstName} ${representative.lastName}`,
      state: representative.state,
      party: representative.party,
    },
  });
}
```

#### Validation

```bash
# Type check
npm run type-check

# Line count verification
wc -l src/app/api/representative/[bioguideId]/news/route.ts
# Should show <200 lines

# Test all fallback strategies
# 1. Test with cache miss
curl http://localhost:3000/api/representative/K000367/news?limit=20

# 2. Test clustering
curl http://localhost:3000/api/representative/K000367/news?cluster=true

# 3. Check cache hit
curl http://localhost:3000/api/representative/K000367/news | jq '.source'
# Should show: "cache"

# 4. Test error handling (invalid bioguideId)
curl http://localhost:3000/api/representative/INVALID/news
# Should return 404
```

#### Success Criteria

- ✅ Route reduced from 885 → <200 lines (75%+ reduction)
- ✅ All functionality preserved
- ✅ Search term generation extracted
- ✅ State mappings extracted
- ✅ Clustering logic reused
- ✅ Clear fallback strategy
- ✅ News endpoint returns same/better results
- ✅ Response time <5s (cold), <500ms (cached)

---

## 🟢 PHASE 3: GDELT Service Optimization (6-8 hours)

**Goal**: Split gdelt-api.ts from 1,695 → ~800 lines across 3 modules
**Timeline**: Week 2

### Task 3.1: Extract District Cities to Static JSON

**Priority**: MEDIUM
**Time**: 1 hour
**Files**: Create `src/data/district-cities.json`, update `src/features/news/services/gdelt-api.ts`

#### Implementation

**Create `src/data/district-cities.json`**:

```json
{
  "AL-01": ["Mobile", "Daphne", "Fairhope"],
  "AL-02": ["Montgomery", "Dothan", "Enterprise"],
  "AL-03": ["Opelika", "Auburn", "Phenix City"],
  "AL-04": ["Gadsden", "Albertville", "Fort Payne"],
  "AL-05": ["Huntsville", "Decatur", "Madison"],
  "AL-06": ["Birmingham", "Hoover", "Vestavia Hills"],
  "AL-07": ["Tuscaloosa", "Birmingham", "Selma"],
  "AK-00": ["Anchorage", "Fairbanks", "Juneau"],
  "AZ-01": ["Flagstaff", "Prescott", "Sedona"],
  "AZ-02": ["Tucson", "Sierra Vista", "Douglas"],
  ...
}
```

(Extract full mapping from lines 149-389 in gdelt-api.ts)

**Update `gdelt-api.ts`**:

```typescript
// Remove lines 149-389, replace with:
import districtCities from '@/data/district-cities.json';

// Usage:
function getDistrictCities(districtId: string): string[] {
  return districtCities[districtId as keyof typeof districtCities] || [];
}
```

#### Validation

```bash
# Count lines removed
wc -l src/data/district-cities.json src/features/news/services/gdelt-api.ts

# Test district city lookup
npx tsx -e "
import districtCities from './src/data/district-cities.json';
console.log('MN-04:', districtCities['MN-04']);
"

# Verify GDELT API still works
curl 'http://localhost:3000/api/representative/K000367/news' | jq '.articles[0]'
```

#### Success Criteria

- ✅ `district-cities.json` created with all 435 districts
- ✅ 240 lines removed from gdelt-api.ts
- ✅ City lookups still work
- ✅ GDELT API returns results

---

### Task 3.2: Split GDELT Service into Modules

**Priority**: MEDIUM
**Time**: 4-5 hours
**Files**: Split `src/features/news/services/gdelt-api.ts` into 3 files

#### Implementation

**Create `src/features/news/services/gdelt-api.core.ts`** (~300 lines):

```typescript
/**
 * GDELT API Core
 * Base API client for GDELT GEO 2.0
 */

import type { GDELTArticle, GDELTSearchOptions } from '@/types/gdelt';

const GDELT_BASE_URL = 'https://api.gdeltproject.org/api/v2';

export interface GDELTApiResponse {
  articles: GDELTArticle[];
  totalResults: number;
  executionTime: number;
}

/**
 * Make GDELT API request with retry logic
 */
export async function makeGDELTRequest(
  endpoint: string,
  params: Record<string, string>,
  options: { retries?: number; timeout?: number } = {}
): Promise<Response> {
  const { retries = 3, timeout = 10000 } = options;
  const url = new URL(`${GDELT_BASE_URL}${endpoint}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'CivicIntelHub/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      throw new Error(`GDELT API error: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error('GDELT API request failed');
}

/**
 * Parse GDELT article list response
 */
export function parseArticleListResponse(data: any): GDELTArticle[] {
  if (!data?.articles) return [];

  return data.articles.map((article: any) => ({
    url: article.url,
    title: article.title,
    description: article.seendate,
    publishedAt: article.seendate,
    source: article.domain,
    tone: article.tone,
    imageUrl: article.socialimage,
  }));
}

/**
 * Search GDELT articles
 */
export async function searchArticles(
  query: string,
  options: GDELTSearchOptions = {}
): Promise<GDELTArticle[]> {
  const { mode = 'artlist', maxRecords = 20, timespan = '7d', sort = 'datedesc' } = options;

  const params = {
    query,
    mode,
    maxrecords: maxRecords.toString(),
    timespan,
    sort,
    format: 'json',
  };

  const response = await makeGDELTRequest('/doc/doc', params);
  const data = await response.json();

  return parseArticleListResponse(data);
}
```

**Create `src/features/news/services/gdelt-api.search.ts`** (~200 lines):

```typescript
/**
 * GDELT API Search Utilities
 * Advanced search term generation and query building
 */

import type { EnhancedRepresentative } from '@/types/representative';
import { searchArticles } from './gdelt-api.core';
import type { GDELTArticle } from '@/types/gdelt';
import districtCities from '@/data/district-cities.json';

/**
 * Build GDELT query for representative
 */
export function buildRepresentativeQuery(
  representative: EnhancedRepresentative,
  options: {
    includeDistrict?: boolean;
    includeCommittees?: boolean;
  } = {}
): string {
  const { includeDistrict = true, includeCommittees = false } = options;

  const terms: string[] = [];

  // Name variations
  const fullName = `${representative.firstName} ${representative.lastName}`;
  terms.push(`"${fullName}"`);

  // Title
  const title = representative.chamber === 'Senate' ? 'Senator' : 'Representative';
  terms.push(`"${title} ${representative.lastName}"`);

  // District cities
  if (includeDistrict && representative.district) {
    const districtId = `${representative.state}-${representative.district}`;
    const cities = districtCities[districtId as keyof typeof districtCities];
    if (cities?.length) {
      terms.push(`(${cities.map(c => `"${c}"`).join(' OR ')})`);
    }
  }

  // Committees
  if (includeCommittees && representative.committees?.length) {
    const committeeTerms = representative.committees
      .slice(0, 2)
      .map(c => `"${c.name}"`)
      .join(' OR ');
    terms.push(`(${committeeTerms})`);
  }

  return terms.join(' AND ');
}

/**
 * Search for representative news
 */
export async function searchRepresentativeNews(
  representative: EnhancedRepresentative,
  limit: number = 20
): Promise<GDELTArticle[]> {
  const query = buildRepresentativeQuery(representative, {
    includeDistrict: true,
    includeCommittees: false,
  });

  return searchArticles(query, {
    mode: 'artlist',
    maxRecords: limit,
    timespan: '7d',
    sort: 'datedesc',
  });
}
```

**Create `src/features/news/services/gdelt-api.realtime.ts`** (~500 lines):

```typescript
/**
 * GDELT API Realtime Features
 * Events, trends, and timeline tracking
 */

import { makeGDELTRequest } from './gdelt-api.core';
import type { GDELTEvent, GDELTTrend, GDELTTimeline } from '@/types/gdelt';

/**
 * Get GDELT events for query
 */
export async function getEvents(query: string, timespan: string = '24h'): Promise<GDELTEvent[]> {
  const params = {
    query,
    mode: 'eventlist',
    timespan,
    format: 'json',
  };

  const response = await makeGDELTRequest('/doc/doc', params);
  const data = await response.json();

  // Parse events...
  return data.events || [];
}

/**
 * Get trending topics related to query
 */
export async function getTrends(query: string, timespan: string = '7d'): Promise<GDELTTrend[]> {
  const params = {
    query,
    mode: 'timelinevol',
    timespan,
    format: 'json',
  };

  const response = await makeGDELTRequest('/doc/doc', params);
  const data = await response.json();

  // Parse trends...
  return data.timeline || [];
}

/**
 * Get timeline of mentions
 */
export async function getTimeline(query: string, timespan: string = '30d'): Promise<GDELTTimeline> {
  const params = {
    query,
    mode: 'timelinevol',
    timespan,
    format: 'json',
  };

  const response = await makeGDELTRequest('/doc/doc', params);
  const data = await response.json();

  return {
    query,
    timespan,
    dataPoints: data.timeline || [],
  };
}
```

**Update main `gdelt-api.ts`** to re-export:

```typescript
/**
 * GDELT API Service
 * Main entry point for GDELT integration
 */

// Re-export core functions
export { makeGDELTRequest, searchArticles, parseArticleListResponse } from './gdelt-api.core';

// Re-export search utilities
export { buildRepresentativeQuery, searchRepresentativeNews } from './gdelt-api.search';

// Re-export realtime features
export { getEvents, getTrends, getTimeline } from './gdelt-api.realtime';

// Re-export types
export type {
  GDELTArticle,
  GDELTSearchOptions,
  GDELTEvent,
  GDELTTrend,
  GDELTTimeline,
} from '@/types/gdelt';
```

#### Validation

```bash
# Type check
npm run type-check

# Count lines
wc -l src/features/news/services/gdelt-api*.ts

# Test imports still work
npx tsx -e "
import { searchArticles } from './src/features/news/services/gdelt-api.ts';
console.log('Import successful');
"

# Test API integration
curl http://localhost:3000/api/representative/K000367/news | jq '.articles | length'

# Run full test suite
npm test -- gdelt
```

#### Success Criteria

- ✅ GDELT service split into 3 focused modules
- ✅ Core: ~300 lines (API client)
- ✅ Search: ~200 lines (query building)
- ✅ Realtime: ~500 lines (events/trends)
- ✅ All imports updated and working
- ✅ Zero TypeScript errors
- ✅ News endpoints return same results
- ✅ Bundle size reduced by ~30-40 KB

---

## 🔵 PHASE 4: Cache & ISR Optimization (4-6 hours)

**Goal**: Improve caching strategy and add ISR to static content
**Timeline**: Week 2

### Task 4.1: Optimize Unified Cache for Serverless

**Priority**: MEDIUM
**Time**: 3-4 hours
**Files**: `src/services/cache/unified-cache.service.ts`

#### Current Issues

1. In-memory Map resets on each serverless invocation
2. Dual-layer caching adds complexity
3. No clear serverless/stateful separation

#### Implementation

**Simplified cache service**:

```typescript
/**
 * Unified Cache Service (Serverless-Optimized)
 * Uses Redis as primary cache, Vercel Cache-Control as fallback
 */

import { Redis } from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export interface CacheOptions {
  dataType: 'representatives' | 'votes' | 'news' | 'districts';
  ttl: number; // milliseconds
}

class UnifiedCacheService {
  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;

    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set<T>(key: string, value: T, options: CacheOptions): Promise<boolean> {
    if (!redis) return false;

    try {
      const { ttl } = options;
      await redis.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    if (!redis) return false;

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    keyCount: number;
    memoryUsage: number;
  }> {
    if (!redis) {
      return { connected: false, keyCount: 0, memoryUsage: 0 };
    }

    try {
      const dbSize = await redis.dbsize();
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;

      return {
        connected: true,
        keyCount: dbSize,
        memoryUsage,
      };
    } catch (error) {
      return { connected: false, keyCount: 0, memoryUsage: 0 };
    }
  }
}

export const unifiedCache = new UnifiedCacheService();
```

**Add Vercel Cache-Control to API routes**:

```typescript
// In route handlers that don't use Redis:
export async function GET(request: NextRequest) {
  const data = await fetchData();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      // Cache for 5min, serve stale for 10min while revalidating
    },
  });
}
```

#### Validation

```bash
# Type check
npm run type-check

# Test cache still works
curl http://localhost:3000/api/representative/K000367
curl http://localhost:3000/api/representative/K000367 # Should be faster

# Check cache stats
curl http://localhost:3000/api/cache/status | jq '.'

# Verify no memory leaks (check process memory doesn't grow)
ps aux | grep node
```

#### Success Criteria

- ✅ In-memory Map removed
- ✅ Redis-only caching with graceful degradation
- ✅ Cache-Control headers added to routes
- ✅ Cache hit rate maintained or improved
- ✅ No memory leaks in serverless environment

---

### Task 4.2: Add ISR to Static Pages

**Priority**: MEDIUM
**Time**: 2 hours
**Files**: Update district and committee pages

#### Implementation

**Update `src/app/(civic)/districts/[districtId]/page.tsx`**:

```typescript
// Add ISR configuration
export const revalidate = 86400; // 24 hours

// Add static params generation
export async function generateStaticParams() {
  // Pre-render top 50 districts
  const topDistricts = [
    'CA-12',
    'NY-14',
    'TX-02',
    'FL-27',
    'IL-05',
    // ... add 45 more popular districts
  ];

  return topDistricts.map(districtId => ({
    districtId,
  }));
}
```

**Update `src/app/(civic)/committee/[committeeId]/page.tsx`**:

```typescript
// Add ISR configuration
export const revalidate = 86400; // 24 hours

// Committee data rarely changes
export async function generateStaticParams() {
  // Pre-render major committees
  const majorCommittees = [
    'HSAP',
    'HSWM',
    'HSIF',
    'HSFA',
    'HSAG',
    'SSAP',
    'SSFI',
    'SSFR',
    'SSAS',
    'SSJU',
  ];

  return majorCommittees.map(committeeId => ({
    committeeId,
  }));
}
```

#### Validation

```bash
# Build with static generation
npm run build

# Check build output for static pages
npm run build 2>&1 | grep "districts/"
npm run build 2>&1 | grep "committee/"

# Should show: ● (SSG) or λ (ISR) instead of ƒ (SSR)

# Test static pages serve quickly
time curl http://localhost:3000/districts/CA-12
# Should be <100ms after build
```

#### Success Criteria

- ✅ ISR added to district pages (24h revalidate)
- ✅ ISR added to committee pages (24h revalidate)
- ✅ Top 50 districts pre-rendered at build time
- ✅ Build output shows static/ISR pages
- ✅ Page load time <100ms for static pages

---

## 📊 PHASE 5: Monitoring & Validation (2-3 hours)

**Goal**: Set up performance monitoring and bundle analysis
**Timeline**: Week 3

### Task 5.1: Configure Bundle Analysis

**Priority**: MEDIUM
**Time**: 1 hour
**Files**: `next.config.mjs`, `package.json`

#### Implementation

**Update `next.config.mjs`**:

```javascript
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
};

export default withBundleAnalyzer(nextConfig);
```

**Add npm script to `package.json`**:

```json
{
  "scripts": {
    "analyze": "ANALYZE=true npm run build",
    "analyze:server": "ANALYZE=true BUNDLE_ANALYZE=server npm run build",
    "analyze:browser": "ANALYZE=true BUNDLE_ANALYZE=browser npm run build"
  }
}
```

#### Validation

```bash
# Run bundle analysis
npm run analyze

# Should open browser with interactive bundle visualization
# Look for:
# - Large dependencies (>50 KB)
# - Duplicate packages
# - Unused code

# Check server bundles
npm run analyze:server
```

#### Success Criteria

- ✅ Bundle analyzer configured
- ✅ `npm run analyze` generates report
- ✅ Identifies optimization opportunities
- ✅ Can track bundle size over time

---

### Task 5.2: Add Performance Testing Script

**Priority**: LOW
**Time**: 1-2 hours
**Files**: Create `scripts/performance-test.sh`

#### Implementation

**Create `scripts/performance-test.sh`**:

```bash
#!/bin/bash

echo "=== Civic Intel Hub Performance Test ==="
echo "Date: $(date)"
echo ""

# Ensure server is running
if ! curl -s http://localhost:3000/api/health > /dev/null; then
  echo "❌ Server not running. Start with: npm run dev"
  exit 1
fi

echo "✅ Server running"
echo ""

# Test endpoints
echo "=== API Response Times ==="

# Health check
echo -n "Health: "
time curl -s http://localhost:3000/api/health > /dev/null

# Representatives list
echo -n "Representatives (cold): "
time curl -s http://localhost:3000/api/representatives?zip=55401 > /dev/null

echo -n "Representatives (cached): "
time curl -s http://localhost:3000/api/representatives?zip=55401 > /dev/null

# Individual representative
echo -n "Representative profile (cold): "
curl -s http://localhost:3000/api/cache/status?bust=true > /dev/null
time curl -s http://localhost:3000/api/representative/K000367 > /dev/null

echo -n "Representative profile (cached): "
time curl -s http://localhost:3000/api/representative/K000367 > /dev/null

# Votes (heavy endpoint)
echo -n "Votes (cold): "
curl -s "http://localhost:3000/api/cache/status?clear=votes-enriched:K000367:20" > /dev/null
time curl -s "http://localhost:3000/api/representative/K000367/votes?limit=20" > /dev/null

echo -n "Votes (cached): "
time curl -s "http://localhost:3000/api/representative/K000367/votes?limit=20" > /dev/null

# News (heavy endpoint)
echo -n "News (cold): "
curl -s "http://localhost:3000/api/cache/status?clear=news:K000367:20:false" > /dev/null
time curl -s "http://localhost:3000/api/representative/K000367/news?limit=20" > /dev/null

echo -n "News (cached): "
time curl -s "http://localhost:3000/api/representative/K000367/news?limit=20" > /dev/null

echo ""
echo "=== Cache Statistics ==="
curl -s http://localhost:3000/api/cache/status | jq '{
  redis_connected: .redis.connected,
  key_count: .redis.keyCount,
  memory_mb: (.redis.memoryUsage / 1024 / 1024 | round)
}'

echo ""
echo "=== Build Size ==="
npm run build 2>&1 | grep "First Load JS" | head -5
```

#### Validation

```bash
# Make executable
chmod +x scripts/performance-test.sh

# Run test
./scripts/performance-test.sh

# Expected results:
# - Health: <50ms
# - Representatives (cached): <200ms
# - Profile (cached): <100ms
# - Votes (cold): <5s, (cached): <500ms
# - News (cold): <5s, (cached): <500ms
```

#### Success Criteria

- ✅ Performance test script created
- ✅ Tests all critical endpoints
- ✅ Measures cold start vs cached performance
- ✅ Can track performance over time

---

## 🎯 Final Validation Checklist

Before deployment to Vercel, ensure ALL items pass:

### Configuration

- [ ] `vercel.json` created with timeout configurations
- [ ] Environment variables set in Vercel dashboard
- [ ] Redis connection configured (Vercel KV or external)
- [ ] Build succeeds: `npm run build`
- [ ] All tests pass: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Linting passes: `npm run lint`

### Performance

- [ ] Bundle analysis run: `npm run analyze`
- [ ] Largest route <200 KB first load JS
- [ ] API routes <150 KB each
- [ ] Heavy routes have maxDuration exports
- [ ] Cache hit rate >70%
- [ ] Performance test passes: `./scripts/performance-test.sh`

### Optimization Tasks

- [ ] Task 1.1: Vercel config created ✅
- [ ] Task 1.2: Dependencies cleaned ✅
- [ ] Task 1.3: Vote caching optimized ✅
- [ ] Task 1.4: Edge runtime added ✅
- [ ] Task 2.1: State mappings extracted ✅
- [ ] Task 2.2: Search term generator created ✅
- [ ] Task 2.3: News route refactored ✅
- [ ] Task 3.1: District cities extracted ✅
- [ ] Task 3.2: GDELT service split ✅
- [ ] Task 4.1: Cache service optimized ✅
- [ ] Task 4.2: ISR added to static pages ✅
- [ ] Task 5.1: Bundle analyzer configured ✅
- [ ] Task 5.2: Performance testing added ✅

### Deployment

- [ ] Test deployment to Vercel preview
- [ ] Verify all API routes work in production
- [ ] Check function timeout logs
- [ ] Monitor cold start times
- [ ] Verify cache performance
- [ ] Test from multiple regions

---

## 📈 Expected Performance Improvements

### Before Optimization

- **Build time**: ~45 seconds
- **API cold start**: 2-3 seconds
- **Heavy routes**: 8-10 seconds (risk of timeout)
- **Bundle size**: 258 KB (largest route)
- **node_modules**: 857 MB
- **Cache hit rate**: ~60%

### After Optimization

- **Build time**: ~38 seconds (-15%)
- **API cold start**: 1-1.5 seconds (-40%)
- **Heavy routes**: <5 seconds (-50%)
- **Bundle size**: <200 KB (-20%)
- **node_modules**: ~750 MB (-12%)
- **Cache hit rate**: >85% (+40%)

---

## 🔧 Rollback Procedures

If any optimization causes issues:

### Quick Rollback

```bash
# Revert last commit
git revert HEAD

# Or reset to previous working state
git reset --hard <commit-hash>

# Reinstall dependencies
npm ci

# Rebuild
npm run build
```

### Selective Rollback

```bash
# Revert specific file
git checkout HEAD~1 -- src/path/to/file.ts

# Rebuild and test
npm run type-check
npm run build
```

### Production Rollback (Vercel)

```bash
# Via Vercel CLI
npx vercel rollback

# Or via Vercel dashboard:
# Deployments → Previous deployment → Promote to Production
```

---

## 📞 Support & Resources

### Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Vercel Edge Runtime](https://vercel.com/docs/functions/edge-functions)
- [ISR Documentation](https://nextjs.org/docs/pages/building-your-application/data-fetching/incremental-static-regeneration)

### Monitoring

- [Vercel Analytics](https://vercel.com/analytics)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Analyzer](https://www.npmjs.com/package/@next/bundle-analyzer)

### Internal Docs

- `docs/ARCHITECTURE.md` - System architecture
- `docs/API_REFERENCE.md` - API documentation
- `docs/development/OODA_DEBUGGING_METHODOLOGY.md` - Debugging guide

---

**Last Updated**: 2025-10-01
**Estimated Completion**: 3 weeks from start
**Total Time Investment**: 30-40 hours
