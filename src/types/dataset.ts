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
  generate: () => Promise<DatasetResult | null>;
}
