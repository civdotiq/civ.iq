'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, ExternalLink, FileText } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';
import { PreambleInsightsSection } from '@/components/intelligence/PreambleInsightsSection';

interface FederalRegisterDocument {
  title: string;
  abstract: string | null;
  type: string;
  publication_date: string;
  action: string | null;
  dates: string | null;
  html_url: string;
  pdf_url: string | null;
  docket_ids: string[];
  agencies: Array<{
    name: string;
    slug: string;
  }>;
}

interface Hearing {
  packageId: string;
  title: string;
  congress: number;
  chamber: 'House' | 'Senate' | 'Joint';
  dateIssued: string;
  url: string;
  relevance: 'direct' | 'topical';
}

interface OversightCommittee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface RegulationHearingsResponse {
  documentNumber: string;
  regulationTitle: string;
  agency: string;
  hearings: Hearing[];
  oversightCommittees: OversightCommittee[];
  metadata: {
    generatedAt: string;
    dataSources: string[];
    joinType: string;
    dataQuality: 'complete' | 'partial' | 'degraded';
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

const FR_FIELDS = [
  'title',
  'abstract',
  'type',
  'publication_date',
  'action',
  'dates',
  'html_url',
  'pdf_url',
  'docket_ids',
  'agencies',
]
  .map(f => `fields[]=${f}`)
  .join('&');

const chamberStyles: Record<string, string> = {
  House: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Senate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Joint: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const relevanceStyles: Record<string, string> = {
  direct: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  topical: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const typeLabels: Record<string, string> = {
  Rule: 'Final Rule',
  'Proposed Rule': 'Proposed Rule',
  Notice: 'Notice',
  'Presidential Document': 'Presidential Document',
};

function buildProvenanceSources(
  dataSources?: string[],
  quality?: 'complete' | 'partial' | 'degraded'
): DataSource[] {
  const sources = dataSources ?? ['government sources'];
  return sources.map(name => ({
    name,
    status: quality === 'degraded' ? ('unavailable' as const) : ('available' as const),
  }));
}

export default function RegulationDetailPage() {
  const params = useParams();
  const documentNumber = params.documentNumber as string;

  const {
    data: doc,
    error: docError,
    isLoading: docLoading,
  } = useSWR<FederalRegisterDocument>(
    `https://www.federalregister.gov/api/v1/documents/${encodeURIComponent(documentNumber)}?${FR_FIELDS}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: hearingsData } = useSWR<RegulationHearingsResponse>(
    `/api/regulations/${encodeURIComponent(documentNumber)}/hearings`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/regulations" className="hover:text-[#3ea2d4]">
            Regulations
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{documentNumber}</span>
        </nav>

        {/* Loading */}
        {docLoading && (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/3" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 mt-6" />
          </div>
        )}

        {/* Error */}
        {docError && !docLoading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Failed to load regulation details
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Federal Register Document: {documentNumber}
              </p>
              <Link
                href="/regulations"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-blue-700"
              >
                Browse Regulations
              </Link>
            </div>
          </div>
        )}

        {/* Document Content */}
        {doc && !docLoading && (
          <div className="space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2 py-0.5 text-xs font-semibold bg-black text-white dark:bg-white dark:text-black">
                  {typeLabels[doc.type] ?? doc.type}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(doc.publication_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {doc.title}
              </h1>

              {doc.agencies.length > 0 && (
                <p className="text-gray-600 dark:text-gray-400">
                  {doc.agencies.map(a => a.name).join(', ')}
                </p>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Document: {documentNumber}
                {doc.docket_ids.length > 0 && <> &middot; Docket: {doc.docket_ids.join(', ')}</>}
              </p>
            </div>

            {/* Abstract */}
            {doc.abstract && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">Summary</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {doc.abstract}
                </p>
              </div>
            )}

            {/* Action & Dates */}
            {(doc.action || doc.dates) && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {doc.action && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        Action
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{doc.action}</p>
                    </div>
                  )}
                  {doc.dates && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                        Dates
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{doc.dates}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-3">
              <a
                href={doc.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[#3ea2d4] transition-colors"
                style={{ borderRadius: 0 }}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View on Federal Register
              </a>
              {doc.pdf_url && (
                <a
                  href={doc.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[#3ea2d4] transition-colors"
                  style={{ borderRadius: 0 }}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Download PDF
                </a>
              )}
            </div>

            {/* Preamble Intelligence */}
            <PreambleInsightsSection documentNumber={documentNumber} />

            {/* Related Committee Hearings */}
            {hearingsData && hearingsData.hearings.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Related Committee Hearings
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Congressional hearings related to this regulation, matched by topic and agency
                  oversight.
                </p>
                <div className="space-y-3" role="list" aria-label="Related hearings">
                  {hearingsData.hearings.map(hearing => (
                    <a
                      key={hearing.packageId}
                      href={hearing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="listitem"
                      className="block p-4 border border-gray-200 dark:border-gray-700 hover:border-[#3ea2d4] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium ${chamberStyles[hearing.chamber] || ''}`}
                        >
                          {hearing.chamber}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium ${relevanceStyles[hearing.relevance] || ''}`}
                        >
                          {hearing.relevance}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {hearing.congress}th Congress
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-2">
                        {hearing.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(hearing.dateIssued).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </a>
                  ))}
                </div>

                <DataProvenance
                  sources={buildProvenanceSources(
                    hearingsData.metadata?.dataSources,
                    hearingsData.metadata?.dataQuality
                  )}
                  generatedAt={hearingsData.metadata?.generatedAt}
                  quality={hearingsData.metadata?.dataQuality}
                  className="mt-4"
                />
              </div>
            )}

            {/* Oversight Committees */}
            {hearingsData && hearingsData.oversightCommittees.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Oversight Committees
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Congressional committees with jurisdiction over this regulation&apos;s agency.
                </p>
                <div className="space-y-2" role="list" aria-label="Oversight committees">
                  {hearingsData.oversightCommittees.map(committee => (
                    <Link
                      key={committee.code}
                      href={`/committee/${committee.code}`}
                      role="listitem"
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 hover:border-[#3ea2d4] hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {committee.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium ${chamberStyles[committee.chamber] || ''}`}
                      >
                        {committee.chamber}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Data source */}
            <DataProvenance
              sources={[{ name: 'Federal Register API', status: 'available' }]}
              generatedAt={new Date().toISOString()}
              quality="complete"
            />
          </div>
        )}
      </main>
    </div>
  );
}
