# GDELT API Implementation Guide for civic-intel-hub

## Architecture Overview for Production-Ready Implementation

This guide provides battle-tested patterns for implementing GDELT API integration in the civic-intel-hub Next.js 15 TypeScript project to track all 535 members of the 119th U.S. Congress. The architecture leverages Next.js App Router with Server-Side Route Handlers, SWR for intelligent client-side caching, and TypeScript strict mode for maximum type safety.

## Table of Contents

- [Next.js 15 App Router Implementation](#nextjs-15-app-router-implementation)
- [TypeScript Strict Mode Implementation](#typescript-strict-mode-implementation)
- [Optimizing for 535 Congress Members](#optimizing-for-535-congress-members)
- [SWR Integration](#swr-integration)
- [GDELT Endpoint Optimization](#gdelt-endpoint-optimization)
- [Government API Integration](#government-api-integration)
- [Production Performance](#production-performance)
- [Error Handling](#error-handling)
- [Testing Strategies](#testing-strategies)

## Next.js 15 App Router Implementation

The optimal architecture uses Route Handlers in `/app/api` for clean separation between server-side API logic and client-side consumption.

```typescript
// app/api/gdelt/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const timespan = searchParams.get('timespan') || '24H';

  try {
    const gdeltResponse = await fetch(
      `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query!)}&mode=artlist&format=json&timespan=${timespan}`,
      {
        headers: {
          'User-Agent': 'CIV.IQ-Congressional-Tracker/1.0',
        },
        next: { revalidate: 1800 }, // 30-minute caching
      }
    );

    if (!gdeltResponse.ok) {
      throw new Error(`GDELT API error: ${gdeltResponse.status}`);
    }

    const data = await gdeltResponse.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('GDELT API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch GDELT data' }, { status: 500 });
  }
}
```

## TypeScript Strict Mode Implementation

Complete type safety with zero `any` types, following civic-intel-hub standards:

```typescript
// src/types/gdelt.ts
export interface GDELTArticle {
  readonly url: string;
  readonly urltone: number | null;
  readonly domain: string | null;
  readonly urlpubtimedate: string | null;
  readonly urlpubtime: string | null;
  readonly title: string | null;
  readonly socialimage: string | null;
  readonly seendate: string;
  readonly tone: number | null;
  readonly country: string | null;
  readonly lang: string | null;
}

export interface GDELTResponse {
  readonly articles: ReadonlyArray<GDELTArticle>;
  readonly timeline?: ReadonlyArray<GDELTTimelineEntry>;
  readonly metadata?: GDELTMetadata;
}

// Result/Either pattern for error handling (aligning with project patterns)
export type Success<T> = {
  readonly data: T;
  readonly error?: never;
};

export type Failure<E = unknown> = {
  readonly data?: never;
  readonly error: E;
};

export type Result<T, E = unknown> = Success<T> | Failure<E>;

// Error types
export enum GDELTErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_QUERY = 'INVALID_QUERY',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
}

export interface GDELTError {
  readonly type: GDELTErrorType;
  readonly message: string;
  readonly statusCode?: number;
  readonly timestamp: string;
}
```

## Optimizing for 535 Congress Members

Batch processing with rate limiting for all Congressional members:

```typescript
// src/lib/gdelt/GDELTCongressQueue.ts
import { CongressMember } from '@/types/representative';
import { GDELTArticle, Result, GDELTError } from '@/types/gdelt';

export class GDELTCongressQueue {
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_INTERVAL = 2000; // 2 seconds
  private readonly MAX_CONCURRENT = 5;

  async processAllMembers(members: CongressMember[]): Promise<Map<string, GDELTArticle[]>> {
    const batches = this.createBatches(members, this.BATCH_SIZE);
    const results = new Map<string, GDELTArticle[]>();

    for (const batch of batches) {
      const batchPromises = batch.map(member => this.fetchMemberNews(member));

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.data) {
          results.set(batch[index].bioguideId, result.value.data);
        }
      });

      // Rate limiting pause
      await new Promise(resolve => setTimeout(resolve, this.BATCH_INTERVAL));
    }

    return results;
  }

  private async fetchMemberNews(
    member: CongressMember
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    const nameVariants = this.generateNameVariants(member);
    const query = this.buildQuery(nameVariants);

    try {
      const response = await fetch(`/api/gdelt?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              type: GDELTErrorType.RATE_LIMIT,
              message: 'Rate limit exceeded',
              statusCode: 429,
              timestamp: new Date().toISOString(),
            },
          };
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return { data: data.articles || [] };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private generateNameVariants(member: CongressMember): string[] {
    const variants = [`"${member.firstName} ${member.lastName}"`, `"${member.lastName}"`];

    if (member.chamber === 'House') {
      variants.push(`"Rep. ${member.lastName}"`, `"Representative ${member.lastName}"`);
    } else {
      variants.push(`"Sen. ${member.lastName}"`, `"Senator ${member.lastName}"`);
    }

    // Add common nicknames if known
    const nicknames = this.getNicknames(member.bioguideId);
    if (nicknames.length > 0) {
      variants.push(...nicknames.map(n => `"${n}"`));
    }

    return variants;
  }

  private buildQuery(variants: string[]): string {
    return `(${variants.join(' OR ')}) theme:GENERAL_GOVERNMENT`;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private getNicknames(bioguideId: string): string[] {
    // Map of known nicknames
    const nicknameMap: Record<string, string[]> = {
      O000172: ['AOC'], // Alexandria Ocasio-Cortez
      S000033: ['Bernie'], // Bernie Sanders
      // Add more as needed
    };
    return nicknameMap[bioguideId] || [];
  }
}
```

## SWR Integration

Client-side data fetching with intelligent caching:

```typescript
// src/hooks/useGDELTNews.ts
import useSWR, { SWRConfiguration } from 'swr';
import { GDELTResponse, GDELTError, Result } from '@/types/gdelt';

const gdeltFetcher = async (url: string): Promise<GDELTResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`GDELT API error: ${response.status}`);
  }
  return response.json();
};

export const gdeltSWRConfig: SWRConfiguration = {
  refreshInterval: 30 * 60 * 1000, // 30 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30 * 60 * 1000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

export function useGDELTNews(bioguideId: string) {
  const { data, error, isLoading, mutate } = useSWR<GDELTResponse, Error>(
    `/api/gdelt/member/${bioguideId}`,
    gdeltFetcher,
    gdeltSWRConfig
  );

  return {
    articles: data?.articles || [],
    timeline: data?.timeline || [],
    isLoading,
    isError: !!error,
    error,
    refresh: () => mutate(),
  };
}
```

## GDELT Endpoint Optimization

Optimized query construction for political tracking:

```typescript
// src/lib/gdelt/query-builder.ts
export interface GDELTQueryParams {
  query: string;
  mode?: 'artlist' | 'timelinevol' | 'timelinevolraw';
  format?: 'json' | 'csv' | 'html';
  timespan?: string;
  maxrecords?: number;
  theme?: string;
  domain?: string;
  country?: string;
  sourcelang?: string;
}

export class GDELTQueryBuilder {
  private params: GDELTQueryParams;

  constructor(baseQuery: string) {
    this.params = {
      query: baseQuery,
      mode: 'artlist',
      format: 'json',
      timespan: '7days',
    };
  }

  withTheme(theme: string): this {
    this.params.theme = theme;
    return this;
  }

  withTimespan(timespan: string): this {
    this.params.timespan = timespan;
    return this;
  }

  withMaxRecords(max: number): this {
    this.params.maxrecords = max;
    return this;
  }

  forCongressMember(member: CongressMember): this {
    const nameVariants = [
      `"${member.firstName} ${member.lastName}"`,
      `"${member.lastName} ${member.state}"`,
    ];

    this.params.query = `(${nameVariants.join(' OR ')})`;
    this.params.theme = 'GENERAL_GOVERNMENT';

    return this;
  }

  build(): string {
    const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    Object.entries(this.params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }
}
```

## Government API Integration

Correlating GDELT with official government data:

```typescript
// src/lib/gdelt/congress-correlation.ts
import { CongressMember } from '@/types/representative';
import { GDELTArticle } from '@/types/gdelt';

export class CongressGDELTCorrelator {
  async enrichWithGDELT(member: CongressMember): Promise<EnrichedMemberData> {
    // Generate search variants
    const searchVariants = this.generateSearchVariants(member);

    // Fetch from GDELT
    const gdeltPromises = searchVariants.map(variant => this.fetchGDELTData(variant));

    const gdeltResults = await Promise.allSettled(gdeltPromises);

    // Deduplicate articles
    const uniqueArticles = this.deduplicateArticles(
      gdeltResults
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => (r as PromiseFulfilledResult<GDELTArticle[]>).value)
    );

    // Correlate with legislative activity
    const correlatedData = this.correlateLegislativeActivity(member, uniqueArticles);

    return {
      ...member,
      newsArticles: uniqueArticles,
      newsMetrics: {
        totalArticles: uniqueArticles.length,
        avgTone: this.calculateAverageTone(uniqueArticles),
        topDomains: this.getTopDomains(uniqueArticles),
        correlatedWithVotes: correlatedData,
      },
    };
  }

  private deduplicateArticles(articles: GDELTArticle[]): GDELTArticle[] {
    const seen = new Set<string>();
    const uniqueArticles: GDELTArticle[] = [];

    for (const article of articles) {
      // Use URL + title hash for deduplication
      const hash = this.generateArticleHash(article);
      if (!seen.has(hash)) {
        seen.add(hash);
        uniqueArticles.push(article);
      }
    }

    return uniqueArticles;
  }

  private generateArticleHash(article: GDELTArticle): string {
    const normalizedUrl = article.url.toLowerCase().replace(/[?#].*$/, '');
    const normalizedTitle = (article.title || '').toLowerCase().replace(/\s+/g, ' ');
    return `${normalizedUrl}-${normalizedTitle}`;
  }
}
```

## Production Performance

Caching and optimization strategies:

```typescript
// src/lib/gdelt/cache.ts
import { LRUCache } from 'lru-cache';
import { GDELTResponse } from '@/types/gdelt';

export class GDELTCache {
  private cache: LRUCache<string, GDELTResponse>;

  constructor() {
    this.cache = new LRUCache<string, GDELTResponse>({
      max: 1000, // Maximum 1000 entries
      ttl: 30 * 60 * 1000, // 30 minutes TTL
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  get(key: string): GDELTResponse | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: GDELTResponse): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

## Error Handling

Circuit breaker pattern for resilience:

```typescript
// src/lib/gdelt/circuit-breaker.ts
export class GDELTCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  private readonly resetTimeout = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Testing Strategies

Integration tests with real GDELT API:

```typescript
// src/tests/gdelt/gdelt-integration.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { GDELTCongressQueue } from '@/lib/gdelt/GDELTCongressQueue';

describe('GDELT Congressional Tracking Integration', () => {
  let tracker: GDELTCongressQueue;

  beforeAll(() => {
    tracker = new GDELTCongressQueue();
  });

  it('should fetch real data for Nancy Pelosi', async () => {
    const testMember = {
      bioguideId: 'P000197',
      firstName: 'Nancy',
      lastName: 'Pelosi',
      chamber: 'House' as const,
      state: 'CA',
      district: '12',
    };

    const result = await tracker.fetchMemberNews(testMember);

    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data!.length).toBeGreaterThan(0);

    // Validate article structure
    if (result.data && result.data.length > 0) {
      const article = result.data[0];
      expect(article).toHaveProperty('url');
      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('seendate');
    }
  }, 30000); // Extended timeout for API call

  it('should handle rate limiting gracefully', async () => {
    const members = Array(10)
      .fill(null)
      .map((_, i) => ({
        bioguideId: `TEST${i}`,
        firstName: 'Test',
        lastName: `Member${i}`,
        chamber: 'House' as const,
        state: 'CA',
        district: String(i + 1),
      }));

    const results = await tracker.processAllMembers(members);

    expect(results).toBeInstanceOf(Map);
    expect(results.size).toBeGreaterThan(0);
  });
});
```

## Implementation Checklist

- [ ] Create TypeScript types in `src/types/gdelt.ts`
- [ ] Implement API route in `app/api/gdelt/route.ts`
- [ ] Create batch processing class `GDELTCongressQueue`
- [ ] Add SWR hook `useGDELTNews`
- [ ] Implement deduplication logic
- [ ] Set up caching strategy
- [ ] Add circuit breaker pattern
- [ ] Create integration tests
- [ ] Update existing news endpoint to use new system
- [ ] Add performance monitoring

## Performance Targets

- Response time: < 200ms for cached queries
- Throughput: Support all 535 members within 30 minutes
- Cache hit rate: > 80%
- Deduplication accuracy: > 95%
- Error rate: < 1%

## Security Considerations

- Never expose API keys in client code
- Sanitize all query parameters
- Implement rate limiting per IP
- Use HTTPS for all API calls
- Log suspicious activity

## References

- [GDELT DOC 2.0 API Documentation](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/)
- [GDELT Theme List](http://data.gdeltproject.org/api/v2/guides/LOOKUP-GKGTHEMES.TXT)
- [Next.js 15 Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [SWR Documentation](https://swr.vercel.app/)
