/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * /regulations/{number} 404s only when the Federal Register answers 404; an
 * outage is "unavailable" (the page is noindexed and says so).
 */

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { lookupFederalRegisterDocument } from '@/lib/data-sources/federal-register-service';

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

function respond(status: number, body: unknown = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as jest.Mock;
}

describe('lookupFederalRegisterDocument', () => {
  it('finds a document the Federal Register has', async () => {
    respond(200, { document_number: '2026-21843', title: 'A rule' });
    expect(await lookupFederalRegisterDocument('2026-21843')).toEqual({
      status: 'found',
      document: { document_number: '2026-21843', title: 'A rule' },
    });
  });

  it('is not_found on a 404 (a well-formed made-up number like 2026-99999)', async () => {
    respond(404);
    expect(await lookupFederalRegisterDocument('2026-99999')).toEqual({ status: 'not_found' });
  });

  it('is unavailable, never not_found, when the API fails', async () => {
    respond(503);
    expect(await lookupFederalRegisterDocument('2026-21843')).toEqual({ status: 'unavailable' });
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as jest.Mock;
    expect(await lookupFederalRegisterDocument('2026-21843')).toEqual({ status: 'unavailable' });
  });
});
