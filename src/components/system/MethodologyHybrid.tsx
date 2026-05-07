/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * MethodologyHybrid — redesigned /methodology page (PR 8).
 *
 * Reference: docs/design/civ-iq-redesign/project/redesign/SystemPages.jsx
 *   → MethodologyPage. Visual aesthetic preserved (file-dossier hero,
 *   4-principle grid, source ledger table, "what we don't do" rail).
 *   Substantive content (5 pathways, citations, what-we-don't-claim) is
 *   lifted from the existing methodology page so research-grounded copy
 *   isn't lost.
 */

import Link from 'next/link';
import { CqDisclaimer, CqLabel } from '@/components/cq';

interface DataSource {
  name: string;
  domain: string;
  covers: string;
  url: string;
}

const CORE_SOURCES: DataSource[] = [
  {
    name: 'Congress.gov API',
    domain: 'api.congress.gov',
    covers: 'Bills, members, committees, votes, hearings',
    url: 'https://api.congress.gov',
  },
  {
    name: 'FEC API',
    domain: 'api.open.fec.gov',
    covers: 'Campaign contributions, expenditures, PAC filings',
    url: 'https://api.open.fec.gov',
  },
  {
    name: 'Senate LDA',
    domain: 'lda.senate.gov',
    covers: 'Lobbying disclosure filings',
    url: 'https://lda.senate.gov/api/v1',
  },
  {
    name: 'Census Geocoder',
    domain: 'census.gov',
    covers: 'Address-to-district lookup, demographics',
    url: 'https://www.census.gov/data/developers.html',
  },
  {
    name: 'USASpending.gov API',
    domain: 'api.usaspending.gov',
    covers: 'Federal contracts and grants by district',
    url: 'https://api.usaspending.gov',
  },
  {
    name: 'Federal Register API',
    domain: 'federalregister.gov',
    covers: 'Rules, proposed rules, executive orders',
    url: 'https://www.federalregister.gov/developers/api/v1',
  },
  {
    name: 'GovInfo bill text',
    domain: 'govinfo.gov',
    covers: 'Bill text, hearing transcripts',
    url: 'https://www.govinfo.gov',
  },
  {
    name: 'Open States API',
    domain: 'openstates.org',
    covers: 'State legislators, state bills, state votes',
    url: 'https://openstates.org',
  },
] as const;

const PRINCIPLES: ReadonlyArray<{ n: string; title: string; body: string }> = [
  {
    n: '01',
    title: 'Primary sources only',
    body: 'No scraping news outlets. No third-party indexes. We pull from .gov endpoints and clerks of the House and Senate.',
  },
  {
    n: '02',
    title: 'Ingestion, not inference',
    body: 'We do not estimate, model, or predict what a politician thinks. Only what they have done on record.',
  },
  {
    n: '03',
    title: 'Confidence on every fact',
    body: 'Each datum carries a 0–1 score reflecting source authority, completeness, and time since publication. Below 0.6, we hide it.',
  },
  {
    n: '04',
    title: 'Plain language',
    body: 'AI summaries read at an 8th-grade level. The official language is preserved alongside, never replaced.',
  },
] as const;

const PATHWAYS: ReadonlyArray<{
  n: string;
  title: string;
  band: string;
  bandColor: string;
  body: string;
}> = [
  {
    n: '01',
    title: 'Access',
    band: 'Strongest',
    bandColor: 'var(--civiq-blue)',
    body: 'Donors get more meetings with legislators. Kalla and Broockman (2016) ran a controlled experiment and found donors were three to four times more likely to get a meeting. This is the best-supported finding in campaign finance research.',
  },
  {
    n: '02',
    title: 'Committee work',
    band: 'Strong',
    bandColor: 'var(--civiq-blue)',
    body: 'Donations match how hard a member works on bills in committee that affect donors. Hall and Wayman (1990) found this pattern; Hojnacki and Kimball (2001) found the same. Money may affect effort in committee, not how someone votes on the floor.',
  },
  {
    n: '03',
    title: 'Agenda-setting',
    band: 'Moderate',
    bandColor: 'var(--fg3)',
    body: 'Lobbying groups spend money to put issues in front of Congress. Furnas et al. (2023) studied how lobbying shapes attention. Harder to measure than votes — you cannot see what did not make it onto the agenda.',
  },
  {
    n: '04',
    title: 'Strategic giving',
    band: 'The catch',
    bandColor: 'var(--color-warning)',
    body: 'Donors give to legislators who already agree with them. When a legislator votes the way a donor wants, you cannot always tell why. This chicken-and-egg problem is the biggest challenge in campaign finance research.',
  },
  {
    n: '05',
    title: 'Direct vote-buying',
    band: 'Weakest',
    bandColor: 'var(--fg3)',
    body: 'The idea that a donation flips a specific vote has very little support. Most studies find no real effect after accounting for party and ideology. A few narrow exceptions exist in specific industries.',
  },
] as const;

const NON_CLAIMS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Donations caused votes',
    body: 'We show donations and votes together so you can see the full picture. We use words like "received," "associated with," and "correlated with." We never use "influenced," "caused," or "resulted in."',
  },
  {
    title: 'Lobbying is improper',
    body: 'Lobbying is protected by the First Amendment. We show lobbying filings because they are public records, not because lobbying is wrong.',
  },
  {
    title: 'Sides, ratings, or endorsements',
    body: 'CIV.IQ presents data without opinion. We do not rate legislators as good or bad. We do not tell you how to vote.',
  },
  {
    title: 'Cherry-picked windows',
    body: 'We do not select time periods or comparisons to make any legislator look better or worse. Every comparison follows the same rules for all members.',
  },
] as const;

const CITATIONS: ReadonlyArray<{ id: string; n: number; cite: string; url: string }> = [
  {
    id: 'ansolabehere',
    n: 1,
    cite: 'Ansolabehere, S., de Figueiredo, J. M., & Snyder, J. M. (2003). "Why Is There So Little Money in U.S. Politics?" Journal of Economic Perspectives, 17(1), 105–130.',
    url: 'https://doi.org/10.1257/089533003321164976',
  },
  {
    id: 'kalla',
    n: 2,
    cite: 'Kalla, J. L. & Broockman, D. E. (2016). "Campaign Contributions Facilitate Access to Congressional Officials: A Randomized Field Experiment." American Journal of Political Science, 60(3), 545–558.',
    url: 'https://doi.org/10.1111/ajps.12180',
  },
  {
    id: 'hall',
    n: 3,
    cite: 'Hall, R. L. & Wayman, F. W. (1990). "Buying Time: Moneyed Interests and the Mobilization of Bias in Congressional Committees." American Political Science Review, 84(3), 797–820.',
    url: 'https://doi.org/10.2307/1962767',
  },
  {
    id: 'hojnacki',
    n: 4,
    cite: 'Hojnacki, M. & Kimball, D. C. (2001). "PAC Contributions and Lobbying Contacts in Congressional Committees." Political Research Quarterly, 54(1), 161–180.',
    url: 'https://doi.org/10.1177/106591290105400109',
  },
  {
    id: 'furnas',
    n: 5,
    cite: 'Furnas, A. C., LaPira, T. M., Hertel-Fernandez, A., Drutman, L., & Kosar, K. R. (2023). "More than Mere Access." Political Research Quarterly, 76(1), 348–364.',
    url: 'https://doi.org/10.1177/10659129221098743',
  },
  {
    id: 'mckay',
    n: 6,
    cite: 'McKay, A. (2018). "Fundraising for Favors?" Political Research Quarterly, 71(2), 379–391.',
    url: 'https://doi.org/10.1177/1065912917735178',
  },
] as const;

const PAGE_META: ReadonlyArray<readonly [string, string]> = [
  ['Effective', 'Apr 2026'],
  ['Sources', `${CORE_SOURCES.length} core · 18 supplementary`],
  ['Code', 'MIT licensed'],
  ['Citations', `${CITATIONS.length} peer-reviewed`],
] as const;

export function MethodologyHybrid() {
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
            Documentation
          </Link>
          <span aria-hidden="true">›</span>
          <span style={{ color: 'var(--fg1)' }}>Methodology</span>
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
          Last revised · Apr 2026
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div>
          <CqLabel>Public dossier · open methodology</CqLabel>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 0.95,
              margin: '8px 0 16px',
              textTransform: 'uppercase',
            }}
          >
            How we know
            <br />
            what we know
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.5,
              color: 'var(--fg2)',
              margin: 0,
              maxWidth: 640,
            }}
          >
            Every fact on CIV.IQ is traced to a primary public source, ingested directly, and
            stamped with a confidence score and an as-of timestamp. Nothing is inferred. Nothing is
            editorialized.
          </p>
        </div>
        <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Document file</CqLabel>
          <ul
            style={{
              listStyle: 'none',
              margin: '10px 0 0',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            {PAGE_META.map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--fg3)' }}>{k}</span>
                <span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* PRINCIPLES */}
      <section style={{ marginTop: 32, marginBottom: 32 }} aria-labelledby="principles">
        <CqLabel as="div" style={{ marginBottom: 8 }}>
          <span id="principles">Four principles</span>
        </CqLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            border: '2px solid var(--ink)',
          }}
        >
          {PRINCIPLES.map((p, i) => (
            <div
              key={p.n}
              style={{
                padding: '20px 22px',
                borderRight: i < PRINCIPLES.length - 1 ? '1px solid var(--line)' : 0,
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
                § {p.n}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  marginTop: 8,
                  marginBottom: 10,
                }}
              >
                {p.title}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg2)', margin: 0 }}>
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* SOURCE LEDGER */}
      <section style={{ marginBottom: 32 }} aria-labelledby="sources">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Source ledger · {CORE_SOURCES.length} primary endpoints</CqLabel>
          <div id="sources" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            Where the data comes from
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.8fr)',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid var(--ink)',
            borderBottom: '1px solid var(--line)',
          }}
        >
          {['#', 'Source', 'Domain', 'Coverage'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {CORE_SOURCES.map((s, i) => (
          <div
            key={s.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px minmax(0, 1.6fr) minmax(0, 1.2fr) minmax(0, 1.8fr)',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--line)',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg3)',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--fg1)',
                textDecoration: 'none',
              }}
            >
              {s.name}
            </a>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--fg2)',
              }}
            >
              {s.domain}
            </span>
            <span style={{ fontSize: 13, color: 'var(--fg2)' }}>{s.covers}</span>
          </div>
        ))}
        <p
          style={{
            fontSize: 12,
            color: 'var(--fg3)',
            marginTop: 12,
            lineHeight: 1.5,
            fontFamily: 'var(--font-mono)',
          }}
        >
          Plus 18 supplementary sources covering financial disclosure, regulations, environment,
          health, justice, and state government.
        </p>
      </section>

      {/* PATHWAYS — campaign finance research */}
      <section style={{ marginBottom: 32 }} aria-labelledby="pathways">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>Campaign finance · the research</CqLabel>
          <div id="pathways" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            Five ways money relates to legislation
          </div>
        </div>
        <p
          style={{
            fontSize: 14,
            color: 'var(--fg2)',
            margin: '0 0 12px',
            maxWidth: 760,
            lineHeight: 1.6,
          }}
        >
          Researchers have found five pathways from money to legislative behavior. We rank them by
          how strong the evidence is, from strongest to weakest.
        </p>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {PATHWAYS.map((p, i) => (
            <li
              key={p.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px minmax(0, 1fr) 110px',
                gap: 16,
                alignItems: 'baseline',
                padding: '16px 18px',
                borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
                borderLeft: '2px solid var(--ink)',
                borderRight: '2px solid var(--ink)',
                borderBottom: i === PATHWAYS.length - 1 ? '2px solid var(--ink)' : 0,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--civiq-blue)',
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-label)',
                }}
              >
                § {p.n}
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
                <p style={{ fontSize: 13, color: 'var(--fg2)', margin: 0, lineHeight: 1.55 }}>
                  {p.body}
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                  color: p.bandColor,
                  textAlign: 'right',
                }}
              >
                {p.band}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* WHAT WE DO NOT DO */}
      <section
        style={{
          marginBottom: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 32,
        }}
        aria-labelledby="non-claims"
      >
        <div>
          <CqLabel>Confidence formula</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            How we score every fact
          </div>
          <div
            style={{
              background: 'var(--bg2)',
              border: '2px solid var(--ink)',
              padding: '20px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: 'var(--civiq-blue)', fontWeight: 700 }}>conf</span>{' '}
            <span style={{ color: 'var(--fg1)' }}>= authority × completeness × freshness</span>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 8 }}>
              · authority ∈ [0, 1] · weighted by source ledger
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg3)' }}>
              · completeness ∈ [0, 1] · share of expected fields present
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg3)' }}>
              · freshness ∈ [0, 1] · decays since last update
            </div>
          </div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--fg3)',
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            We surface the score on every analytic insight. A confidence below 0.85 triggers a
            caveat; below 0.6 we suppress the fact and flag it for review.
          </p>
        </div>
        <div>
          <CqLabel>What CIV.IQ does not claim</CqLabel>
          <div
            id="non-claims"
            style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}
          >
            Out of scope, by design
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {NON_CLAIMS.map((c, i) => (
              <li
                key={c.title}
                style={{
                  padding: '12px 0',
                  borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
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
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.title}</div>
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--fg2)',
                      margin: '4px 0 0',
                      lineHeight: 1.5,
                    }}
                  >
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* REFERENCES */}
      <section style={{ marginBottom: 32 }} aria-labelledby="references">
        <div style={{ marginBottom: 12 }}>
          <CqLabel>References · {CITATIONS.length} peer-reviewed</CqLabel>
          <div id="references" style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            Citations
          </div>
        </div>
        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            borderTop: '2px solid var(--ink)',
          }}
        >
          {CITATIONS.map(c => (
            <li
              key={c.id}
              id={`ref-${c.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(0, 1fr)',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--civiq-blue)',
                  fontWeight: 700,
                  letterSpacing: 'var(--tracking-label)',
                }}
              >
                [{c.n}]
              </span>
              <span style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--fg2)' }}>
                {c.cite}{' '}
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--civiq-blue-active)', fontFamily: 'var(--font-mono)' }}
                >
                  doi
                </a>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.99}
          asof="Apr 2026"
          method="Direct ingestion · primary government sources"
        >
          {' '}
          This document is itself versioned. Open-source at{' '}
          <a
            href="https://github.com/civic-intel-hub/civic-intel-hub"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--civiq-blue-active)' }}
          >
            github.com/civic-intel-hub
          </a>
          .
        </CqDisclaimer>
      </div>
    </div>
  );
}
