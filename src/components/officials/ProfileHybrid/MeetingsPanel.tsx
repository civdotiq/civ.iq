'use client';

import useSWR from 'swr';
import { CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { EnhancedRepresentative } from '@/types/representative';

interface MeetingsPanelProps {
  representative: EnhancedRepresentative;
}

interface LobbyingCompany {
  name: string;
  registrantId: string | null;
  totalSpending: number;
  committees: string[];
  recentFilings: number;
}

interface CommitteeBreakdownItem {
  committee: string;
  totalSpending: number;
  companyCount: number;
  topIssues: string[];
}

interface LobbyingResponse {
  lobbyingData?: {
    totalRelevantSpending: number;
    affectedCommittees: number;
    topCompanies: LobbyingCompany[];
    committeeBreakdown: CommitteeBreakdownItem[];
  };
  metadata?: { coveragePeriod?: string; note?: string };
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function MeetingsPanel({ representative: r }: MeetingsPanelProps) {
  const { data, isLoading } = useSWR<LobbyingResponse>(
    `/api/representative/${r.bioguideId}/lobbying`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const lobbying = data?.lobbyingData;
  const companies = lobbying?.topCompanies ?? [];
  const recent = companies.slice(0, 8);
  const period = data?.metadata?.coveragePeriod;
  const note = data?.metadata?.note;

  return (
    <div>
      <PanelHeader
        eyebrow={
          period && companies.length > 0
            ? `Senate LDA · ${period} · ${companies.length} registrant${companies.length === 1 ? '' : 's'}`
            : 'Senate LDA disclosures'
        }
        title="Lobbying activity"
        source={{ name: 'Senate LDA', id: 'filings' }}
      />
      {isLoading ? (
        <div
          style={{
            padding: '40px 0',
            textAlign: 'center',
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
          }}
        >
          Loading filings…
        </div>
      ) : recent.length === 0 ? (
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {note ?? 'Data unavailable — no LDA filings tied to this member’s committees.'}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 110px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {['Registrant', 'Committees', 'Filings', 'Spending'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {recent.map(c => (
            <div
              key={c.registrantId ?? c.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 110px 110px',
                gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
              <span style={{ fontSize: 11, color: 'var(--fg2)' }}>
                {c.committees.slice(0, 2).join(', ') || '—'}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {c.recentFilings}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompact(c.totalSpending)}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              LDA disclosures show that lobbying contact occurred and the topic — not what was said.
              Linked to this member through their committee jurisdiction.
            </CqPlainReading>
          </div>
        </>
      )}
    </div>
  );
}
