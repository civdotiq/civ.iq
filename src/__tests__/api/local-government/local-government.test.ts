/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Contract tests for /api/local-government/[location].
 *
 * Pins the two BackboneResponse paths:
 *   - Pilot city match (e.g., "boston-ma"): 200 / 'partial' / legistar source
 *   - Unsupported location (e.g., "fakecity-zz"): 503 / 'unavailable' / pilotCities list
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

import { GET } from '@/app/api/local-government/[location]/route';
import { createMockRequest } from '../../utils/test-helpers';

describe('/api/local-government/[location]', () => {
  it('returns 200 with dataQuality: partial for a pilot city match (boston-ma)', async () => {
    const request = createMockRequest('http://localhost:3000/api/local-government/boston-ma');
    const response = await GET(request, {
      params: Promise.resolve({ location: 'boston-ma' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.dataQuality).toBe('partial');
    expect(data.resolvedCity?.name).toBe('Boston');
    expect(data.resolvedCity?.state).toBe('MA');
    expect(data.sourceStatus).toHaveLength(1);
    expect(data.sourceStatus[0].source).toBe('legistar:boston');
    expect(data.sourceStatus[0].status).toBe('ok');
    expect(data.metadata.note).toContain('/api/city/boston/council');
    expect(data.pilotCities).toHaveLength(10);
  });

  it('returns 503 with dataQuality: unavailable for an unsupported location (fakecity-zz)', async () => {
    const request = createMockRequest('http://localhost:3000/api/local-government/fakecity-zz');
    const response = await GET(request, {
      params: Promise.resolve({ location: 'fakecity-zz' }),
    });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.dataQuality).toBe('unavailable');
    expect(data.resolvedCity).toBeNull();
    expect(data.sourceStatus).toHaveLength(1);
    expect(data.sourceStatus[0].source).toBe('civiq:local-government');
    expect(data.sourceStatus[0].status).toBe('not-configured');
    expect(data.pilotCities).toHaveLength(10);
    // The pilot city list should enumerate the 10 supported cities with their endpoints
    const cityIds = data.pilotCities.map((c: { id: string }) => c.id).sort();
    expect(cityIds).toContain('boston');
    expect(cityIds).toContain('chicago');
    expect(data.pilotCities[0]).toHaveProperty('councilEndpoint');
  });
});
