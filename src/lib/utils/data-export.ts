/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data Export Utilities
 *
 * Provides CSV and JSON export functionality for civic data tables.
 * Follows CIV.IQ principles: transparency through data access.
 */

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

/**
 * Convert data array to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  if (data.length === 0) return '';

  // Header row
  const header = columns.map(col => escapeCSV(col.label)).join(',');

  // Data rows
  const rows = data.map(row => {
    return columns
      .map(col => {
        const value = getNestedValue(row, col.key as string);
        const formatted = col.format ? col.format(value, row) : String(value ?? '');
        return escapeCSV(formatted);
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Convert data array to JSON string with metadata
 */
export function toJSON<T>(
  data: T[],
  metadata?: {
    source?: string;
    exportDate?: string;
    description?: string;
  }
): string {
  const exportData = {
    metadata: {
      source: metadata?.source ?? 'CIV.IQ - Civic Intelligence Platform',
      exportDate: metadata?.exportDate ?? new Date().toISOString(),
      description: metadata?.description ?? 'Exported civic data',
      recordCount: data.length,
    },
    data,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download data as CSV file
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csv = toCSV(data, columns);
  const filenameWithExt = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  downloadFile(csv, filenameWithExt, 'text/csv;charset=utf-8;');
}

/**
 * Download data as JSON file
 */
export function downloadJSON<T>(
  data: T[],
  filename: string,
  metadata?: {
    source?: string;
    description?: string;
  }
): void {
  const json = toJSON(data, {
    ...metadata,
    exportDate: new Date().toISOString(),
  });
  const filenameWithExt = filename.endsWith('.json') ? filename : `${filename}.json`;
  downloadFile(json, filenameWithExt, 'application/json');
}

/**
 * Escape CSV special characters
 */
function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Get nested object value using dot notation
 * e.g., getNestedValue(obj, 'contact.phone') -> obj.contact.phone
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Generate export filename with timestamp
 */
export function generateExportFilename(prefix: string, extension: 'csv' | 'json'): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${date}.${extension}`;
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: unknown): string {
  if (typeof value !== 'number') return '';
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/**
 * Format date for export
 */
export function formatDateForExport(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  const datePart = date.toISOString().split('T')[0];
  return datePart ?? ''; // YYYY-MM-DD
}

/**
 * Format percentage for export
 */
export function formatPercentageForExport(value: unknown, decimals = 1): string {
  if (typeof value !== 'number') return '';
  return `${value.toFixed(decimals)}%`;
}
