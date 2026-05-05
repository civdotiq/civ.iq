'use client';

import useSWR from 'swr';
import { CqBar, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { EnhancedRepresentative } from '@/types/representative';

interface MoneyPanelProps {
  representative: EnhancedRepresentative;
}

interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  cycle?: number;
  metadata?: { dataFromCycle?: number };
}

interface BatchFinanceResponse {
  data?: { finance?: FinanceData };
}

interface IndustriesResponse {
  topIndustries?: Array<{
    industry: string;
    amount: number;
    percentage: number;
  }>;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const batchFinance = (bioguideId: string) => async () => {
  const r = await fetch(`/api/representative/${bioguideId}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoints: ['finance'] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null || !Number.isFinite(amount)) return '—';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

const SOURCE_COLORS = ['blue', 'vlau', 'greige', 'amber'] as const;

export function MoneyPanel({ representative: r }: MoneyPanelProps) {
  const { data: batch, isLoading: batchLoading } = useSWR<BatchFinanceResponse>(
    `money-batch:${r.bioguideId}`,
    batchFinance(r.bioguideId),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: industries } = useSWR<IndustriesResponse>(
    `/api/representative/${r.bioguideId}/finance/industries`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const finance = batch?.data?.finance;
  const cycle = finance?.cycle ?? finance?.metadata?.dataFromCycle ?? 2024;
  const total = finance?.totalRaised;

  const sources =
    finance && total && total > 0
      ? [
          {
            label: 'Individual contributions',
            amount: finance.individualContributions ?? 0,
            color: 'blue' as const,
            sub: 'Itemized + unitemized',
          },
          {
            label: 'Industry & PAC',
            amount: finance.pacContributions ?? 0,
            color: 'vlau' as const,
            sub: 'Federal PACs',
          },
          {
            label: 'Party committees',
            amount: finance.partyContributions ?? 0,
            color: 'greige' as const,
            sub: 'Party transfers',
          },
          {
            label: 'Self / loans',
            amount: finance.candidateContributions ?? 0,
            color: 'amber' as const,
            sub: 'Candidate funds',
          },
        ].map(s => ({ ...s, pct: total > 0 ? Math.round((s.amount / total) * 100) : 0 }))
      : [];

  const topIndustries = industries?.topIndustries ?? [];
  const maxPct = topIndustries.reduce((m, ind) => Math.max(m, ind.percentage), 1);

  return (
    <div>
      <PanelHeader
        eyebrow={
          finance && total
            ? `${cycle} cycle · FEC filings · ${formatCurrency(total)} raised`
            : 'FEC filings'
        }
        title="Where the money came from"
        source={{ name: 'FEC.gov', id: 'cycle filings' }}
      />

      {batchLoading ? (
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
      ) : sources.length === 0 ? (
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
          Data unavailable — no FEC summary returned for the {cycle} cycle.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              height: 48,
              border: '2px solid var(--ink)',
              marginBottom: 12,
            }}
          >
            {sources.map((s, i) => (
              <div
                key={s.label}
                style={{
                  width: `${Math.max(s.pct, 0)}%`,
                  background: `var(--data-${s.color === 'blue' ? 'vlau' : s.color})`,
                  borderRight: i === sources.length - 1 ? 0 : '2px solid var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {s.pct >= 7 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {s.pct}%
                  </span>
                )}
              </div>
            ))}
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginTop: 20 }}
          >
            <div>
              {sources.map((s, i) => (
                <CqBar
                  key={s.label}
                  label={s.label}
                  pct={s.pct}
                  amount={formatCurrency(s.amount)}
                  color={SOURCE_COLORS[i] ?? 'blue'}
                  sub={s.sub}
                />
              ))}
              {finance && (
                <div style={{ marginTop: 16 }}>
                  <CqPlainReading>
                    {`${formatCurrency(total)} raised in the ${cycle} cycle. Cash on hand: ${formatCurrency(finance.cashOnHand)}. Spent: ${formatCurrency(finance.totalSpent)}.`}
                  </CqPlainReading>
                </div>
              )}
            </div>
            <div>
              <CqLabel>Industry codes</CqLabel>
              <h4 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 12px' }}>
                Top industries
              </h4>
              {topIndustries.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    padding: '12px 0',
                  }}
                >
                  Industry breakdown unavailable.
                </div>
              ) : (
                topIndustries.slice(0, 5).map((ind, i) => (
                  <div
                    key={ind.industry}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px 1fr 80px',
                      gap: 10,
                      alignItems: 'center',
                      padding: '10px 0',
                      borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
                    }}
                  >
                    <span
                      style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg3)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{ind.industry}</div>
                      <div style={{ height: 6, background: 'var(--bg3)', marginTop: 4 }}>
                        <div
                          style={{
                            width: `${(ind.percentage / maxPct) * 100}%`,
                            height: '100%',
                            background: 'var(--data-vlau)',
                          }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatCurrency(ind.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
