/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Recent regulations list — replaces the reference IssueTopic.jsx
 * "Milestones · last 12 months" timeline. The reference timeline mixes
 * bill markups, hearings, CBO scores, and enactments; we don't have a
 * unified milestone source. Federal Register publishes are a
 * defensible real-data substitute.
 */

import { CqLabel } from '@/components/cq';
import { isoToReadable } from './data';
import type { RegulationRow } from './types';

interface RegulationsListProps {
  regulations: RegulationRow[];
  loading: boolean;
}

const VISIBLE = 6;

export function RegulationsList({ regulations, loading }: RegulationsListProps) {
  return (
    <div style={{ border: '2px solid var(--ink)', padding: 18 }}>
      <CqLabel>Recent regulations · Federal Register</CqLabel>
      <ul
        style={{
          listStyle: 'none',
          margin: '12px 0 0',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {loading && regulations.length === 0 ? (
          <SkeletonRows />
        ) : regulations.length === 0 ? (
          <li
            style={{
              fontSize: 12,
              color: 'var(--fg2)',
              lineHeight: 1.5,
            }}
          >
            No recent Federal Register entries match this policy area.
          </li>
        ) : (
          regulations.slice(0, VISIBLE).map((reg, i, arr) => (
            <li
              key={reg.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gap: 10,
                paddingBottom: 8,
                borderBottom: i === arr.length - 1 ? 0 : '1px solid var(--line)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {isoToReadable(reg.publishedDate)}
              </span>
              <a
                href={reg.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: 'var(--fg1)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ fontWeight: 500 }}>{reg.title}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg3)',
                    marginTop: 2,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {reg.agency}
                </div>
              </a>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr',
            gap: 10,
            paddingBottom: 8,
            borderBottom: i === 3 ? 0 : '1px solid var(--line)',
          }}
        >
          <div style={{ height: 11, background: 'var(--bg3)', opacity: 0.6 }} />
          <div>
            <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6, marginBottom: 6 }} />
            <div style={{ height: 9, background: 'var(--bg3)', opacity: 0.4, width: '50%' }} />
          </div>
        </li>
      ))}
    </>
  );
}
