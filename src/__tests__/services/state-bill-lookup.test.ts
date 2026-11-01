/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * A state bill page 404s only when Open States answers 404. Quota, rate
 * limits and timeouts are "unavailable": Open States allows 1,000 requests a
 * day, and a quota error must never tell search engines a real bill is gone.
 */

const mockGetBillById = jest.fn();
jest.mock('@/lib/openstates-api', () => ({
  openStatesAPI: { getBillById: (id: string) => mockGetBillById(id) },
  OpenStatesUtils: {},
  getCorpusLegislator: jest.fn(),
}));
jest.mock('@/services/cache', () => ({
  govCache: { get: jest.fn().mockResolvedValue(null), set: jest.fn() },
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';

const ID = 'ocd-bill/8dbdea0e-9653-48c1-81bd-ef7f8ec32d81';

describe('StateLegislatureCoreService.lookupStateBill', () => {
  it('is not_found when Open States has no such bill', async () => {
    mockGetBillById.mockResolvedValueOnce(null);
    expect(await StateLegislatureCoreService.lookupStateBill('mi', ID)).toEqual({
      status: 'not_found',
    });
  });

  it('is unavailable when the daily quota is spent', async () => {
    mockGetBillById.mockRejectedValueOnce(new Error('HTTP 429: daily quota exhausted'));
    expect(await StateLegislatureCoreService.lookupStateBill('mi', ID)).toEqual({
      status: 'unavailable',
    });
    // The older null-returning call can't tell these apart; its callers get null.
    mockGetBillById.mockRejectedValueOnce(new Error('HTTP 429: daily quota exhausted'));
    expect(await StateLegislatureCoreService.getStateBillById('mi', ID)).toBeNull();
  });
});
