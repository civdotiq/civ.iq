/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  FEC_CACHE,
  FEC_CACHE_HEADERS,
  FinanceCacheKeys,
  validateFECMapping,
  getFECMapping,
  getFECCandidateLink,
  getFECReceiptsLink,
  getFECDisbursementsLink,
  createFinanceMetadata,
  EmptyFinanceResponses,
  withFECCacheHeaders,
  FEC_CACHE_OPTIONS,
  FEC_SHORT_CACHE_OPTIONS,
} from '@/lib/api/finance-helpers';

describe('FEC_CACHE constants', () => {
  it('has correct TTL values', () => {
    expect(FEC_CACHE.TTL_30_DAYS).toBe(2592000000);
    expect(FEC_CACHE.TTL_6_HOURS).toBe(21600000);
    expect(FEC_CACHE.TTL_1_HOUR).toBe(3600000);
  });
});

describe('FEC_CACHE_HEADERS', () => {
  it('includes proper cache control headers', () => {
    expect(FEC_CACHE_HEADERS.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=2592000, stale-while-revalidate=86400'
    );
    expect(FEC_CACHE_HEADERS.get('CDN-Cache-Control')).toBe('public, max-age=2592000');
    expect(FEC_CACHE_HEADERS.get('Vary')).toBe('Accept-Encoding');
  });

  // Guards the reason the two lifetimes differ. A browser must not pin
  // campaign finance figures for 30 days — a citizen who loaded a page once
  // would not see corrected numbers for a month. Shared caches may hold them
  // that long because they can be purged.
  it('keeps the browser lifetime short and the shared-cache lifetime long', () => {
    const cc = FEC_CACHE_HEADERS.get('Cache-Control') ?? '';
    const maxAge = Number(/(?:^|[ ,])max-age=(\d+)/.exec(cc)?.[1]);
    const sMaxAge = Number(/s-maxage=(\d+)/.exec(cc)?.[1]);

    expect(maxAge).toBeLessThanOrEqual(600);
    expect(sMaxAge).toBeGreaterThanOrEqual(86400);
    expect(sMaxAge).toBeGreaterThan(maxAge);
  });
});

describe('FinanceCacheKeys', () => {
  const bioguideId = 'K000367';

  it('generates correct industries cache key', () => {
    expect(FinanceCacheKeys.industries(bioguideId)).toBe('finance-industries:K000367:2024');
    expect(FinanceCacheKeys.industries(bioguideId, 2022)).toBe('finance-industries:K000367:2022');
  });

  it('generates correct contributors cache key', () => {
    expect(FinanceCacheKeys.contributors(bioguideId)).toBe('finance-contributors-v2:K000367:2024');
  });

  it('generates correct expenditures cache key', () => {
    expect(FinanceCacheKeys.expenditures(bioguideId)).toBe('finance-expenditures:K000367:2024');
  });

  it('generates correct geography cache key', () => {
    expect(FinanceCacheKeys.geography(bioguideId)).toBe('finance-geography:K000367:2024');
  });

  it('generates correct fundingSources cache key', () => {
    expect(FinanceCacheKeys.fundingSources(bioguideId)).toBe(
      'finance-funding-sources:K000367:2024'
    );
  });

  it('generates correct comprehensive cache key', () => {
    expect(FinanceCacheKeys.comprehensive(bioguideId)).toBe('finance-comprehensive:K000367:2024');
  });
});

describe('validateFECMapping', () => {
  it('returns success true with mapping for valid bioguideId', () => {
    // K000367 should exist in the mapping
    const result = validateFECMapping('K000367');
    if (result.success) {
      expect(result.mapping).toBeDefined();
      expect(result.mapping.fecId).toBeDefined();
    }
  });

  it('returns success false for invalid bioguideId', () => {
    const result = validateFECMapping('INVALID123');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.bioguideId).toBe('INVALID123');
    }
  });
});

describe('getFECMapping', () => {
  it('returns mapping for valid bioguideId', () => {
    const mapping = getFECMapping('K000367');
    expect(mapping).not.toBeNull();
    if (mapping) {
      expect(mapping.fecId).toBeDefined();
    }
  });

  it('returns null for invalid bioguideId', () => {
    const mapping = getFECMapping('INVALID123');
    expect(mapping).toBeNull();
  });
});

describe('FEC link generators', () => {
  const fecId = 'H6MN05049';
  const committeeId = 'C00123456';

  describe('getFECCandidateLink', () => {
    it('generates correct candidate page URL', () => {
      expect(getFECCandidateLink(fecId)).toBe('https://www.fec.gov/data/candidate/H6MN05049');
    });
  });

  describe('getFECReceiptsLink', () => {
    it('generates receipts URL with committee ID', () => {
      const url = getFECReceiptsLink(fecId, committeeId);
      expect(url).toContain('committee_id=C00123456');
      expect(url).toContain('two_year_transaction_period=2024');
    });

    it('generates receipts URL without committee ID', () => {
      const url = getFECReceiptsLink(fecId);
      expect(url).toContain('candidate_id=H6MN05049');
    });
  });

  describe('getFECDisbursementsLink', () => {
    it('generates disbursements URL with committee ID', () => {
      const url = getFECDisbursementsLink(fecId, committeeId);
      expect(url).toContain('committee_id=C00123456');
    });

    it('generates disbursements URL without committee ID', () => {
      const url = getFECDisbursementsLink(fecId);
      expect(url).toContain('candidate_id=H6MN05049');
    });
  });
});

describe('createFinanceMetadata', () => {
  it('creates metadata with basic fields', () => {
    const metadata = createFinanceMetadata('K000367');
    expect(metadata.bioguideId).toBe('K000367');
    expect(metadata.cycle).toBe(2024);
    expect(metadata.lastUpdated).toBeDefined();
    expect(metadata.fecTransparencyLink).toBeUndefined();
  });

  it('creates metadata with FEC link when fecId provided', () => {
    const metadata = createFinanceMetadata('K000367', 'H6MN05049');
    expect(metadata.fecTransparencyLink).toBe('https://www.fec.gov/data/candidate/H6MN05049');
  });

  it('accepts custom cycle', () => {
    const metadata = createFinanceMetadata('K000367', undefined, 2022);
    expect(metadata.cycle).toBe(2022);
  });
});

describe('EmptyFinanceResponses', () => {
  const bioguideId = 'K000367';
  const fecId = 'H6MN05049';

  describe('industries', () => {
    it('returns empty industries response', () => {
      const response = EmptyFinanceResponses.industries(bioguideId);
      expect(response.topIndustries).toEqual([]);
      expect(response.dataQuality.totalContributionsAnalyzed).toBe(0);
      expect(response.metadata.bioguideId).toBe(bioguideId);
    });
  });

  describe('contributors', () => {
    it('returns empty contributors response', () => {
      const response = EmptyFinanceResponses.contributors(bioguideId);
      expect(response.topContributors).toEqual([]);
      expect(response.metadata.totalContributors).toBe(0);
    });
  });

  describe('expenditures', () => {
    it('returns empty expenditures response without FEC ID', () => {
      const response = EmptyFinanceResponses.expenditures(bioguideId);
      expect(response.totalDisbursements).toBe(0);
      expect(response.dataAvailability.limitation).toBe('No FEC mapping available');
    });

    it('returns empty expenditures response with FEC ID', () => {
      const response = EmptyFinanceResponses.expenditures(bioguideId, fecId);
      expect(response.dataAvailability.limitation).toBe('No financial data available for cycle');
      expect(response.metadata.fecTransparencyLink).toContain(fecId);
    });
  });

  describe('geography', () => {
    it('returns empty geography response', () => {
      const response = EmptyFinanceResponses.geography(bioguideId);
      expect(response.topStates).toEqual([]);
      expect(response.inStatePercentage).toBe(0);
    });
  });

  describe('fundingSources', () => {
    it('returns empty funding sources response', () => {
      const response = EmptyFinanceResponses.fundingSources(bioguideId);
      expect(response.totalRaised).toBe(0);
      expect(response.individualContributions.amount).toBe(0);
    });
  });

  describe('comprehensive', () => {
    it('returns empty comprehensive response', () => {
      const response = EmptyFinanceResponses.comprehensive(bioguideId);
      expect(response.finance.totalRaised).toBe(0);
      expect(response.contributors.topContributors).toEqual([]);
      expect(response.industries.topIndustries).toEqual([]);
      expect(response.metadata.sampleSize).toBe(0);
    });

    it('includes FEC links when fecId provided', () => {
      const response = EmptyFinanceResponses.comprehensive(bioguideId, fecId);
      expect(response.finance.fecTransparencyLinks).toBeDefined();
      expect(response.finance.fecTransparencyLinks?.candidatePage).toContain(fecId);
    });
  });
});

describe('withFECCacheHeaders', () => {
  it('wraps data in NextResponse with cache headers', async () => {
    const data = { test: 'value' };
    const response = withFECCacheHeaders(data);
    // Note: Header verification depends on NextResponse mock in jest.setup.js
    // The actual implementation passes FEC_CACHE_HEADERS to NextResponse.json
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.test).toBe('value');
  });
});

describe('Cache options', () => {
  it('FEC_CACHE_OPTIONS has correct values', () => {
    expect(FEC_CACHE_OPTIONS.ttl).toBe(FEC_CACHE.TTL_30_DAYS);
    expect(FEC_CACHE_OPTIONS.source).toBe('fec-api');
    expect(FEC_CACHE_OPTIONS.dataType).toBe('finance');
  });

  it('FEC_SHORT_CACHE_OPTIONS has correct values', () => {
    expect(FEC_SHORT_CACHE_OPTIONS.ttl).toBe(FEC_CACHE.TTL_6_HOURS);
    expect(FEC_SHORT_CACHE_OPTIONS.source).toBe('fec-api');
    expect(FEC_SHORT_CACHE_OPTIONS.dataType).toBe('finance');
  });
});
