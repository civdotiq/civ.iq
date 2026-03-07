/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { FileText, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import type { SecFilingsResponse, SecFiling } from '@/types/sec-edgar';

interface SecFilingsSectionProps {
  bioguideId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

/**
 * SEC EDGAR Filings Section
 *
 * Shows SEC Form 4 (insider trading) filings related to companies
 * that a representative has traded. Appears below the STOCK Act section.
 */
export function SecFilingsSection({ bioguideId }: SecFilingsSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<SecFilingsResponse>(
    `/api/representative/${bioguideId}/sec-filings`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          SEC Filings
        </h4>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 w-1/3"></div>
          <div className="h-12 bg-gray-200"></div>
          <div className="h-12 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          SEC Filings
        </h4>
        <div className="text-center py-4">
          <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-gray-500 mb-3">Unable to load SEC filing data</p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-civiq-blue border border-blue-200 hover:bg-blue-50"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data or no filings — hide section
  if (!data?.success || (data.filings.length === 0 && !data.company)) {
    return null;
  }

  const filings = data.filings.slice(0, 10);

  return (
    <div className="bg-white border-2 border-black p-6 mt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        SEC Filings
      </h4>
      <p className="text-sm text-gray-600 mb-4">
        Form 4 insider trading filings from SEC EDGAR
        {data.company && (
          <span>
            {' '}
            for <span className="font-medium">{data.company.name}</span>
            {data.company.tickers.length > 0 && (
              <span className="text-gray-500"> ({data.company.tickers.join(', ')})</span>
            )}
          </span>
        )}
      </p>

      {filings.length > 0 ? (
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-6 sm:px-0">
            <table className="min-w-full" role="table" aria-label="SEC Form 4 filings">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Filing Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Form
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filings.map(filing => (
                  <FilingRow key={filing.accessionNumber} filing={filing} cik={data.company?.cik} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 py-2">
          No recent Form 4 filings found for this company.
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
        <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
        <span>Data from SEC EDGAR. No API key required.</span>
      </div>
    </div>
  );
}

function FilingRow({ filing, cik }: { filing: SecFiling; cik?: string }) {
  const formattedDate = formatFilingDate(filing.filingDate);
  const accessionClean = filing.accessionNumber.replace(/-/g, '');
  const edgarUrl = cik
    ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${filing.primaryDocument}`
    : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&accession=${filing.accessionNumber}`;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formattedDate}</td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
          {filing.form}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate">
        {filing.description || 'Statement of changes in beneficial ownership'}
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <a
          href={edgarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-civiq-blue hover:underline"
          aria-label={`View SEC filing ${filing.accessionNumber}`}
        >
          EDGAR
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </td>
    </tr>
  );
}

function formatFilingDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
