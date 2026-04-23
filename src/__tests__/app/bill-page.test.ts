/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Route-level shape validation for /bill/[billId]:
 *   canonical slug   → render (no redirect/404)
 *   recoverable slug → 308 to canonical
 *   malformed slug   → 404
 */

import { CURRENT_CONGRESS } from '@/lib/data/congressional-constants';

class NextNotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
}

class NextRedirectError extends Error {
  digest: string;
  constructor(url: string, type: 'permanent' | 'temporary') {
    super(`NEXT_REDIRECT:${type}:${url}`);
    this.digest = `NEXT_REDIRECT:${type};${url}`;
  }
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new NextNotFoundError('NEXT_NOT_FOUND');
  }),
  permanentRedirect: jest.fn((url: string) => {
    throw new NextRedirectError(url, 'permanent');
  }),
  redirect: jest.fn((url: string) => {
    throw new NextRedirectError(url, 'temporary');
  }),
}));

jest.mock('@/lib/services/bill.service', () => ({
  fetchBillFromCongress: jest.fn(async () => null),
}));

import BillPage from '@/app/bill/[billId]/page';
import { notFound, permanentRedirect } from 'next/navigation';

async function invoke(billId: string) {
  return BillPage({
    params: Promise.resolve({ billId }),
    searchParams: Promise.resolve({}),
  });
}

describe('/bill/[billId] slug validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('canonical slug renders without calling notFound or permanentRedirect', async () => {
    await invoke('119-hr-7682');
    expect(notFound).not.toHaveBeenCalled();
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('recoverable slug `hr-7682` 308-redirects to current-Congress canonical', async () => {
    await expect(invoke('hr-7682')).rejects.toThrow(/NEXT_REDIRECT:permanent/);
    expect(permanentRedirect).toHaveBeenCalledWith(`/bill/${CURRENT_CONGRESS.number}-hr-7682`);
  });

  it('recoverable slug `HR7682` 308-redirects (normalized)', async () => {
    await expect(invoke('HR7682')).rejects.toThrow(/NEXT_REDIRECT:permanent/);
    expect(permanentRedirect).toHaveBeenCalledWith(`/bill/${CURRENT_CONGRESS.number}-hr-7682`);
  });

  it('recoverable slug `hr7682-119` 308-redirects to canonical', async () => {
    await expect(invoke('hr7682-119')).rejects.toThrow(/NEXT_REDIRECT:permanent/);
    expect(permanentRedirect).toHaveBeenCalledWith('/bill/119-hr-7682');
  });

  it('uppercase canonical is recoverable and 308-redirects to lowercase canonical', async () => {
    await expect(invoke('119-HR-7682')).rejects.toThrow(/NEXT_REDIRECT:permanent/);
    expect(permanentRedirect).toHaveBeenCalledWith('/bill/119-hr-7682');
  });

  it('malformed slug calls notFound', async () => {
    await expect(invoke('not-a-bill')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });
});
