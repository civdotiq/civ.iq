/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * A member profile 404s only when the member list was read and the ID isn't
 * in it. When the list can't be read, the page errors (a 5xx search engines
 * retry), so an outage never tells them a real member's page is gone.
 */

const mockGetMember = jest.fn();
const mockListAvailable = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: <T>(fn: T) => fn,
}));
jest.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (id: string) => mockGetMember(id),
  currentLegislatorsAvailable: () => mockListAvailable(),
}));

import { getProfileRepresentative } from '@/features/representatives/profile-metadata';

describe('getProfileRepresentative', () => {
  it('returns a member the list has', async () => {
    mockGetMember.mockResolvedValueOnce({ bioguideId: 'S000033', name: 'Bernie Sanders' });
    await expect(getProfileRepresentative('S000033')).resolves.toMatchObject({
      name: 'Bernie Sanders',
    });
  });

  it('404s an ID the member list does not have', async () => {
    mockGetMember.mockResolvedValueOnce(null);
    mockListAvailable.mockResolvedValueOnce(true);
    await expect(getProfileRepresentative('Z999999')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('errors, never 404s, when the member list could not be read', async () => {
    mockGetMember.mockRejectedValueOnce(new Error('GitHub timeout'));
    mockListAvailable.mockResolvedValueOnce(false);
    await expect(getProfileRepresentative('S000033')).rejects.toThrow(/Member list unavailable/);
  });
});
