/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import type { VariantSidebarItem } from './types';

interface VariantSidebarProps {
  readonly heading: string;
  readonly items: ReadonlyArray<VariantSidebarItem>;
}

export function VariantSidebar({ heading, items }: VariantSidebarProps) {
  return (
    <div style={{ border: '2px solid var(--ink)', background: 'var(--bg1)' }}>
      <div
        style={{
          background: 'var(--fg1)',
          color: 'var(--bg1)',
          padding: '10px 14px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {heading}
      </div>
      {items.map((item, i) => {
        const rowStyle = {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 14px',
          background: item.active ? 'var(--bg2)' : 'var(--bg1)',
          borderTop: i === 0 ? 0 : '1px solid var(--line)',
          borderLeft: `3px solid ${item.active ? 'var(--civiq-blue)' : 'transparent'}`,
          fontFamily: 'var(--font-primary)',
          fontSize: 13,
          fontWeight: item.active ? 700 : 500,
          color: 'var(--fg1)',
          textAlign: 'left' as const,
          textDecoration: 'none',
        };
        const inner = (
          <>
            <span>{item.label}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.count === null ? '—' : item.count.toLocaleString('en-US')}
            </span>
          </>
        );
        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              style={rowStyle}
            >
              {inner}
            </Link>
          );
        }
        return (
          <div key={item.key} style={rowStyle}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
