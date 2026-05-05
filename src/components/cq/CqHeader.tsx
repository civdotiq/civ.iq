'use client';

import Link from 'next/link';
import { CqLogoMark } from './CqLogoMark';
import { CqSearchGlyph } from './CqSearchGlyph';

export type CqNavKey = 'find' | 'bills' | 'states' | 'method' | 'about';

interface CqHeaderProps {
  current?: CqNavKey;
  searchPlaceholder?: string;
}

const NAV_ITEMS: ReadonlyArray<readonly [CqNavKey, string, string]> = [
  ['find', 'Find officials', '/'],
  ['bills', 'Bills', '/bills'],
  ['states', 'State overviews', '/states'],
  ['method', 'Methodology', '/methodology'],
  ['about', 'About', '/about'],
];

export function CqHeader({
  current = 'find',
  searchPlaceholder = 'Address, name, bill, or ZIP',
}: CqHeaderProps) {
  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg1)',
        borderBottom: '2px solid var(--ink)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 32,
        fontFamily: 'var(--font-primary)',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <CqLogoMark size={24} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            color: 'var(--fg1)',
          }}
        >
          CIV<span style={{ color: 'var(--civiq-red)' }}>.</span>IQ
        </span>
      </Link>

      <nav style={{ display: 'flex', gap: 0, height: '100%' }}>
        {NAV_ITEMS.map(([k, label, href]) => {
          const active = current === k;
          return (
            <Link
              key={k}
              href={href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: active ? 'var(--fg1)' : 'var(--fg2)',
                textDecoration: 'none',
                borderBottom: `3px solid ${active ? 'var(--ink)' : 'transparent'}`,
                marginBottom: -2,
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <form
        action="/search"
        method="get"
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          border: '2px solid var(--ink)',
          height: 36,
          paddingLeft: 12,
          gap: 10,
          background: 'var(--bg1)',
        }}
      >
        <CqSearchGlyph size={14} color="var(--fg1)" />
        <input
          name="q"
          placeholder={searchPlaceholder}
          aria-label="Search CIV.IQ"
          style={{
            border: 0,
            outline: 'none',
            fontFamily: 'var(--font-primary)',
            fontSize: 12,
            width: 280,
            color: 'var(--fg1)',
            background: 'transparent',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: '0.04em',
            padding: '0 10px',
            borderLeft: '1px solid var(--line)',
            height: 36,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ⌘K
        </span>
      </form>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--fg3)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        No ads · No signups
      </span>
    </header>
  );
}
