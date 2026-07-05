/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Map over `items` with at most `limit` concurrent invocations of `fn`,
 * preserving input order in the returned array.
 *
 * Callers fan out to many *independent* network calls (one bill, one
 * recipient, one district at a time) that were historically awaited
 * serially. A bounded worker pool runs them in parallel without unleashing
 * unbounded concurrency on CPU-bound work or rate-limited gov APIs. Results
 * map 1:1 to inputs by index, so callers can zip them back against the
 * source list. A rejecting `fn` rejects the whole call (same failure
 * semantics as `Promise.all`); wrap `fn` if you want per-item fail-soft
 * behavior.
 *
 * Lives in a dependency-free module on purpose: analyzers/shared.ts
 * re-exports it, but importing from there drags the AI provider chain into
 * the caller's module graph — API routes should import from here.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  };

  const poolSize = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  return results;
}
