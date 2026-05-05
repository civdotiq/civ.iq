'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { EnhancedRepresentative } from '@/types/representative';

interface BillsPanelProps {
  representative: EnhancedRepresentative;
}

interface Bill {
  id: string;
  number: string;
  title: string;
  introducedDate: string;
  status: string;
  congress: number;
  type: string;
  policyArea?: string;
  relationship?: 'sponsored' | 'cosponsored';
}

interface BillsResponse {
  sponsored?: { count: number; bills: Bill[] };
  cosponsored?: { count: number; bills: Bill[] };
  totalSponsored?: number;
  totalCosponsored?: number;
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function formatDate(date: string | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function billHref(b: Bill): string | null {
  if (!b.type || !b.number || !b.congress) return null;
  const cleanType = b.type.toLowerCase().replace(/\./g, '');
  const cleanNumber = b.number.match(/\d+/)?.[0];
  if (!cleanNumber) return null;
  return `/bill/${b.congress}-${cleanType}-${cleanNumber}`;
}

export function BillsPanel({ representative: r }: BillsPanelProps) {
  const { data, isLoading } = useSWR<BillsResponse>(
    `/api/representative/${r.bioguideId}/bills`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const sponsored = data?.sponsored?.bills ?? [];
  const totalSponsored = data?.totalSponsored ?? data?.sponsored?.count ?? sponsored.length;
  const totalCosponsored = data?.totalCosponsored ?? data?.cosponsored?.count ?? 0;
  const recent = sponsored.slice(0, 8);
  const congress = sponsored[0]?.congress ?? 119;

  return (
    <div>
      <PanelHeader
        eyebrow={
          totalSponsored > 0
            ? `${totalSponsored} sponsored · ${totalCosponsored} co-sponsored · ${congress} Congress`
            : 'Sponsored legislation'
        }
        title="Recently sponsored"
        source={{ name: 'Congress.gov', id: 'sponsored' }}
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
          Loading bills…
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
          Data unavailable — no sponsored bills returned for this member.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 130px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid var(--ink)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            {['Bill', 'Title', 'Status', 'Introduced'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {recent.map(b => {
            const href = billHref(b);
            return (
              <div
                key={b.id || b.number}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 130px 110px',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: '1px solid var(--line)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {href ? (
                    <Link
                      href={href}
                      style={{ color: 'var(--civiq-blue)', textDecoration: 'none' }}
                    >
                      {b.number}
                    </Link>
                  ) : (
                    b.number
                  )}
                </span>
                <span style={{ fontSize: 13 }}>{b.title}</span>
                <CqChip variant="info" filled={false} size="sm">
                  {b.status || 'Introduced'}
                </CqChip>
                <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(b.introducedDate)}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
