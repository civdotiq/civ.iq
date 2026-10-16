/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import {
  isTransientFecStatus,
  recordTransientFecFailure,
  trackFecFailures,
} from '@/lib/fec/fec-failure-scope';

describe('fec-failure-scope', () => {
  test('transient = 429, 5xx, or no response; 4xx "no data" is not', () => {
    expect(isTransientFecStatus(429)).toBe(true);
    expect(isTransientFecStatus(503)).toBe(true);
    expect(isTransientFecStatus(0)).toBe(true);
    expect(isTransientFecStatus(404)).toBe(false);
    expect(isTransientFecStatus(422)).toBe(false);
  });

  test('counts failures recorded anywhere inside the scope, across awaits', async () => {
    const { value, transientFailures } = await trackFecFailures(async () => {
      await Promise.all([
        (async () => {
          await Promise.resolve();
          recordTransientFecFailure();
        })(),
        (async () => recordTransientFecFailure())(),
      ]);
      return 'done';
    });
    expect(value).toBe('done');
    expect(transientFailures).toBe(2);
  });

  test('a failure counts in every enclosing scope, not in sibling scopes', async () => {
    const outer = await trackFecFailures(async () => {
      const inner = await trackFecFailures(async () => recordTransientFecFailure());
      const sibling = await trackFecFailures(async () => 'clean');
      return { inner: inner.transientFailures, sibling: sibling.transientFailures };
    });
    expect(outer.value).toEqual({ inner: 1, sibling: 0 });
    expect(outer.transientFailures).toBe(1);
  });

  test('recording outside any scope is a no-op', () => {
    expect(() => recordTransientFecFailure()).not.toThrow();
  });
});
