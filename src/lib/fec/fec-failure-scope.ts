/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * FEC failure scope — lets a caller learn whether any FEC call made on its
 * behalf failed transiently (429, 5xx, timeout, open breaker), even when a
 * lower layer caught the error and returned an empty result.
 *
 * Several FECApiService methods turn errors into `[]` so their many callers
 * never crash. That is safe to render but unsafe to *describe* or *cache*: an
 * empty employer list caused by a 429 is not "donors listed no employer". Wrap
 * the work in `trackFecFailures` and check `transientFailures` before caching
 * or wording an empty result as real "no data".
 *
 * Carried through AsyncLocalStorage, the same way fec-rate-limiter carries
 * priority, so nested calls need no signature changes. Scopes nest: a failure
 * is counted in every enclosing scope.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

interface FailureScope {
  transientFailures: number;
  parent: FailureScope | undefined;
}

const scopeStore = new AsyncLocalStorage<FailureScope>();

/** 429 (rate limit), 5xx, and status 0 (timeout / network / no response). */
export function isTransientFecStatus(status: number): boolean {
  return status === 0 || status === 429 || status >= 500;
}

/** Record one transient FEC failure in the current scope and all enclosing ones. */
export function recordTransientFecFailure(): void {
  for (let scope = scopeStore.getStore(); scope; scope = scope.parent) {
    scope.transientFailures++;
  }
}

/** Run `fn` and report how many transient FEC failures happened inside it. */
export async function trackFecFailures<T>(
  fn: () => Promise<T>
): Promise<{ value: T; transientFailures: number }> {
  const scope: FailureScope = { transientFailures: 0, parent: scopeStore.getStore() };
  const value = await scopeStore.run(scope, fn);
  return { value, transientFailures: scope.transientFailures };
}
