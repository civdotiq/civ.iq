/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Contract tests for /api/local-government/[location].
 *
 * Local government is not a CIV.IQ feature: every location, including the
 * cities that once had Legistar configs, gets 503 / 'unavailable' with no
 * city list and no pointer to a council endpoint.
 */

import { GET } from '@/app/api/local-government/[location]/route';
import { createMockRequest } from '../../utils/test-helpers';

async function lookup(location: string) {
  const request = createMockRequest(`http://localhost:3000/api/local-government/${location}`);
  const response = await GET(request, { params: Promise.resolve({ location }) });
  return { response, data: await response.json() };
}

describe('/api/local-government/[location]', () => {
  it.each(['boston-ma', 'detroit-mi', 'fakecity-zz'])(
    'returns 503 / unavailable with no city list for %s',
    async location => {
      const { response, data } = await lookup(location);

      expect(response.status).toBe(503);
      expect(data.location).toBe(location);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.resolvedCity).toBeNull();
      expect(data.sourceStatus).toEqual([
        expect.objectContaining({ source: 'civiq:local-government', status: 'not-configured' }),
      ]);
      expect(data).not.toHaveProperty('pilotCities');
      expect(data.metadata.note).toContain('not covered');
      expect(data.metadata.note).not.toContain('/api/city/');
      expect(JSON.stringify(data)).not.toMatch(/legistar|pilot/i);
    }
  );

  it('returns 400 when the location segment is empty', async () => {
    const { response } = await lookup('');
    expect(response.status).toBe(400);
  });
});
