/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Shape validation for /influence/[committeeId]:
 *   `C\d{8}` with FEC data                   → render (no notFound)
 *   `C\d{8}` without FEC data                → empty-state (no notFound)
 *   congressional systemCode (e.g. `HSBA`)   → 308 redirect to /committee/{code}
 *   garbage (wrong shape entirely)           → 404
 */

class NextNotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
}
class NextRedirectError extends Error {
  digest = 'NEXT_REDIRECT';
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new NextNotFoundError('NEXT_NOT_FOUND');
  }),
  permanentRedirect: jest.fn((_url: string) => {
    throw new NextRedirectError('NEXT_REDIRECT');
  }),
}));

// Silence noisy deps
jest.mock('@/components/seo/JsonLd', () => ({
  BreadcrumbSchema: () => null,
  OrganizationSchema: () => null,
}));
jest.mock('@/app/(civic)/influence/[committeeId]/CommitteeProfileClient', () => ({
  CommitteeProfileClient: () => null,
}));
jest.mock('@/components/shared/ui/OpenDataStrip', () => ({ OpenDataStrip: () => null }));
jest.mock('@/components/shared/navigation/Breadcrumbs', () => ({ Breadcrumbs: () => null }));

const mockGetCommitteeInfo = jest.fn();
const mockGetCommitteeTotals = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getCommitteeInfo: (...args: unknown[]) => mockGetCommitteeInfo(...args),
    getCommitteeTotals: (...args: unknown[]) => mockGetCommitteeTotals(...args),
  },
}));
jest.mock('@/lib/fec/recipient-resolver', () => ({
  resolveCommitteeRecipients: jest.fn(async () => []),
}));
jest.mock('@/lib/fec/industry-taxonomy', () => ({
  categorizePACByName: () => null,
}));
jest.mock('@/lib/mesh/sector-display', () => ({
  displaySector: (s: string) => s,
}));

import CommitteeProfilePage from '@/app/(civic)/influence/[committeeId]/page';
import { notFound, permanentRedirect } from 'next/navigation';

async function invoke(committeeId: string) {
  return CommitteeProfilePage({
    params: Promise.resolve({ committeeId }),
    searchParams: Promise.resolve({}),
  });
}

describe('/influence/[committeeId] shape validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('congressional systemCode (HSBA) redirects to /committee/HSBA', async () => {
    await expect(invoke('HSBA')).rejects.toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith('/committee/HSBA');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('lowercase congressional systemCode redirects with canonical uppercase target', async () => {
    await expect(invoke('hsba')).rejects.toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith('/committee/HSBA');
  });

  it('senate systemCode (SSJU) redirects to /committee/SSJU', async () => {
    await expect(invoke('SSJU')).rejects.toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith('/committee/SSJU');
  });

  it('subcommittee systemCode (SSJU05) redirects to /committee/SSJU05', async () => {
    await expect(invoke('SSJU05')).rejects.toThrow('NEXT_REDIRECT');
    expect(permanentRedirect).toHaveBeenCalledWith('/committee/SSJU05');
  });

  it('malformed id (too short FEC shape) calls notFound', async () => {
    await expect(invoke('C1234')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('garbage id (neither FEC nor systemCode) calls notFound', async () => {
    await expect(invoke('not-a-real-id')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('valid shape with no FEC data renders empty state without calling notFound', async () => {
    mockGetCommitteeInfo.mockResolvedValue(null);
    mockGetCommitteeTotals.mockResolvedValue(null);
    const result = await invoke('C00401224');
    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
