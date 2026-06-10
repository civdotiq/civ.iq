/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CommitteeHeader } from '@/features/influence/components/CommitteeHeader';
import { RecipientsByParty } from '@/features/influence/components/RecipientsByParty';
import { MetricCard } from '@/features/campaign-finance/components/MetricCard';
import { SortableDataTable } from '@/features/campaign-finance/components/SortableDataTable';
import { PACVoteTable } from '@/components/intelligence/PACVoteTable';
import { InsightCard, pacVoteKeyStats } from '@/components/intelligence/InsightCard';
import { SectorLink, LobbyLink } from '@/components/shared/links/EntityLinks';
import type { CommitteeProfile, ResolvedRecipient } from '@/types/influence';
import type { PACVoteInsight } from '@/lib/intelligence/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function getPartyBadgeClass(party: string | null): string {
  if (!party) return 'bg-gray-200 text-gray-700';
  if (party === 'Democratic' || party === 'Democrat') return 'bg-party-dem text-white';
  if (party === 'Republican') return 'bg-[#e11d07] text-white';
  return 'bg-gray-500 text-white';
}

function getPartyAbbrev(party: string | null): string {
  if (!party) return '';
  if (party === 'Democratic' || party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return 'I';
}

// Extend ResolvedRecipient with index properties for the table
interface RecipientTableRow extends Record<string, unknown> {
  recipientName: string;
  party: string | null;
  state: string | null;
  chamber: string | null;
  totalAmount: number;
  transactionCount: number;
  bioguideId: string | null;
  civiqProfileLink: string | null;
}

function toTableRow(r: ResolvedRecipient): RecipientTableRow {
  return {
    recipientName: r.recipientName,
    party: r.party,
    state: r.state,
    chamber: r.chamber,
    totalAmount: r.totalAmount,
    transactionCount: r.transactionCount,
    bioguideId: r.bioguideId,
    civiqProfileLink: r.civiqProfileLink,
  };
}

interface CommitteeProfileClientProps {
  profile: CommitteeProfile;
  sector?: string | null;
  pacTypeExplanation?: string | null;
  parentOrgSummary?: string | null;
}

const fetcher = (url: string) => fetch(url).then(r => (r.ok ? r.json() : null));

export function CommitteeProfileClient({
  profile,
  sector,
  pacTypeExplanation,
  parentOrgSummary,
}: CommitteeProfileClientProps) {
  const { committee, totals, recipients, metadata } = profile;

  const { data: pacInsight } = useSWR<PACVoteInsight>(
    `/api/intelligence/pac/${committee.committeeId}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Search for related lobbying registrant by deriving org name from PAC name
  const lobbySearchName = committee.name
    .replace(/\s+(PAC|POLITICAL ACTION COMMITTEE|FUND|COMMITTEE)$/i, '')
    .replace(/\s+(FOR GOOD GOVERNMENT|FOR AMERICA|EMPLOYEES?)$/i, '')
    .trim();
  const { data: lobbyMatch } = useSWR<{
    registrantId: string;
    name: string;
    totalSpending: number;
    issueAreas: Array<{ code: string; label: string }>;
  } | null>(
    lobbySearchName.length > 5
      ? `/api/lobby/search?q=${encodeURIComponent(lobbySearchName)}`
      : null,
    async (url: string) => {
      // Search Senate LDA for registrants matching this name
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  const tableData = recipients.map(toTableRow);

  const columns = [
    {
      key: 'recipientName' as const,
      label: 'Recipient',
      sortable: true,
      format: (value: unknown) => {
        const matchingRow = tableData.find(r => r.recipientName === value);
        if (matchingRow?.civiqProfileLink) {
          return (
            <Link
              href={matchingRow.civiqProfileLink}
              className="text-[#3ea2d4] dark:text-[#5bb8e6] hover:underline font-medium"
            >
              {String(value)}
            </Link>
          );
        }
        return <span className="text-gray-900 dark:text-gray-100">{String(value)}</span>;
      },
    },
    {
      key: 'party' as const,
      label: 'Party',
      sortable: true,
      format: (value: unknown) => {
        const party = value as string | null;
        if (!party) return <span className="text-gray-400">-</span>;
        return (
          <span
            className={`inline-block px-2 py-0.5 text-xs font-bold ${getPartyBadgeClass(party)}`}
          >
            {getPartyAbbrev(party)}
          </span>
        );
      },
    },
    {
      key: 'state' as const,
      label: 'State',
      sortable: true,
      format: (value: unknown) => {
        const state = value as string | null;
        return <span>{state ?? '-'}</span>;
      },
    },
    {
      key: 'chamber' as const,
      label: 'Chamber',
      sortable: true,
      format: (value: unknown) => {
        const chamber = value as string | null;
        return <span>{chamber ?? '-'}</span>;
      },
    },
    {
      key: 'totalAmount' as const,
      label: 'Amount',
      sortable: true,
      format: (value: unknown) => (
        <span className="font-mono font-bold">{formatCurrency(value as number)}</span>
      ),
    },
    {
      key: 'transactionCount' as const,
      label: 'Transactions',
      sortable: true,
      format: (value: unknown) => <span>{(value as number).toLocaleString()}</span>,
    },
  ];

  // Filter for recipients linked to CIV.IQ profiles
  const linkedRecipients = recipients.filter(r => r.bioguideId !== null);

  return (
    <div className="space-y-6">
      {/* Committee Header */}
      <CommitteeHeader
        name={committee.name}
        committeeType={committee.type}
        designation={committee.designation}
        state={committee.state}
        treasurerName={committee.treasurerName}
        fecUrl={committee.fecUrl}
        party={committee.party}
      />

      {/* Sector & PAC Type */}
      {(sector || pacTypeExplanation || parentOrgSummary) && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          {sector && (
            <div className="mb-3">
              <span className="text-xs tracking-wider text-gray-500 uppercase">Sector</span>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                <SectorLink sector={sector} />
              </p>
            </div>
          )}
          {pacTypeExplanation && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{pacTypeExplanation}</p>
          )}
          {parentOrgSummary && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed">
              {parentOrgSummary}
              <span className="text-xs text-gray-400 ml-1">— Wikipedia</span>
            </p>
          )}
        </div>
      )}

      {/* Financial Summary */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            title="Total Receipts"
            mainValue={formatCompact(totals.receipts)}
            mainColor="green"
          />
          <MetricCard
            title="Total Disbursements"
            mainValue={formatCompact(totals.disbursements)}
            mainColor="red"
          />
          <MetricCard
            title="Cash on Hand"
            mainValue={formatCompact(totals.cashOnHand)}
            mainColor="blue"
          />
        </div>
      )}

      {/* Recipients Table */}
      {recipients.length > 0 &&
        (() => {
          const contributions = tableData.filter(r => r.totalAmount >= 0);
          const refunds = tableData.filter(r => r.totalAmount < 0);

          return (
            <>
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Contributions ({contributions.length})
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {metadata.resolvedRecipients} linked to CIV.IQ profiles
                  </span>
                </div>
                <SortableDataTable<RecipientTableRow>
                  data={contributions}
                  columns={columns}
                  defaultSortKey="totalAmount"
                  showInitially={25}
                />
              </div>

              {refunds.length > 0 && (
                <div>
                  <div className="mb-3">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      Refunds ({refunds.length})
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Negative amounts represent money returned to this committee, typically due to
                      contributions that exceeded legal limits or were otherwise rejected.
                    </p>
                  </div>
                  <SortableDataTable<RecipientTableRow>
                    data={refunds}
                    columns={columns}
                    defaultSortKey="totalAmount"
                    showInitially={25}
                  />
                </div>
              )}
            </>
          );
        })()}

      {/* Party Breakdown Chart - only show if we have party data */}
      {linkedRecipients.length > 0 && <RecipientsByParty recipients={linkedRecipients} />}

      {/* Voting alignment */}
      {pacInsight && pacInsight.recipientVotes && (
        <div className="space-y-4">
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Voting alignment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This shows how legislators who received contributions from this PAC voted on bills
              related to the PAC&apos;s policy area, compared to the overall average. Alignment does
              not prove influence — it shows a pattern worth understanding.
            </p>
          </div>
          <InsightCard
            title="PAC Vote Tracing"
            insight={pacInsight}
            keyStats={pacVoteKeyStats(pacInsight)}
          />
          <PACVoteTable insight={pacInsight} />
        </div>
      )}

      {/* Related Lobbying Activity */}
      {lobbyMatch && (
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Related lobbying activity
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The organization behind this PAC also files lobbying disclosures with the U.S. Senate.
          </p>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <LobbyLink
              registrantId={lobbyMatch.registrantId}
              name={lobbyMatch.name}
              className="font-medium"
            />
            {lobbyMatch.totalSpending > 0 && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {lobbyMatch.totalSpending >= 1_000_000
                  ? `$${(lobbyMatch.totalSpending / 1_000_000).toFixed(1)}M`
                  : `$${(lobbyMatch.totalSpending / 1_000).toFixed(0)}K`}{' '}
                in reported lobbying spending
              </p>
            )}
            {lobbyMatch.issueAreas.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {lobbyMatch.issueAreas.map(i => (
                  <span
                    key={i.code}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  >
                    {i.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Source Attribution */}
      <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
        Source: Federal Election Commission (FEC.gov) &middot; {metadata.cycle} cycle &middot;{' '}
        <a
          href={metadata.fecTransparencyLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600 dark:hover:text-gray-300 underline"
        >
          View on FEC.gov
        </a>
      </div>
    </div>
  );
}
