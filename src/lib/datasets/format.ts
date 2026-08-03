/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Server-side Dataset Formatters
 *
 * Converts DatasetResult into CSV or JSON for bulk download.
 * CSV includes comment headers with metadata. JSON uses a metadata envelope.
 * Adapted from src/lib/utils/data-export.ts patterns for server-side use.
 */

import type { DatasetResult, FormatType } from '@/types/dataset';

/**
 * Format a dataset result as CSV with metadata comment headers
 */
export function formatCSV(result: DatasetResult): string {
  const { metadata, data } = result;
  const lines: string[] = [];

  // Comment header rows
  lines.push(`# Dataset: ${metadata.name}`);
  lines.push(`# Source: ${metadata.source} (${metadata.sourceUrl})`);
  lines.push(`# Generated: ${metadata.generated}`);
  lines.push(`# Records: ${metadata.recordCount}`);
  lines.push(`# License: ${metadata.license}`);
  lines.push('#');

  if (data.length === 0) return lines.join('\n');

  // Column headers using human-readable labels
  const header = metadata.columns.map(col => escapeCSV(col.label)).join(',');
  lines.push(header);

  // Data rows
  for (const row of data) {
    const values = metadata.columns.map(col => {
      const value = (row as Record<string, unknown>)[col.key];
      return escapeCSV(formatValue(value));
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Format a dataset result as JSON with metadata envelope
 */
export function formatJSON(result: DatasetResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Format a dataset in the requested format
 */
export function formatDataset(result: DatasetResult, format: FormatType): string {
  return format === 'csv' ? formatCSV(result) : formatJSON(result);
}

/**
 * Get content type for a format
 */
export function getContentType(format: FormatType): string {
  return format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8';
}

/** Rows per emitted chunk. Large enough to keep syscalls cheap, small enough to bound memory. */
const STREAM_CHUNK_ROWS = 2000;

/**
 * Yield a dataset as text chunks instead of one string.
 *
 * The complete lobbying corpus is 123,561 rows and roughly 28 MB of CSV.
 * Building that as a single string holds the whole payload in memory twice — the
 * array and its serialization — and a serverless function is the wrong place to
 * do it. Small datasets can still use formatDataset; anything unbounded should
 * stream.
 */
export function* streamDataset(result: DatasetResult, format: FormatType): Generator<string> {
  const { metadata, data } = result;

  if (format === 'json') {
    // Hand-assembled so rows serialize in batches rather than all at once. The
    // envelope matches formatJSON's shape exactly.
    yield `{\n  "metadata": ${JSON.stringify(metadata, null, 2)},\n  "data": [`;
    for (let i = 0; i < data.length; i += STREAM_CHUNK_ROWS) {
      const batch = data.slice(i, i + STREAM_CHUNK_ROWS);
      yield batch
        .map((row, j) => (i + j === 0 ? '' : ',') + '\n    ' + JSON.stringify(row))
        .join('');
    }
    yield '\n  ]\n}\n';
    return;
  }

  yield [
    `# Dataset: ${metadata.name}`,
    `# Source: ${metadata.source} (${metadata.sourceUrl})`,
    `# Generated: ${metadata.generated}`,
    `# Records: ${metadata.recordCount}`,
    `# License: ${metadata.license}`,
    '#',
  ].join('\n');

  if (data.length === 0) return;

  yield '\n' + metadata.columns.map(col => escapeCSV(col.label)).join(',');

  for (let i = 0; i < data.length; i += STREAM_CHUNK_ROWS) {
    const lines: string[] = [];
    for (const row of data.slice(i, i + STREAM_CHUNK_ROWS)) {
      lines.push(
        metadata.columns
          .map(col => escapeCSV(formatValue((row as Record<string, unknown>)[col.key])))
          .join(',')
      );
    }
    yield '\n' + lines.join('\n');
  }
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a value for CSV output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}
