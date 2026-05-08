/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel } from '@/components/cq';
import { formatCompactDollars, formatCount } from './data';
import type { LeaderboardEntry, PolicyAreaPayload } from './types';

interface TopicFileAsideProps {
  policyArea: PolicyAreaPayload | null;
  topRecipient: LeaderboardEntry | null;
  industryTotal: number | null;
  loading: boolean;
}

interface Row {
  label: string;
  value: string;
}

export function TopicFileAside({
  policyArea,
  topRecipient,
  industryTotal,
  loading,
}: TopicFileAsideProps) {
  const rows: Row[] = [
    {
      label: 'Bills active',
      value: policyArea ? formatCount(policyArea.bills.length) : loading ? '…' : '—',
    },
    {
      label: 'Regulations active',
      value: policyArea ? formatCount(policyArea.regulations.length) : loading ? '…' : '—',
    },
    {
      label: 'Committees with jurisdiction',
      value: policyArea ? formatCount(policyArea.committees.length) : loading ? '…' : '—',
    },
    {
      label: 'Industry money (cycle)',
      value: industryTotal !== null ? formatCompactDollars(industryTotal) : loading ? '…' : '—',
    },
    {
      label: 'Top recipient',
      value: topRecipient ? topRecipient.name : loading ? '…' : '—',
    },
  ];

  return (
    <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
      <CqLabel>Topic file</CqLabel>
      <ul
        style={{
          listStyle: 'none',
          margin: '10px 0 0',
          padding: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}
      >
        {rows.map((row, i) => (
          <li
            key={row.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '6px 0',
              borderTop: i === 0 ? 0 : '1px solid var(--line)',
              gap: 12,
            }}
          >
            <span style={{ color: 'var(--fg3)' }}>{row.label}</span>
            <span
              style={{
                fontWeight: 700,
                color: 'var(--fg1)',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 180,
              }}
              title={row.value}
            >
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
