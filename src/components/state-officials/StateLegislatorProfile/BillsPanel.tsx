/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { CqChip, CqLabel } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import type { StateBill } from '@/types/state-legislature';

interface BillsPanelProps {
  legislatorIdBase64: string;
  stateCode: string;
}

interface BillsApiResponse {
  success: boolean;
  bills: StateBill[];
  total: number;
  returned: number;
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

function statusFor(b: StateBill): string {
  if (b.latest_action_description) return b.latest_action_description;
  if (b.status) return String(b.status);
  return 'Introduced';
}

export function BillsPanel({ legislatorIdBase64, stateCode }: BillsPanelProps) {
  const { data, isLoading } = useSWR<BillsApiResponse>(
    `/api/state-legislature/${stateCode}/legislator/${legislatorIdBase64}/bills`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const bills = data?.bills ?? [];
  const recent = bills.slice(0, 8);
  const totalBills = data?.total ?? bills.length;
  const session = bills[0]?.session;

  return (
    <div>
      <PanelHeader
        eyebrow={
          totalBills > 0
            ? `${totalBills} sponsored${session ? ` · ${session} session` : ''}`
            : 'Sponsored legislation'
        }
        title="Recently sponsored"
        source={{ name: 'OpenStates', id: 'bills' }}
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
          Data unavailable — no sponsored bills returned for this legislator.
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
          {recent.map(b => (
            <div
              key={b.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 130px 110px',
                gap: 12,
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.identifier}</span>
              <span style={{ fontSize: 13 }}>{b.title}</span>
              <CqChip variant="info" filled={false} size="sm">
                {statusFor(b)}
              </CqChip>
              <span style={{ fontSize: 11, color: 'var(--fg3)', fontFamily: 'var(--font-mono)' }}>
                {formatDate(b.first_action_date ?? b.created_at)}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
