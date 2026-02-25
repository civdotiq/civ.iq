/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * DistrictExportButton — Download complete district data as portable JSON
 *
 * Fetches from /api/district/{id}/export and triggers a browser download.
 * Follows Aicher/Ulm design system: 2px borders, 8px grid, no rounded corners.
 */

import { useState } from 'react';
import { Download } from 'lucide-react';

interface DistrictExportButtonProps {
  districtId: string;
}

export function DistrictExportButton({ districtId }: DistrictExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/district/${districtId}/export`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `district-${districtId}-export.json`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={loading}
        aria-label="Export district data as JSON"
        className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-black bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-civiq-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-civiq-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderRadius: 0 }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span>{loading ? 'Exporting...' : 'Export District Data'}</span>
      </button>
      {error && (
        <p className="mt-2 text-sm" style={{ color: '#e11d07' }}>
          {error}
        </p>
      )}
    </div>
  );
}
