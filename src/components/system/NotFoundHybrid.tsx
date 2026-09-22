/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * NotFoundHybrid — redesigned 404 page (PR 8).
 *
 * Reference: docs/design/civ-iq-redesign/project/redesign/SystemPages.jsx
 *   → NotFoundPage. File-stamp aesthetic preserved (black hero block,
 *   180×180 status frame, monospace ref code, three "try one of these"
 *   shortcut cards). Replaces src/app/not-found.tsx outright — Next's
 *   not-found.tsx doesn't see searchParams, so there's no ?v=new gate.
 */

import Link from 'next/link';
import { CqLabel } from '@/components/cq';

const SHORTCUTS: ReadonlyArray<{
  href: string;
  eyebrow: string;
  title: string;
  body: string;
}> = [
  {
    href: '/',
    eyebrow: 'Officials',
    title: 'Find your representative',
    body: 'Enter your full street address. Returns federal and state officials, plus 5 pilot cities for local government.',
  },
  {
    href: '/legislation',
    eyebrow: 'Bills',
    title: 'Browse Congress',
    body: 'Bills indexed across federal and state legislatures. Full text, plain-language summaries, voting records.',
  },
  {
    href: '/states',
    eyebrow: 'States',
    title: 'Pick a state',
    body: '50 state pages. Federal delegation, legislature, executives, and federal spending receipts.',
  },
] as const;

export function NotFoundHybrid() {
  return (
    <div
      className="px-4 pt-8 pb-14 sm:px-9"
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Black file-stamp hero */}
      <div
        className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-10 items-center p-6 sm:px-14 sm:py-12"
        style={{ background: '#000', color: '#fff', border: '2px solid #000' }}
      >
        <div
          className="hidden md:block"
          style={{
            width: 180,
            height: 180,
            position: 'relative',
            border: '3px solid #fff',
            background: 'transparent',
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,0.06) 8px 16px)',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: '#9ca3af',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
              }}
            >
              Status
            </div>
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                marginTop: 4,
              }}
            >
              404
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#9ca3af',
                letterSpacing: 'var(--tracking-label)',
                marginTop: 8,
                textTransform: 'uppercase',
              }}
            >
              Not in record
            </div>
          </div>
        </div>
        <div>
          <h1
            className="text-4xl sm:text-6xl"
            style={{
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 0.95,
              margin: '0 0 14px',
              textTransform: 'uppercase',
              color: '#fff',
            }}
          >
            That page
            <br />
            is not in the record.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: '#d1d5db', margin: 0, maxWidth: 600 }}>
            We did not find anything matching this URL. The page may have been renamed, moved into a
            different Congress, or simply never existed.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-primary)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                background: 'var(--civiq-blue)',
                color: '#fff',
                border: '2px solid var(--civiq-blue)',
                borderRadius: 'var(--radius-interactive)',
                padding: '12px 18px',
                fontSize: 12,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Search by address →
            </Link>
            <Link
              href="/states"
              style={{
                fontFamily: 'var(--font-primary)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                background: 'transparent',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: 'var(--radius-interactive)',
                padding: '12px 18px',
                fontSize: 12,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Browse states
            </Link>
          </div>
        </div>
      </div>

      {/* TRY ONE OF THESE */}
      <section style={{ marginTop: 32 }} aria-labelledby="shortcuts">
        <CqLabel as="div" style={{ marginBottom: 8 }}>
          <span id="shortcuts">Try one of these</span>
        </CqLabel>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ border: '2px solid var(--ink)' }}>
          {SHORTCUTS.map(s => (
            <Link
              key={s.title}
              href={s.href}
              className="border-b md:border-b-0 md:border-r last:border-0"
              style={{
                padding: '24px 22px',
                textDecoration: 'none',
                color: 'var(--fg1)',
                borderColor: 'var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <CqLabel>{s.eyebrow}</CqLabel>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{s.title}</div>
              <p style={{ fontSize: 13, color: 'var(--fg2)', margin: 0, lineHeight: 1.5 }}>
                {s.body}
              </p>
              <span
                style={{
                  marginTop: 'auto',
                  fontSize: 11,
                  color: 'var(--civiq-blue-active)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                }}
              >
                Open →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* FOOTER NOTE */}
      <div
        style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: '2px solid var(--ink)',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          letterSpacing: 'var(--tracking-label)',
        }}
      >
        If you reached this page from another site, the source link is broken. Report it via{' '}
        <a
          href="https://github.com/civdotiq/civ.iq/issues"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--civiq-blue-active)' }}
        >
          GitHub issues
        </a>
        .
      </div>
    </div>
  );
}
