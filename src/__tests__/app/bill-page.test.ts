/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Route-level shape validation for /bill/[billId]:
 *   canonical slug   → render (no redirect/404)
 *   recoverable slug → 308 to canonical
 *   malformed slug   → 404
 *
 * And what the Congress.gov lookup decides:
 *   found       → bill goes into the first HTML (text body left out)
 *   not_found   → 404, only when Congress.gov itself says 404
 *   unavailable → render; the browser retries (an outage is never a 404)
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
  lookupBill: jest.fn(async () => ({ status: 'unavailable' })),
}));

import type { ReactElement } from 'react';
import BillPage from '@/app/bill/[billId]/page';
import { notFound, permanentRedirect } from 'next/navigation';
import { lookupBill } from '@/lib/services/bill.service';
import type { Bill } from '@/types/bill';

const mockLookup = lookupBill as jest.MockedFunction<typeof lookupBill>;

async function invoke(billId: string) {
  return BillPage({
    params: Promise.resolve({ billId }),
    searchParams: Promise.resolve({}),
  });
}

process.env.CONGRESS_API_KEY = 'test-key';

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

/** Finds the first element of a named component, rendering BillContent on the way. */
function findElement(node: unknown, typeName: string): ReactElement | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findElement(child, typeName);
      if (hit) return hit;
    }
    return null;
  }
  const el = node as ReactElement<{ children?: unknown }>;
  if (typeof el.type === 'function') {
    const component = el.type as ((props: unknown) => unknown) & { name: string };
    if (component.name === typeName) return el;
    if (component.name === 'BillContent') return findElement(component(el.props), typeName);
  }
  return findElement(el.props?.children, typeName);
}

describe('/bill/[billId] Congress.gov outcomes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('404s when Congress.gov says the bill does not exist', async () => {
    mockLookup.mockResolvedValueOnce({ status: 'not_found' });
    await expect(invoke('119-hr-99999')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders (no 404) when Congress.gov is unreachable, leaving the fetch to the browser', async () => {
    mockLookup.mockResolvedValueOnce({ status: 'unavailable' });
    const page = await invoke('119-hr-4');
    expect(notFound).not.toHaveBeenCalled();
    const client = findElement(page, 'ClientBillContent');
    expect(client?.props).toMatchObject({ billId: '119-hr-4', initialBill: undefined });
  });

  it('hands the found bill to the client without its text body', async () => {
    const bill = {
      id: '119-hr-4',
      number: 'H.R. 4',
      title: 'A bill',
      type: 'hr',
      introducedDate: '2025-01-03',
      status: { current: 'introduced', lastAction: { date: '', description: '' }, timeline: [] },
      sponsor: { representative: { bioguideId: 'X000001', name: 'Rep. X' }, date: '' },
      fullText: { content: '<p>'.padEnd(5000, 'x'), format: 'html', version: 'IH', date: '' },
    } as unknown as Bill;
    mockLookup.mockResolvedValueOnce({ status: 'found', bill });
    const page = await invoke('119-hr-4');
    const client = findElement(page, 'ClientBillContent');
    const initialBill = (client?.props as { initialBill?: Bill }).initialBill;
    expect(initialBill?.title).toBe('A bill');
    expect(initialBill?.fullText).toMatchObject({ content: '', version: 'IH' });
  });
});
