'use client';

import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SectorLeaderboard } from '@/components/intelligence/SectorLeaderboard';
import { CascadeSection } from '@/components/mesh/CascadeSection';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';
import { CommitteeLink, BillLink } from '@/components/shared/links/EntityLinks';
import { DataSourceAttribution } from '@/components/shared/ui/DataSourceAttribution';

interface SectorBill {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  url: string;
}

interface SectorCommittee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface IndustryConnectionsResponse {
  sector: string;
  relatedPolicyAreas: string[];
  relatedAgencies: string[];
  committees: SectorCommittee[];
  recentBills: SectorBill[];
  metadata: {
    generatedAt: string;
    dataSources: string[];
    joinType: string;
    dataQuality: 'complete' | 'partial' | 'degraded';
  };
}

interface EnforcementData {
  actionCount: number;
  topOrganizations: Array<{ name: string; actionCount: number }>;
  agencyBreakdown: Record<string, number>;
  narrative?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

const chamberStyles: Record<string, string> = {
  House: 'bg-civiq-blue/10 text-civiq-blue',
  Senate: 'bg-gray-200 text-gray-900',
  Joint: 'bg-gray-100 text-gray-700',
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

interface Props {
  sector: string;
  displayName: string;
  wikiSummary?: string | null;
}

export function IndustrySectorClient({ sector, displayName, wikiSummary }: Props) {
  const { data, error, isLoading, mutate } = useSWR<IndustryConnectionsResponse>(
    `/api/industry/${encodeURIComponent(sector)}/connections`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: enforcementData } = useSWR<EnforcementData>(
    `/api/intelligence/enforcement/sector/${encodeURIComponent(sector)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  return (
    <div className="space-y-8">
      {/* Sector overview */}
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{displayName}</h1>

        {wikiSummary ? (
          <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed max-w-3xl">
            {wikiSummary}
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">
            Federal legislation, congressional committees, lobbying organizations, and enforcement
            activity related to the {displayName.toLowerCase()} sector.
          </p>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/3 mb-6" />
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 dark:bg-gray-700" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          <div className="text-center py-6">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Failed to load industry connections
            </p>
            <button
              onClick={() => mutate()}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
              aria-label="Retry loading industry connections"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Retry
            </button>
          </div>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Policy Areas */}
          {data.relatedPolicyAreas.length > 0 && (
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Policy areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.relatedPolicyAreas.map(area => (
                  <span
                    key={area}
                    className="px-3 py-1 text-sm bg-civiq-blue/10 text-civiq-blue border border-civiq-blue/20"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Committees */}
          {data.committees.length > 0 && (
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Related committees
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Congressional committees with jurisdiction over this sector.
              </p>
              <div className="space-y-2" role="list" aria-label="Related committees">
                {data.committees.map(committee => (
                  <div
                    key={committee.code}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700"
                  >
                    <CommitteeLink code={committee.code} name={committee.name} />
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${chamberStyles[committee.chamber] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {committee.chamber}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Legislation */}
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Recent legislation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bills in related policy areas for this industry sector.
            </p>

            {data.recentBills.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No recent legislation found for this sector.
              </p>
            ) : (
              <div className="space-y-3" role="list" aria-label="Recent bills">
                {data.recentBills.map(bill => (
                  <div key={bill.id} className="p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <BillLink
                        billId={bill.id}
                        title={`${bill.type.toUpperCase()}. ${bill.number}`}
                        className="font-semibold text-sm"
                      />
                      {bill.policyArea && (
                        <span className="px-2 py-0.5 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20">
                          {bill.policyArea}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-2">
                      {bill.title}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <DataProvenance
              sources={buildProvenanceSources(
                data.metadata?.dataSources,
                data.metadata?.dataQuality
              )}
              generatedAt={data.metadata?.generatedAt}
              quality={data.metadata?.dataQuality}
              className="mt-4"
            />
          </div>

          {/* Related Agencies */}
          {data.relatedAgencies.length > 0 && (
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Related federal agencies
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.relatedAgencies.map(agency => (
                  <span
                    key={agency}
                    className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  >
                    {agency}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Enforcement landscape */}
      {enforcementData && enforcementData.actionCount > 0 && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Enforcement landscape
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Federal agencies enforce regulations in this sector. This is a summary of recent
            enforcement activity from EPA and OSHA public records.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Total actions</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {enforcementData.actionCount}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Agencies</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {Object.keys(enforcementData.agencyBreakdown).length}
              </p>
            </div>
          </div>

          {enforcementData.topOrganizations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Most cited organizations
              </h3>
              <div className="space-y-1">
                {enforcementData.topOrganizations.slice(0, 5).map(org => (
                  <div
                    key={org.name}
                    className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{org.name}</span>
                    <span className="text-xs text-gray-500">{org.actionCount} actions</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DataSourceAttribution
            sourceName="EPA ECHO, OSHA, CFPB"
            sourceUrl="https://echo.epa.gov"
            reliability="high"
            variant="compact"
            className="mt-4"
          />
        </div>
      )}

      {/* Sector Leaderboard */}
      <SectorLeaderboard initialSector={data?.sector ?? sector} />

      {/* Funding Impact Simulation */}
      <CascadeSection sector={data?.sector ?? sector} />
    </div>
  );
}
