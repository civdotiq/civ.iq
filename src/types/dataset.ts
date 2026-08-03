/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bulk Dataset Types
 *
 * Types for downloadable bulk datasets published on the /open page.
 * Every dataset includes metadata envelope, column definitions,
 * and supports both CSV and JSON output formats.
 */

export type FormatType = 'csv' | 'json';

export interface DatasetColumn {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean';
}

export interface DatasetMetadata {
  name: string;
  slug: string;
  description: string;
  source: string;
  sourceUrl: string;
  generated: string;
  recordCount: number;
  license: string;
  columns: DatasetColumn[];
}

export interface DatasetResult<T = unknown> {
  metadata: DatasetMetadata;
  data: T[];
}

export interface DatasetGenerator {
  slug: string;
  name: string;
  description: string;
  source: string;
  sourceUrl: string;
  approximateRows: string;
  freshness: string;
  columnLabels: string[];
  /** Column key used to identify rows for change detection (e.g. 'bioguideId', 'billNumber') */
  keyColumn: string;
  /**
   * Skip snapshot storage and row-level change detection for this dataset.
   *
   * Change detection keeps a full copy of the previous version in Redis and
   * rewrites it on every generation. That is cheap for a few hundred rows and
   * ruinous for a hundred thousand — a multi-megabyte SET per download request,
   * on a Redis budget this project has already been suspended for exceeding.
   *
   * Set only for datasets that are large AND already carry their own provenance
   * (a generatedAt stamp and freshness canary), where a row-level diff would
   * add nothing a consumer could act on.
   */
  skipDiff?: boolean;
  generate: () => Promise<DatasetResult | null>;
}

/** A single change detected between two versions of a dataset */
export interface DatasetDiffEntry {
  /** Which dataset changed */
  dataset: string;
  /** Type of change */
  type: 'added' | 'modified' | 'removed';
  /** The key value identifying the changed row */
  key: string;
  /** ISO timestamp when the change was detected */
  detectedAt: string;
  /** For modified rows: which fields changed (field → [old, new]) */
  changes?: Record<string, [unknown, unknown]>;
  /** Summary of the change in human-readable form */
  summary: string;
}

/** Stored diff result for a dataset regeneration */
export interface DatasetDiffResult {
  dataset: string;
  generatedAt: string;
  entries: DatasetDiffEntry[];
  stats: {
    added: number;
    modified: number;
    removed: number;
  };
}
