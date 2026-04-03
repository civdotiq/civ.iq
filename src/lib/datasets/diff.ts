/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Dataset Diff Engine
 *
 * Compares two versions of a dataset and produces a list of changes
 * (added, modified, removed rows). Each row is identified by a
 * keyColumn declared in the dataset registry.
 */

import type { DatasetResult, DatasetDiffEntry, DatasetDiffResult } from '@/types/dataset';

/** Maximum number of diff entries to store per dataset */
const MAX_DIFF_ENTRIES = 100;

/** Maximum number of field-level changes to record per modified row */
const MAX_FIELD_CHANGES = 10;

/**
 * Compare two dataset snapshots and return a diff.
 *
 * @param dataset   - Dataset slug (for labeling)
 * @param keyColumn - Column key used to identify rows
 * @param oldData   - Previous dataset version (null if first generation)
 * @param newData   - Newly generated dataset version
 * @returns Diff result with added/modified/removed entries, capped at MAX_DIFF_ENTRIES
 */
export function computeDatasetDiff(
  dataset: string,
  keyColumn: string,
  oldData: DatasetResult | null,
  newData: DatasetResult
): DatasetDiffResult {
  const now = new Date().toISOString();
  const entries: DatasetDiffEntry[] = [];

  // If there's no old data, everything is "added" — but that's not a useful diff
  // for the first generation. Return empty diff.
  if (!oldData || !oldData.data || oldData.data.length === 0) {
    return {
      dataset,
      generatedAt: now,
      entries: [],
      stats: { added: 0, modified: 0, removed: 0 },
    };
  }

  // Build lookup maps by key column
  const oldMap = buildKeyMap(oldData.data as Record<string, unknown>[], keyColumn);
  const newMap = buildKeyMap(newData.data as Record<string, unknown>[], keyColumn);

  // Detect added and modified rows
  for (const [key, newRow] of newMap) {
    const oldRow = oldMap.get(key);

    if (!oldRow) {
      // New row added
      entries.push({
        dataset,
        type: 'added',
        key,
        detectedAt: now,
        summary: summarizeRow('added', key, newRow),
      });
    } else {
      // Check for modifications
      const changes = diffRows(oldRow, newRow);
      if (changes && Object.keys(changes).length > 0) {
        entries.push({
          dataset,
          type: 'modified',
          key,
          detectedAt: now,
          changes,
          summary: summarizeRow('modified', key, newRow, changes),
        });
      }
    }

    if (entries.length >= MAX_DIFF_ENTRIES) break;
  }

  // Detect removed rows (only if we haven't hit the cap)
  if (entries.length < MAX_DIFF_ENTRIES) {
    for (const [key, oldRow] of oldMap) {
      if (!newMap.has(key)) {
        entries.push({
          dataset,
          type: 'removed',
          key,
          detectedAt: now,
          summary: summarizeRow('removed', key, oldRow),
        });

        if (entries.length >= MAX_DIFF_ENTRIES) break;
      }
    }
  }

  const stats = {
    added: entries.filter(e => e.type === 'added').length,
    modified: entries.filter(e => e.type === 'modified').length,
    removed: entries.filter(e => e.type === 'removed').length,
  };

  return { dataset, generatedAt: now, entries, stats };
}

/**
 * Build a Map of key → row for fast lookups.
 * Rows without a valid key value are skipped.
 */
function buildKeyMap(
  rows: Record<string, unknown>[],
  keyColumn: string
): Map<string, Record<string, unknown>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const keyValue = row[keyColumn];
    if (keyValue != null && keyValue !== '') {
      map.set(String(keyValue), row);
    }
  }
  return map;
}

/**
 * Compare two rows field by field. Returns changed fields (field → [old, new])
 * or null if rows are identical.
 */
function diffRows(
  oldRow: Record<string, unknown>,
  newRow: Record<string, unknown>
): Record<string, [unknown, unknown]> | null {
  const changes: Record<string, [unknown, unknown]> = {};
  let count = 0;

  // Check all fields in new row
  const allKeys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);

  for (const field of allKeys) {
    if (count >= MAX_FIELD_CHANGES) break;

    const oldVal = oldRow[field];
    const newVal = newRow[field];

    if (!valuesEqual(oldVal, newVal)) {
      changes[field] = [oldVal, newVal];
      count++;
    }
  }

  return count > 0 ? changes : null;
}

/**
 * Loose equality check suitable for dataset values.
 * Handles strings, numbers, booleans, null/undefined, and simple arrays.
 */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;

  // Normalize string representations of numbers
  if (typeof a === 'string' && typeof b === 'string') {
    return a === b;
  }

  // Compare as JSON for objects/arrays
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  return false;
}

/**
 * Generate a human-readable summary of a change.
 */
function summarizeRow(
  type: 'added' | 'modified' | 'removed',
  key: string,
  row: Record<string, unknown>,
  changes?: Record<string, [unknown, unknown]>
): string {
  switch (type) {
    case 'added':
      return `Added: ${key}`;
    case 'removed':
      return `Removed: ${key}`;
    case 'modified': {
      if (!changes) return `Modified: ${key}`;
      const fields = Object.keys(changes);
      if (fields.length === 1 && fields[0]) {
        const [oldVal, newVal] = changes[fields[0]]!;
        return `${key}: ${fields[0]} changed from "${oldVal}" to "${newVal}"`;
      }
      return `${key}: ${fields.length} field${fields.length === 1 ? '' : 's'} changed (${fields.join(', ')})`;
    }
  }
}
