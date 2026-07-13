/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * AboutHybrid — redesigned /about page (PR 8).
 *
 * Reference: docs/design/civ-iq-redesign/project/redesign/SystemPages.jsx
 *   → AboutPage. Visual treatment preserved (giant masthead, three-pillar
 *   commitments grid, ledger-style coverage table). The reference's fake
 *   staff roster and funding ledger are dropped — CIV.IQ doesn't have a
 *   501(c)(3) yet, no audited financials, no staff names to publish.
 *   Real CIV.IQ stats stay (535 reps, 50 states, MIT/CC-BY).
 */

import Link from 'next/link';
import { CqDisclaimer, CqLabel } from '@/components/cq';

const COMMITMENTS: ReadonlyArray<{
  n: string;
  title: string;
  body: string;
  stat: string;
  cap: string;
}> = [
  {
    n: '01',
    title: 'Free, forever',
    body: 'No paywall. No ads. No signups. Information about who represents you should not require a credit card.',
    stat: '$0',
    cap: 'Charged · all-time',
  },
  {
    n: '02',
    title: 'Independent',
    body: 'No political party, no candidate, no PAC. CIV.IQ ingests primary government data and presents it without endorsement.',
    stat: 'Nonpartisan',
    cap: 'Editorial stance',
  },
  {
    n: '03',
    title: 'Open by default',
    body: 'Source code is MIT-licensed on GitHub. Data is reproducible from public APIs. Both are inspectable; neither is locked behind a vendor.',
    stat: 'MIT',
    cap: 'License · code + data',
  },
] as const;

const HEADLINE_STATS: ReadonlyArray<{ value: string; label: string; caption: string }> = [
  { value: '535', label: 'Members of Congress', caption: '435 House · 100 Senate' },
  { value: '50', label: 'State legislatures', caption: '7,383 legislators' },
  { value: '10', label: 'Pilot cities', caption: 'Local government' },
  { value: '26', label: 'Government data sources', caption: '8 core · 18 supplementary' },
] as const;

const COVERAGE: ReadonlyArray<{
  scope: string;
  body: string;
  status: 'complete' | 'partial';
}> = [
  {
    scope: 'Federal',
    body: 'Complete across wired domains — bills, votes, members, committees, FEC campaign finance, lobbying disclosures, federal contracts, and the Federal Register.',
    status: 'complete',
  },
  {
    scope: 'State',
    body: 'All 50 state legislatures via OpenStates (legislators, bills, committees, votes). State campaign finance is not currently available — FollowTheMoney.org is in maintenance mode during the OpenSecrets merger.',
    status: 'partial',
  },
  {
    scope: 'Local',
    body: '10 pilot cities via Legistar — Austin, Boston, Chicago, Denver, Detroit, Minneapolis, Oakland, Philadelphia, Portland, Seattle. Outside this list, local routes return "data unavailable" rather than empty arrays.',
    status: 'partial',
  },
] as const;

const LIMITS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Private talks',
    body: 'Congress members negotiate behind closed doors. You see only the public votes and statements.',
  },
  {
    title: 'Bills that never get a vote',
    body: 'Leaders can block bills without a vote. You cannot tell which bills died this way.',
  },
  {
    title: 'Constituent service quality',
    body: 'We show contact info but not how fast or well the office handles your problems.',
  },
  {
    title: 'Who meets with your representative',
    body: 'Lobbying reports list some meetings. Most access leaves no public record.',
  },
  {
    title: 'Which votes matter most',
    body: 'Some votes are symbolic. Others change law. We show all votes the same way.',
  },
  {
    title: 'Whether money changed a vote',
    body: 'We show contributions and votes side by side. We cannot tell you if one caused the other.',
  },
] as const;

const SOURCES: ReadonlyArray<{ name: string; description: string; href: string }> = [
  { name: 'Congress.gov', description: 'Bills, votes, members', href: 'https://api.congress.gov/' },
  {
    name: 'Federal Election Commission',
    description: 'Campaign finance',
    href: 'https://www.fec.gov/',
  },
  {
    name: 'U.S. Census Bureau',
    description: 'Districts, demographics',
    href: 'https://www.census.gov/',
  },
  {
    name: 'Open States',
    description: 'State legislatures',
    href: 'https://openstates.org/',
  },
  {
    name: 'Federal Register',
    description: 'Rules, regulations, executive orders',
    href: 'https://www.federalregister.gov/',
  },
  { name: 'Senate LDA', description: 'Lobbying disclosures', href: 'https://lda.senate.gov/' },
  {
    name: 'USASpending.gov',
    description: 'Federal contracts, grants',
    href: 'https://www.usaspending.gov/',
  },
  {
    name: 'Bureau of Labor Statistics',
    description: 'Employment, wages',
    href: 'https://www.bls.gov/',
  },
  {
    name: 'GovInfo.gov',
    description: 'Hearing transcripts',
    href: 'https://www.govinfo.gov/',
  },
] as const;

export function AboutHybrid() {
  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Crumb rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 10,
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
          }}
        >
          <Link href="/" style={{ color: 'var(--fg3)', textDecoration: 'none' }}>
            CIV.IQ
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--fg1)' }}>About</span>
        </div>
        <div
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg3)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
          }}
        >
          Open-source civic data backbone
        </div>
      </div>

      {/* MASTHEAD */}
      <div style={{ paddingBottom: 24, borderBottom: '2px solid var(--ink)' }}>
        <CqLabel>The masthead</CqLabel>
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 0.9,
            margin: '12px 0 16px',
            textTransform: 'uppercase',
          }}
        >
          Public record,
          <br />
          made legible.
        </h1>
        <p
          style={{ fontSize: 20, lineHeight: 1.45, color: 'var(--fg2)', margin: 0, maxWidth: 760 }}
        >
          CIV.IQ is an independent, nonpartisan civic-data project. We aggregate, normalize, and
          publish the public record of U.S. federal and state government — for every voter, every
          reporter, every researcher. No signup required.
        </p>
      </div>

      {/* HEADLINE STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${HEADLINE_STATS.length}, minmax(0, 1fr))`,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {HEADLINE_STATS.map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: '20px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
              minWidth: 0,
            }}
          >
            <CqLabel>{s.label}</CqLabel>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: 'var(--fg1)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginTop: 8,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
              }}
            >
              {s.caption}
            </div>
          </div>
        ))}
      </div>

      {/* COMMITMENTS */}
      <section
        style={{
          marginTop: 32,
          marginBottom: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          border: '2px solid var(--ink)',
        }}
        aria-labelledby="commitments"
      >
        {COMMITMENTS.map((c, i) => (
          <div
            key={c.n}
            style={{
              padding: 24,
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--civiq-blue)',
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
              }}
            >
              § {c.n}
            </div>
            <div
              id={i === 0 ? 'commitments' : undefined}
              style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}
            >
              {c.title}
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg2)', margin: '8px 0 16px', lineHeight: 1.5 }}>
              {c.body}
            </p>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: 'var(--fg1)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {c.stat}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
              }}
            >
              {c.cap}
            </div>
          </div>
        ))}
      </section>

      {/* WHY CIV.IQ */}
      <section style={{ marginBottom: 32 }} aria-labelledby="why">
        <CqLabel>Why this exists</CqLabel>
        <div id="why" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          The asymmetry CIV.IQ corrects
        </div>
        <p
          style={{
            fontSize: 16,
            color: 'var(--fg2)',
            margin: '0 0 12px',
            maxWidth: 760,
            lineHeight: 1.55,
          }}
        >
          Votes, campaign contributions, lobbying filings, committee records, federal spending —
          this data exists in the public record, but it sits in isolated databases that no regular
          citizen has the time or skill to connect. Lobbyists and political consultants connect it
          every day. Citizens cannot. CIV.IQ corrects that asymmetry.
        </p>
        <p
          style={{
            fontSize: 16,
            color: 'var(--fg2)',
            margin: 0,
            maxWidth: 760,
            lineHeight: 1.55,
          }}
        >
          Type in your address and it opens up a whole world of information: who represents you at
          every level, how they vote, the money behind them, and how it all compares to their peers.
          Your address is the key.
        </p>
      </section>

      {/* COVERAGE */}
      <section style={{ marginBottom: 32 }} aria-labelledby="coverage">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Coverage · what is wired today</CqLabel>
          <div id="coverage" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            Federal, state, local
          </div>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', borderTop: '2px solid var(--ink)' }}>
          {COVERAGE.map(c => (
            <li
              key={c.scope}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px minmax(0, 1fr) 110px',
                gap: 16,
                padding: '14px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'baseline',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                {c.scope}
              </div>
              <p style={{ fontSize: 13, color: 'var(--fg2)', margin: 0, lineHeight: 1.55 }}>
                {c.body}
              </p>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                  textAlign: 'right',
                  color: c.status === 'complete' ? 'var(--civiq-blue)' : 'var(--color-warning)',
                }}
              >
                {c.status === 'complete' ? 'Complete' : 'Partial'}
              </span>
            </li>
          ))}
        </ol>
        <p
          style={{
            fontSize: 12,
            color: 'var(--fg3)',
            marginTop: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Full matrix:{' '}
          <a
            href="https://github.com/civdotiq/civ.iq/blob/main/docs/COVERAGE.md"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--civiq-blue-active)' }}
          >
            docs/COVERAGE.md
          </a>
        </p>
      </section>

      {/* WHAT THE DATA CANNOT TELL YOU */}
      <section style={{ marginBottom: 32 }} aria-labelledby="limits">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Epistemic limits</CqLabel>
          <div id="limits" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            What this data cannot tell you
          </div>
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            border: '2px solid var(--ink)',
          }}
        >
          {LIMITS.map((l, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <li
                key={l.title}
                style={{
                  padding: '16px 18px',
                  borderTop: row === 0 ? 0 : '1px solid var(--line)',
                  borderLeft: col === 0 ? 0 : '1px solid var(--line)',
                  display: 'grid',
                  gridTemplateColumns: '20px minmax(0, 1fr)',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: 'var(--civiq-red)',
                    fontWeight: 700,
                  }}
                  aria-hidden="true"
                >
                  ×
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{l.title}</div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--fg2)',
                      margin: '4px 0 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {l.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* SOURCES */}
      <section style={{ marginBottom: 32 }} aria-labelledby="sources">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Official sources · ingested directly</CqLabel>
          <div id="sources" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            Where the data comes from
          </div>
        </div>
        <div style={{ borderTop: '2px solid var(--ink)' }}>
          {SOURCES.map(s => (
            <a
              key={s.name}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(0, 1fr) minmax(0, 1.4fr)',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'baseline',
                textDecoration: 'none',
                color: 'var(--fg1)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--civiq-blue)',
                  fontWeight: 700,
                }}
                aria-hidden="true"
              >
                ↗
              </span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontSize: 13, color: 'var(--fg2)' }}>{s.description}</span>
            </a>
          ))}
        </div>
        <p
          style={{
            fontSize: 12,
            color: 'var(--fg3)',
            marginTop: 12,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Plus 17 more — Federal Register, Treasury, FRED, EPA, CMS, CFPB, FBI, CourtListener,
          Wikidata, and the rest. See{' '}
          <Link href="/methodology" style={{ color: 'var(--civiq-blue-active)' }}>
            /methodology
          </Link>
          .
        </p>
      </section>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.99}
          asof="May 2026"
          method="Direct ingestion · primary government sources"
        >
          {' '}
          Source code:{' '}
          <a
            href="https://github.com/civdotiq/civ.iq"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--civiq-blue-active)' }}
          >
            github.com/civdotiq/civ.iq
          </a>
          {' · MIT-licensed'}.
        </CqDisclaimer>
      </div>
    </div>
  );
}
