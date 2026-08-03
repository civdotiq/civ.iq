/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Diff-Aware Dataset Regeneration
 *
 * Wraps the normal dataset generation flow to:
 * 1. Read the previous version from cache
 * 2. Generate a fresh version
 * 3. Compute the diff
 * 4. Store the diff in Redis (capped list, with TTL)
 * 5. Cache the new version
 *
 * Diff history is ephemeral — it expires when the Redis TTL runs out.
 */

import { cache } from '@/lib/cache';
import { computeDatasetDiff } from './diff';
import type { DatasetResult, DatasetGenerator, DatasetDiffResult } from '@/types/dataset';
import logger from '@/lib/logging/simple-logger';

/** Cache key prefix for dataset snapshots (used for diff comparison) */
const SNAPSHOT_PREFIX = 'civiq:dataset:snapshot:';

/** Cache key prefix for diff history */
const DIFF_PREFIX = 'civiq:dataset:diff:';

/** TTL for dataset snapshots: 48 hours */
const SNAPSHOT_TTL = 172_800;

/** TTL for diff history: 7 days */
const DIFF_TTL = 604_800;

/** Maximum diff entries to store per dataset */
const MAX_STORED_DIFFS = 100;

/**
 * Generate a dataset with change detection.
 *
 * Returns the fresh DatasetResult (same as calling generator.generate() directly)
 * but also computes and stores the diff against the previous version.
 */
export async function regenerateWithDiff(
  generator: DatasetGenerator
): Promise<DatasetResult | null> {
  const { slug, keyColumn, skipDiff } = generator;

  // Datasets that opt out are generated and returned directly. Storing a
  // snapshot of one would write megabytes to Redis on every request.
  if (skipDiff) {
    return generator.generate();
  }

  // Step 1: Read the previous snapshot from cache
  const snapshotKey = `${SNAPSHOT_PREFIX}${slug}`;
  let oldSnapshot: DatasetResult | null = null;
  try {
    oldSnapshot = await cache.get<DatasetResult>(snapshotKey);
  } catch {
    // Non-fatal — first run or cache miss
  }

  // Step 2: Generate fresh data
  const newData = await generator.generate();
  if (!newData) {
    return null; // Generator returned null (e.g. campaign-finance cold cache)
  }

  // Step 3: Compute diff
  try {
    const diff = computeDatasetDiff(slug, keyColumn, oldSnapshot, newData);

    // Step 4: Store diff if there are actual changes
    if (diff.entries.length > 0) {
      await storeDiff(slug, diff);

      logger.info('Dataset changes detected', {
        dataset: slug,
        added: diff.stats.added,
        modified: diff.stats.modified,
        removed: diff.stats.removed,
        operation: 'dataset_diff',
      });
    }
  } catch (error) {
    // Diff computation failures are non-fatal — log and continue
    logger.error('Dataset diff computation failed', error as Error, {
      dataset: slug,
      operation: 'dataset_diff',
    });
  }

  // Step 5: Cache the new snapshot for next comparison
  try {
    await cache.set(snapshotKey, newData, SNAPSHOT_TTL);
  } catch {
    // Non-fatal
  }

  return newData;
}

/**
 * Store a diff result, appending to existing history and capping at MAX_STORED_DIFFS entries.
 */
async function storeDiff(slug: string, diff: DatasetDiffResult): Promise<void> {
  const diffKey = `${DIFF_PREFIX}${slug}`;

  // Read existing diffs
  const existing = (await cache.get<DatasetDiffResult[]>(diffKey)) ?? [];

  // Prepend new diff, cap at max
  const updated = [diff, ...existing].slice(0, MAX_STORED_DIFFS);

  await cache.set(diffKey, updated, DIFF_TTL);
}

/**
 * Retrieve stored diff history for a dataset.
 */
export async function getDatasetDiffs(slug: string): Promise<DatasetDiffResult[]> {
  const diffKey = `${DIFF_PREFIX}${slug}`;
  return (await cache.get<DatasetDiffResult[]>(diffKey)) ?? [];
}

/**
 * Retrieve stored diff history for ALL datasets.
 * Returns a flat list of diff entries from all datasets, sorted by time (newest first).
 */
export async function getAllDatasetDiffs(): Promise<DatasetDiffResult[]> {
  // We need to know which datasets exist — import the registry
  const { DATASET_REGISTRY } = await import('./index');

  const results: DatasetDiffResult[] = [];

  for (const dataset of DATASET_REGISTRY) {
    const diffs = await getDatasetDiffs(dataset.slug);
    results.push(...diffs);
  }

  // Sort by generation time, newest first
  results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());

  return results;
}
