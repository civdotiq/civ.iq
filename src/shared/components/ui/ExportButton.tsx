/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Download, ChevronDown } from 'lucide-react';
import {
  downloadCSV,
  downloadJSON,
  generateExportFilename,
  ExportColumn,
} from '@/lib/utils/data-export';

interface ExportButtonProps<T extends Record<string, unknown>> {
  /** Data to export */
  data: T[];
  /** Column definitions for CSV export */
  columns: ExportColumn<T>[];
  /** Base filename (without extension) */
  filename: string;
  /** Optional description for JSON metadata */
  description?: string;
  /** Button size variant */
  size?: 'sm' | 'md';
  /** Disable the button */
  disabled?: boolean;
  /** aria-label for accessibility */
  ariaLabel?: string;
}

/**
 * Export button with dropdown for CSV/JSON format selection.
 * Follows Aicher design system with clean, functional styling.
 */
export function ExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  description,
  size = 'sm',
  disabled = false,
  ariaLabel = 'Export data',
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: 'csv' | 'json') => {
      if (data.length === 0 || isExporting) return;

      setIsExporting(true);
      setIsOpen(false);

      try {
        const exportFilename = generateExportFilename(filename, format);

        if (format === 'csv') {
          downloadCSV(data, columns, exportFilename);
        } else {
          downloadJSON(data, exportFilename, {
            source: 'CIV.IQ - Civic Intelligence Platform',
            description: description ?? `Export of ${filename}`,
          });
        }
      } finally {
        // Brief delay for UX feedback
        setTimeout(() => setIsExporting(false), 500);
      }
    },
    [data, columns, filename, description, isExporting]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    },
    [isOpen]
  );

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent, format: 'csv' | 'json') => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExport(format);
      }
    },
    [handleExport]
  );

  const isDisabled = disabled || data.length === 0;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`
          inline-flex items-center gap-1.5 font-medium
          border-2 border-black bg-white text-gray-700
          hover:bg-gray-50 hover:border-civiq-blue
          focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-black
          transition-colors duration-150
          ${sizeClasses[size]}
        `}
      >
        <Download className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
        <span>{isExporting ? 'Exporting...' : 'Export'}</span>
        <ChevronDown
          className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* Dropdown menu */}
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 z-20 mt-1 w-36 origin-top-right border-2 border-black bg-white shadow-sm"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => handleExport('csv')}
              onKeyDown={e => handleMenuKeyDown(e, 'csv')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <span className="font-mono text-xs text-gray-400">.csv</span>
              <span>CSV File</span>
            </button>
            <div className="border-t border-gray-200" />
            <button
              type="button"
              role="menuitem"
              onClick={() => handleExport('json')}
              onKeyDown={e => handleMenuKeyDown(e, 'json')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <span className="font-mono text-xs text-gray-400">.json</span>
              <span>JSON File</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Simple export button without dropdown - exports single format directly
 */
export function SimpleExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  format = 'csv',
  description,
  size = 'sm',
  disabled = false,
  ariaLabel,
}: ExportButtonProps<T> & { format?: 'csv' | 'json' }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (data.length === 0 || isExporting) return;

    setIsExporting(true);

    try {
      const exportFilename = generateExportFilename(filename, format);

      if (format === 'csv') {
        downloadCSV(data, columns, exportFilename);
      } else {
        downloadJSON(data, exportFilename, {
          source: 'CIV.IQ - Civic Intelligence Platform',
          description: description ?? `Export of ${filename}`,
        });
      }
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  }, [data, columns, filename, format, description, isExporting]);

  const isDisabled = disabled || data.length === 0;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isDisabled}
      aria-label={ariaLabel ?? `Export as ${format.toUpperCase()}`}
      className={`
        inline-flex items-center gap-1.5 font-medium
        border-2 border-black bg-white text-gray-700
        hover:bg-gray-50 hover:border-civiq-blue
        focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-black
        transition-colors duration-150
        ${sizeClasses[size]}
      `}
    >
      <Download className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />
      <span>{isExporting ? 'Exporting...' : `Export ${format.toUpperCase()}`}</span>
    </button>
  );
}
