/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';
import type { VariantFacetGroup } from './types';

interface VariantFacetCardProps {
  readonly groups: ReadonlyArray<VariantFacetGroup>;
}

export function VariantFacetCard({ groups }: VariantFacetCardProps) {
  if (groups.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 14,
        border: '2px solid var(--ink)',
        padding: 14,
        background: 'var(--bg1)',
      }}
    >
      <CqLabel>Refine</CqLabel>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {groups.map(group => (
          <div key={group.title}>
            <CqLabel color="ink">{group.title}</CqLabel>
            <div
              style={{
                marginTop: 6,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {group.options.map(opt => {
                const rowStyle = {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  padding: '5px 0',
                  color: 'var(--fg1)',
                  textDecoration: 'none',
                  fontWeight: opt.active ? 700 : 400,
                };
                const inner = (
                  <>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span
                        aria-hidden
                        style={{
                          width: 12,
                          height: 12,
                          border: '2px solid var(--ink)',
                          background: opt.active ? 'var(--civiq-blue)' : 'transparent',
                          display: 'inline-block',
                        }}
                      />
                      {opt.label}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: 'var(--fg3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {opt.count === null ? '—' : opt.count.toLocaleString('en-US')}
                    </span>
                  </>
                );
                if (opt.href) {
                  return (
                    <Link key={opt.label} href={opt.href} style={rowStyle}>
                      {inner}
                    </Link>
                  );
                }
                return (
                  <div key={opt.label} style={rowStyle}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
