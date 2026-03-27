'use client';

import { CommitteeLink, PACLink } from '@/components/shared/links/EntityLinks';
import { DataSourceAttribution } from '@/components/shared/ui/DataSourceAttribution';
import type { LobbyingOrgProfile } from '@/app/api/lobby/[registrantId]/route';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

interface Props {
  profile: LobbyingOrgProfile;
}

export function LobbyOrgClient({ profile }: Props) {
  const hasEnoughData =
    (profile.issueAreas.length > 0 ? 1 : 0) +
      (profile.governmentContacts.length > 0 ? 1 : 0) +
      (profile.yearlySpending.length > 1 ? 1 : 0) +
      (profile.linkedPAC ? 1 : 0) +
      (profile.topClients.length > 0 ? 1 : 0) >=
    3;

  if (!hasEnoughData) {
    return <InfoCard profile={profile} />;
  }

  return (
    <div className="space-y-8">
      <IdentityHeader profile={profile} />
      {profile.issueAreas.length > 0 && <IssuesSection profile={profile} />}
      {profile.governmentContacts.length > 0 && <CongressionalActivity profile={profile} />}
      {profile.linkedPAC && profile.linkedPAC.confidence >= 0.6 && (
        <PACActivity profile={profile} />
      )}
      {profile.yearlySpending.length > 1 && <SpendingChart profile={profile} />}
      {profile.topClients.length > 0 && <TopClients profile={profile} />}
    </div>
  );
}

function InfoCard({ profile }: Props) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{profile.name}</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Lobbying organization registered with the U.S. Senate. Limited data available for a full
        profile.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Total spending</span>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(profile.totalSpending)}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Filings</span>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {profile.totalFilings}
          </p>
        </div>
      </div>
      <a
        href={`https://lda.senate.gov/filings/public/filing/search/?registrant_id=${profile.registrantId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#3ea2d4] hover:underline text-sm"
      >
        View filings on Senate.gov
      </a>
      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function IdentityHeader({ profile }: Props) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <div className="flex items-start gap-6">
        {profile.wiki?.imageUrl && (
          <img
            src={profile.wiki.imageUrl}
            alt={profile.name}
            className="w-20 h-20 object-contain flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {profile.name}
          </h1>

          {profile.wiki?.summary ? (
            <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
              {profile.wiki.summary}
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 mb-3">
              Lobbying organization registered with the U.S. Senate.
            </p>
          )}

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Organizations that lobby the federal government are required to file public reports with
            the U.S. Senate. This page shows {profile.name}&apos;s public filings.
          </p>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Total spending</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(profile.totalSpending)}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Filings</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {profile.totalFilings}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Lobbyists</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {profile.lobbyistCount}
          </p>
        </div>
        <div>
          <span className="text-xs tracking-wider text-gray-500 uppercase">Active since</span>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {profile.firstFilingYear ?? '—'}
          </p>
        </div>
      </div>

      {/* PAC badge */}
      {profile.linkedPAC && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {profile.linkedPAC.confidence >= 0.8 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Also operates{' '}
              <PACLink committeeId={profile.linkedPAC.committeeId} name={profile.linkedPAC.name} />
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              May be associated with{' '}
              <PACLink committeeId={profile.linkedPAC.committeeId} name={profile.linkedPAC.name} />
            </p>
          )}
        </div>
      )}

      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function IssuesSection({ profile }: Props) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Issues and policy areas
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        These are the policy areas {profile.name} reported lobbying on in its filings with the U.S.
        Senate.
      </p>

      <div className="flex flex-wrap gap-2">
        {profile.issueAreas.map(issue => (
          <span
            key={issue.code}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
          >
            {issue.label}
            <span className="ml-1.5 text-xs text-gray-500">({issue.filingCount})</span>
          </span>
        ))}
      </div>

      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function CongressionalActivity({ profile }: Props) {
  const committees = profile.governmentContacts.filter(g => g.committeeCode);
  const agencies = profile.governmentContacts.filter(g => !g.committeeCode);

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Congressional activity
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        These are the committees and agencies {profile.name} reported contacting in its lobbying
        filings. This is a self-reported field in the organization&apos;s own filings.
      </p>

      {committees.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            Committees
          </h3>
          <div className="space-y-1">
            {committees.slice(0, 15).map(contact => (
              <div
                key={contact.name}
                className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <CommitteeLink code={contact.committeeCode} name={contact.name} />
                <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {contact.filingCount} filings
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {agencies.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
            Agencies
          </h3>
          <div className="flex flex-wrap gap-2">
            {agencies.slice(0, 15).map(contact => (
              <span
                key={contact.name}
                className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              >
                {contact.name}
                <span className="ml-1.5 text-xs text-gray-500">({contact.filingCount})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function PACActivity({ profile }: Props) {
  if (!profile.linkedPAC) return null;

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">PAC activity</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This organization also operates a political action committee (PAC), which makes campaign
        contributions to candidates for federal office. PAC contributions are reported to the
        Federal Election Commission.
      </p>

      <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <PACLink committeeId={profile.linkedPAC.committeeId} name={profile.linkedPAC.name} />
        <p className="text-sm text-gray-500 mt-1">
          FEC Committee ID: {profile.linkedPAC.committeeId}
        </p>
        {profile.linkedPAC.confidence < 0.8 && (
          <p className="text-xs text-gray-400 mt-1">
            Association based on name matching (moderate confidence)
          </p>
        )}
      </div>

      <DataSourceAttribution
        sourceName="Federal Election Commission"
        sourceUrl="https://www.fec.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function SpendingChart({ profile }: Props) {
  const maxSpending = Math.max(...profile.yearlySpending.map(y => y.spending));

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Spending over time
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        {profile.name}&apos;s reported lobbying spending over time, from Senate disclosure filings.
      </p>

      <div className="space-y-2">
        {profile.yearlySpending.map(year => (
          <div key={year.year} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right flex-shrink-0">
              {year.year}
            </span>
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-6">
              <div
                className="bg-gray-700 dark:bg-gray-400 h-6"
                style={{
                  width: maxSpending > 0 ? `${(year.spending / maxSpending) * 100}%` : '0%',
                }}
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-right flex-shrink-0">
              {formatCurrency(year.spending)}
            </span>
          </div>
        ))}
      </div>

      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

function TopClients({ profile }: Props) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Clients</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Organizations that hired {profile.name} to lobby on their behalf, as reported in Senate
        filings.
      </p>

      <div className="space-y-1">
        {profile.topClients.map(client => (
          <div
            key={client.name}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0"
          >
            <span className="text-sm text-gray-900 dark:text-gray-100">{client.name}</span>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {client.filingCount} filings
            </span>
          </div>
        ))}
      </div>

      <DataSourceAttribution
        sourceName="U.S. Senate Lobbying Disclosure Act"
        sourceUrl="https://lda.senate.gov"
        reliability="high"
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}
