'use client';

import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SectorLeaderboard } from '@/components/intelligence/SectorLeaderboard';
import { CascadeSection } from '@/components/mesh/CascadeSection';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';
import { CommitteeLink, BillLink, PACLink, LobbyLink } from '@/components/shared/links/EntityLinks';
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

interface IndustryOrganizationsResponse {
  topPACs: Array<{
    committeeId: string;
    name: string;
    sector: string;
    totalDisbursements: number;
  }>;
  topLobbyingOrgs: Array<{
    registrantId: string;
    name: string;
    totalSpending: number;
    filingCount: number;
  }>;
  metrics: {
    totalLobbyingSpending: number;
    activePACCount: number;
    activeLobbyingOrgCount: number;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
}

interface EnforcementInsightResponse {
  stats: {
    totalActions: number;
    totalPenalties: number;
    byAgency: Array<{ agency: string; count: number; penalties: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    periodMonths: number;
  };
  actions: Array<{
    agency: string;
    actionType: string;
    organization: string;
    penaltyAmount: number;
    date: string;
  }>;
  narrative: string;
  confidence: number;
  dataAsOf: string;
  disclaimer: string;
}

interface FdaRecall {
  recallNumber: string;
  reportDate: string;
  classification: 'Class I' | 'Class II' | 'Class III';
  status: string;
  productDescription: string;
  reasonForRecall: string;
  recallingFirm: string;
  state: string;
}

interface RecallsResponse {
  sector: string;
  recalls: FdaRecall[];
  summary: { total: number; classI: number; classII: number; classIII: number };
  dataSource: string;
  message?: string;
}

interface PharmaPayment {
  recordId: string;
  payerName: string;
  recipientState: string;
  recipientSpecialty: string;
  totalAmount: number;
  paymentNature: string;
  programYear: number;
}

interface PharmaAggregates {
  state: string;
  totalPayments: number;
  totalAmount: number;
  byCompany: Array<{ company: string; count: number; totalAmount: number }>;
  bySpecialty: Array<{ specialty: string; count: number; totalAmount: number }>;
}

interface PharmaPaymentsResponse {
  state: string | null;
  aggregates: PharmaAggregates | null;
  recentPayments: PharmaPayment[];
  dataSource: string;
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

  const { data: enforcementData } = useSWR<EnforcementInsightResponse>(
    `/api/intelligence/enforcement/sector/${encodeURIComponent(sector)}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const { data: orgsData } = useSWR<IndustryOrganizationsResponse>(
    `/api/industry/${encodeURIComponent(sector)}/organizations`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const { data: recallsData } = useSWR<RecallsResponse>(
    `/api/industry/${encodeURIComponent(sector)}/recalls`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  // Pharma payments only for Health sector
  const isHealthSector = sector.toLowerCase() === 'health';
  const { data: pharmaData } = useSWR<PharmaPaymentsResponse>(
    isHealthSector ? '/api/industry/health/pharma-payments' : null,
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

        {orgsData?.metrics && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Active PACs</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {orgsData.metrics.activePACCount}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Lobbying orgs</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {orgsData.metrics.activeLobbyingOrgCount}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">
                Lobbying spending
              </span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                $
                {orgsData.metrics.totalLobbyingSpending >= 1_000_000
                  ? `${(orgsData.metrics.totalLobbyingSpending / 1_000_000).toFixed(1)}M`
                  : orgsData.metrics.totalLobbyingSpending >= 1_000
                    ? `${(orgsData.metrics.totalLobbyingSpending / 1_000).toFixed(0)}K`
                    : orgsData.metrics.totalLobbyingSpending.toLocaleString()}
              </p>
            </div>
          </div>
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

          {/* Major Organizations */}
          {orgsData && (orgsData.topPACs.length > 0 || orgsData.topLobbyingOrgs.length > 0) && (
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Major organizations
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                These are the largest political action committees and lobbying organizations active
                in {displayName.toLowerCase()}, based on public FEC and Senate disclosure filings.
              </p>

              {orgsData.topPACs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                    Top PACs
                  </h3>
                  <div className="space-y-1">
                    {orgsData.topPACs.map(pac => (
                      <div
                        key={pac.committeeId}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <PACLink
                          committeeId={pac.committeeId}
                          name={pac.name}
                          className="text-sm font-medium"
                        />
                        {pac.totalDisbursements > 0 && (
                          <span className="text-xs text-gray-500 tabular-nums">
                            $
                            {pac.totalDisbursements >= 1_000_000
                              ? `${(pac.totalDisbursements / 1_000_000).toFixed(1)}M`
                              : pac.totalDisbursements >= 1_000
                                ? `${(pac.totalDisbursements / 1_000).toFixed(0)}K`
                                : pac.totalDisbursements.toLocaleString()}{' '}
                            disbursed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {orgsData.topLobbyingOrgs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                    Top lobbying organizations
                  </h3>
                  <div className="space-y-1">
                    {orgsData.topLobbyingOrgs.map(org => (
                      <div
                        key={org.registrantId}
                        className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
                      >
                        <LobbyLink
                          registrantId={org.registrantId}
                          name={org.name}
                          className="text-sm font-medium"
                        />
                        <span className="text-xs text-gray-500 tabular-nums">
                          $
                          {org.totalSpending >= 1_000_000
                            ? `${(org.totalSpending / 1_000_000).toFixed(1)}M`
                            : org.totalSpending >= 1_000
                              ? `${(org.totalSpending / 1_000).toFixed(0)}K`
                              : org.totalSpending.toLocaleString()}{' '}
                          · {org.filingCount} filing{org.filingCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DataSourceAttribution
                sourceName="FEC, Senate LDA"
                sourceUrl="https://www.fec.gov"
                reliability="high"
                variant="compact"
                className="mt-4"
              />
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
      {enforcementData && enforcementData.stats && enforcementData.stats.totalActions > 0 && (
        <EnforcementLandscape enforcement={enforcementData} displayName={displayName} />
      )}

      {/* FDA Recalls */}
      {recallsData && recallsData.recalls.length > 0 && (
        <RecallsSection recalls={recallsData} displayName={displayName} />
      )}

      {/* Pharma Payments (Health sector only) */}
      {pharmaData && (pharmaData.aggregates ?? pharmaData.recentPayments.length > 0) && (
        <PharmaPaymentsSection data={pharmaData} />
      )}

      {/* Sector Leaderboard */}
      <SectorLeaderboard initialSector={data?.sector ?? sector} />

      {/* Funding Impact Simulation */}
      <CascadeSection sector={data?.sector ?? sector} />
    </div>
  );
}

// ── Enforcement Landscape ─────────────────────────────────────────────

const TREND_LABELS: Record<string, string> = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
};

function formatPenalty(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function EnforcementLandscape({
  enforcement,
  displayName,
}: {
  enforcement: EnforcementInsightResponse;
  displayName: string;
}) {
  const { stats, narrative, actions } = enforcement;

  // Deduplicate top orgs from actions
  const orgCounts = new Map<string, { count: number; penalties: number }>();
  for (const action of actions) {
    const existing = orgCounts.get(action.organization) ?? { count: 0, penalties: 0 };
    orgCounts.set(action.organization, {
      count: existing.count + 1,
      penalties: existing.penalties + action.penaltyAmount,
    });
  }
  const topOrgs = [...orgCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Enforcement landscape
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Federal enforcement activity in the {displayName.toLowerCase()} sector from EPA, OSHA, and
        CFPB public records.
      </p>

      {/* Narrative */}
      {narrative && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 border-l-[3px] border-civiq-blue pl-3">
          {narrative}
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Total actions</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats.totalActions}</p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Total penalties</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatPenalty(stats.totalPenalties)}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Trend</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {TREND_LABELS[stats.trend] ?? stats.trend}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Agencies</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {stats.byAgency.length}
          </p>
        </div>
      </div>

      {/* Agency breakdown */}
      {stats.byAgency.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            By agency
          </h3>
          <div className="space-y-1">
            {stats.byAgency.map(a => (
              <div
                key={a.agency}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {a.agency}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {a.count} action{a.count !== 1 ? 's' : ''} · {formatPenalty(a.penalties)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top cited organizations */}
      {topOrgs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            Most cited organizations
          </h3>
          <div className="space-y-1">
            {topOrgs.map(([name, data]) => (
              <div
                key={name}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <span className="text-sm text-gray-900 dark:text-gray-100">{name}</span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {data.count} action{data.count !== 1 ? 's' : ''}
                  {data.penalties > 0 ? ` · ${formatPenalty(data.penalties)}` : ''}
                </span>
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
  );
}

// ── FDA Recalls Section ───────────────────────────────────────────────

const CLASS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  'Class I': { label: 'Class I', bg: 'bg-amber-100', text: 'text-amber-800' },
  'Class II': { label: 'Class II', bg: 'bg-gray-100', text: 'text-gray-700' },
  'Class III': { label: 'Class III', bg: 'bg-gray-50', text: 'text-gray-500' },
};

function RecallsSection({
  recalls,
  displayName,
}: {
  recalls: RecallsResponse;
  displayName: string;
}) {
  const { summary } = recalls;

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Active recalls</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        FDA enforcement reports for products related to {displayName.toLowerCase()}. Class I recalls
        indicate a reasonable probability of serious health consequences.
      </p>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Total</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</p>
        </div>
        {summary.classI > 0 && (
          <div>
            <span className="text-xs tracking-wider text-amber-600 uppercase">Class I</span>
            <p className="text-xl font-bold text-amber-700">{summary.classI}</p>
          </div>
        )}
        {summary.classII > 0 && (
          <div>
            <span className="text-xs tracking-wider text-gray-500 uppercase">Class II</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.classII}</p>
          </div>
        )}
        {summary.classIII > 0 && (
          <div>
            <span className="text-xs tracking-wider text-gray-500 uppercase">Class III</span>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{summary.classIII}</p>
          </div>
        )}
      </div>

      {/* Recall list */}
      <div className="space-y-2">
        {recalls.recalls.slice(0, 10).map(recall => {
          const cls = CLASS_STYLES[recall.classification] ?? {
            label: recall.classification,
            bg: 'bg-gray-50',
            text: 'text-gray-500',
          };
          return (
            <div
              key={recall.recallNumber}
              className="border border-gray-200 dark:border-gray-700 p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {recall.recallingFirm}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium ${cls.bg} ${cls.text} flex-shrink-0`}
                >
                  {cls.label}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {recall.reasonForRecall}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(recall.reportDate).toLocaleDateString()} · {recall.state}
              </p>
            </div>
          );
        })}
        {recalls.recalls.length > 10 && (
          <p className="text-xs text-gray-400">Showing 10 of {recalls.recalls.length} recalls</p>
        )}
      </div>

      <DataSourceAttribution
        sourceName="openFDA"
        sourceUrl="https://open.fda.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

// ── Pharma Payments Section ──────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function PharmaPaymentsSection({ data }: { data: PharmaPaymentsResponse }) {
  const agg = data.aggregates;

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Pharma industry payments
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Payments from pharmaceutical and medical device companies to healthcare providers, as
        reported under the Sunshine Act. Transparency into financial relationships that shape health
        policy.
      </p>

      {/* Aggregates */}
      {agg && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Total payments</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {agg.totalPayments.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-xs tracking-wider text-gray-500 uppercase">Total amount</span>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatAmount(agg.totalAmount)}
              </p>
            </div>
          </div>

          {/* Top companies */}
          {agg.byCompany.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Top paying companies
              </h3>
              <div className="space-y-1">
                {agg.byCompany.slice(0, 5).map(c => (
                  <div
                    key={c.company}
                    className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{c.company}</span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatAmount(c.totalAmount)} · {c.count.toLocaleString()} payments
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top specialties */}
          {agg.bySpecialty.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Top receiving specialties
              </h3>
              <div className="space-y-1">
                {agg.bySpecialty.slice(0, 5).map(s => (
                  <div
                    key={s.specialty}
                    className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
                  >
                    <span className="text-sm text-gray-900 dark:text-gray-100">{s.specialty}</span>
                    <span className="text-xs text-gray-500 tabular-nums">
                      {formatAmount(s.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Recent payments (when no aggregates) */}
      {!agg && data.recentPayments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            Recent payments
          </h3>
          <div className="space-y-1">
            {data.recentPayments.slice(0, 10).map(p => (
              <div
                key={p.recordId}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <div>
                  <span className="text-sm text-gray-900 dark:text-gray-100">{p.payerName}</span>
                  <span className="text-xs text-gray-400 ml-2">{p.recipientSpecialty}</span>
                </div>
                <span className="text-xs text-gray-500 tabular-nums">
                  {formatAmount(p.totalAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataSourceAttribution
        sourceName="CMS Open Payments"
        sourceUrl="https://openpaymentsdata.cms.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}
