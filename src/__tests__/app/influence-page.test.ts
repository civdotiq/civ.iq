/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Shape validation for /influence/[committeeId]:
 *   `C\d{8}` with FEC data       → render (no notFound)
 *   `C\d{8}` without FEC data    → empty-state (no notFound)
 *   anything else (e.g. `HSBA`)  → 404
 */

class NextNotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new NextNotFoundError('NEXT_NOT_FOUND');
  }),
}));

// Silence noisy deps
jest.mock('@/components/seo/JsonLd', () => ({ BreadcrumbSchema: () => null }));
jest.mock('@/app/(civic)/influence/[committeeId]/PACPageSchema', () => ({
  PACPageSchema: () => null,
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
import { notFound } from 'next/navigation';

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

  it('malformed id (congressional systemCode like HSBA) calls notFound', async () => {
    await expect(invoke('HSBA')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('malformed id (too short) calls notFound', async () => {
    await expect(invoke('C1234')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('valid shape with no FEC data renders empty state without calling notFound', async () => {
    mockGetCommitteeInfo.mockResolvedValue(null);
    mockGetCommitteeTotals.mockResolvedValue(null);
    const result = await invoke('C00401224');
    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
