/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Shape validation for /regulations/[documentNumber]:
 *   valid `YYYY-NNNNN` or `YYYY-NNNNNN` → render children
 *   anything else                       → 404
 */

class NextNotFoundError extends Error {
  digest = 'NEXT_NOT_FOUND';
}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new NextNotFoundError('NEXT_NOT_FOUND');
  }),
}));

jest.mock('@/components/seo/JsonLd', () => ({
  BreadcrumbSchema: () => null,
}));

import RegulationDetailLayout from '@/app/(civic)/regulations/[documentNumber]/layout';
import { notFound } from 'next/navigation';

async function invoke(documentNumber: string) {
  const result = await RegulationDetailLayout({
    children: null,
    params: Promise.resolve({ documentNumber }),
  });
  return result;
}

describe('/regulations/[documentNumber] shape validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts 5-digit suffix (YYYY-NNNNN)', async () => {
    await invoke('2024-12345');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('accepts 6-digit suffix (YYYY-NNNNNN)', async () => {
    await invoke('2026-123456');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('rejects malformed document numbers with notFound', async () => {
    for (const badId of ['abc', '2024', '24-12345', '2024-123', '2024-1234567']) {
      jest.clearAllMocks();
      await expect(invoke(badId)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(notFound).toHaveBeenCalled();
    }
  });
});
