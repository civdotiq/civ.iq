// METHODOLOGY + ABOUT + ERROR — final connective tissue.
// Three more page types so the system reads as a complete product, not a homepage demo.
// All share the same chassis: black masthead crumb, hero, content, footer.

// ════════════════════════════════════════════════════
// METHODOLOGY — a public dossier explaining how data is sourced + scored.
// ════════════════════════════════════════════════════
function MethodologyPage() {
  return (
    <CqPage
      width={1280}
      currentNav="method"
      crumbs={['Documentation', 'Methodology', 'v3.4 · Apr 2026']}
      crumbRight={[
        <span key="ed">Editor · CIV.IQ Data Council</span>,
        <span key="rev">Last revised · Apr 14, 2026</span>,
      ]}
    >
      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <div>
          <CqLabel>Public dossier · open methodology</CqLabel>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '8px 0 16px',
              textTransform: 'uppercase',
            }}
          >
            How we know what we know
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: COLORS.fg2, margin: 0, maxWidth: 640 }}>
            Every fact on CIV.IQ is traced to a primary public source, ingested directly, and
            stamped with a confidence score and an as-of timestamp. Nothing is inferred. Nothing is
            editorialized.
          </p>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
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
            {[
              ['Version', 'v3.4'],
              ['Effective', 'Apr 14, 2026'],
              ['Next review', 'Jul 14, 2026'],
              ['Pages', '24'],
              ['Sources', '19 primary'],
              ['License', 'CC-BY 4.0'],
            ].map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                }}
              >
                <span style={{ color: COLORS.fg3 }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* PRINCIPLES — 4 pillars with chip + body */}
      <div style={{ marginTop: 32, marginBottom: 32 }}>
        <CqLabel>Four principles</CqLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            border: '2px solid #000',
            marginTop: 8,
          }}
        >
          {[
            {
              n: '01',
              t: 'Primary sources only',
              b: 'No scraping news outlets. No third-party indexes. We pull from .gov endpoints and clerks of the House and Senate.',
            },
            {
              n: '02',
              t: 'Ingestion, not inference',
              b: 'We do not estimate, model, or predict what a politician thinks. Only what they have done on record.',
            },
            {
              n: '03',
              t: 'Confidence on every fact',
              b: 'Each datum carries a 0.00–1.00 score reflecting source authority, completeness, and time since publication.',
            },
            {
              n: '04',
              t: 'Plain language',
              b: 'Every record is summarized at an 8th-grade reading level. The official language is preserved alongside.',
            },
          ].map((p, i) => (
            <div
              key={p.n}
              style={{ padding: '20px 22px', borderRight: i < 3 ? `1px solid ${COLORS.line}` : 0 }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: COLORS.blue,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
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
                {p.t}
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.fg2, margin: 0 }}>{p.b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SOURCES TABLE */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <div>
            <CqLabel>Sources · 19 ingested · 4 in review</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Source ledger</div>
          </div>
          <CqButton variant="secondary" size="sm">
            Download as CSV
          </CqButton>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 110px 110px 100px 70px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['#', 'Source', 'Domain', 'Frequency', 'Volume', 'Conf.'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {[
          { n: 'Congress.gov', dom: 'congress.gov', freq: 'Hourly', vol: '12.4M', conf: 0.99 },
          { n: 'FEC bulk data', dom: 'fec.gov', freq: 'Daily', vol: '4.7M', conf: 0.98 },
          {
            n: 'Senate LDA disclosure',
            dom: 'senate.gov',
            freq: 'Quarterly',
            vol: '210K',
            conf: 0.97,
          },
          { n: 'USASpending', dom: 'usaspending.gov', freq: 'Daily', vol: '8.2M', conf: 0.96 },
          {
            n: 'House Clerk roll calls',
            dom: 'clerk.house.gov',
            freq: 'Daily',
            vol: '1.1M',
            conf: 0.99,
          },
          { n: 'Senate roll calls', dom: 'senate.gov', freq: 'Daily', vol: '0.6M', conf: 0.99 },
          { n: 'GovInfo bill text', dom: 'govinfo.gov', freq: 'Daily', vol: '3.4M', conf: 0.98 },
          { n: 'Census ACS 2024', dom: 'census.gov', freq: 'Annual', vol: '0.4M', conf: 0.95 },
        ].map((s, i) => (
          <div
            key={s.n}
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 110px 110px 100px 70px',
              gap: 12,
              padding: '12px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{s.n}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg2 }}>
              {s.dom}
            </span>
            <CqChip variant="ink" filled={false} size="sm">
              {s.freq}
            </CqChip>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.vol}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                color: s.conf >= 0.98 ? COLORS.green : COLORS.fg1,
              }}
            >
              {s.conf.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* CONFIDENCE FORMULA */}
      <div style={{ marginBottom: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <CqLabel>Confidence formula</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            How we score every fact
          </div>
          <div
            style={{
              background: COLORS.bg2,
              border: '2px solid #000',
              padding: '20px 24px',
              fontFamily: 'var(--font-mono)',
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: COLORS.blue, fontWeight: 700 }}>conf</span> ={' '}
            <span style={{ color: COLORS.fg1 }}>(authority × completeness × freshness)</span>
            <br />
            <span style={{ fontSize: 11, color: COLORS.fg3 }}>
              · authority &nbsp; ∈ [0, 1] &nbsp; · weighted by source ledger
            </span>
            <br />
            <span style={{ fontSize: 11, color: COLORS.fg3 }}>
              · completeness ∈ [0, 1] &nbsp; · share of expected fields present
            </span>
            <br />
            <span style={{ fontSize: 11, color: COLORS.fg3 }}>
              · freshness &nbsp; ∈ [0, 1] &nbsp; · exp(−Δt / τ), τ = 90 days
            </span>
          </div>
          <p style={{ fontSize: 12, color: COLORS.fg3, marginTop: 10, lineHeight: 1.5 }}>
            We surface the score on every page. A confidence below 0.85 triggers a banner; below
            0.70 we suppress the data and flag it for review.
          </p>
        </div>
        <div>
          <CqLabel>What we DO NOT do</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Out of scope, by design
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {[
              'Score politicians on a left-right axis',
              'Predict votes, elections, or policy outcomes',
              'Recommend candidates or actions',
              'Aggregate social-media posts or rhetoric',
              'Accept advertising, sponsorship, or paid placement',
              'Track users, set cookies beyond session',
            ].map((x, i) => (
              <li
                key={x}
                style={{
                  padding: '10px 0',
                  borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr',
                  gap: 12,
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    color: COLORS.red,
                    fontWeight: 700,
                  }}
                >
                  ×
                </span>
                <span style={{ fontSize: 14, lineHeight: 1.5 }}>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99}>
          {' '}
          This document is itself versioned. v3.4 · Apr 14, 2026. Public history at
          github.com/civdotiq/methodology.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

// ════════════════════════════════════════════════════
// ABOUT — masthead + manifesto + people + funding ledger.
// ════════════════════════════════════════════════════
function AboutPage() {
  return (
    <CqPage
      width={1280}
      currentNav="about"
      crumbs={['About', 'CIV.IQ Foundation', '501(c)(3)']}
      crumbRight={[<span key="i">EIN · 88-1234567</span>, <span key="f">Audited · Mar 2026</span>]}
    >
      <div style={{ paddingBottom: 24, borderBottom: '2px solid #000' }}>
        <CqLabel>The masthead</CqLabel>
        <h1
          style={{
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 0.9,
            margin: '12px 0 16px',
            textTransform: 'uppercase',
          }}
        >
          Public record,
          <br />
          made legible.
        </h1>
        <p style={{ fontSize: 20, lineHeight: 1.45, color: COLORS.fg2, margin: 0, maxWidth: 760 }}>
          CIV.IQ is an independent, nonpartisan civic-data project. We aggregate, normalize, and
          publish the public record of U.S. federal and state government — for every voter, every
          reporter, every researcher, no signup required.
        </p>
      </div>

      {/* COMMITMENTS */}
      <div
        style={{
          marginTop: 32,
          marginBottom: 32,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          {
            n: '01',
            t: 'Free, forever',
            b: 'No paywall. No ads. No signups. Forever.',
            stat: '0',
            cap: 'cents charged · all-time',
          },
          {
            n: '02',
            t: 'Independent',
            b: 'Funded by foundations and small donors. No political party, no candidate, no PAC.',
            stat: '$2.4M',
            cap: '2025 budget · 100% disclosed',
          },
          {
            n: '03',
            t: 'Open by default',
            b: 'Source code is MIT. Data is CC-BY. Both are public on GitHub.',
            stat: 'MIT',
            cap: 'License · code + data',
          },
        ].map((c, i) => (
          <div
            key={c.n}
            style={{ padding: '24px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: COLORS.blue,
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              § {c.n}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{c.t}</div>
            <p style={{ fontSize: 13, color: COLORS.fg2, margin: '8px 0 16px', lineHeight: 1.5 }}>
              {c.b}
            </p>
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.fg1,
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
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {c.cap}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <CqLabel>People · 11 staff, 4 advisors</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Who runs CIV.IQ
          </div>
          {[
            {
              name: 'Theresa Okafor',
              role: 'Executive Director',
              tenure: '2022–',
              prev: 'ProPublica · Sunlight Foundation',
            },
            {
              name: 'Daniel Ramírez',
              role: 'Chief Data Officer',
              tenure: '2023–',
              prev: 'GovTrack · NYT R&D',
            },
            {
              name: 'Hannah Liang',
              role: 'Editor, Documentation',
              tenure: '2024–',
              prev: 'Reuters · Quartz',
            },
            {
              name: 'Marcus Petrov',
              role: 'Engineering Lead',
              tenure: '2022–',
              prev: 'OpenStates · 18F',
            },
          ].map((p, i) => (
            <div
              key={p.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 100px',
                gap: 12,
                padding: '14px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  position: 'relative',
                  border: '2px solid #000',
                  background: '#fff',
                  backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 6px, ${COLORS.bg3} 6px 12px)`,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: COLORS.blue,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {p.name
                    .split(' ')
                    .map(s => s[0])
                    .slice(0, 2)
                    .join('')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {p.role}
                </div>
                <div style={{ fontSize: 11, color: COLORS.fg2, marginTop: 2 }}>Prev: {p.prev}</div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: COLORS.fg3,
                  textAlign: 'right',
                }}
              >
                {p.tenure}
              </span>
            </div>
          ))}
        </div>

        <div>
          <CqLabel>Funding ledger · 2025 (audited)</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Where the money comes from
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 110px 60px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['#', 'Funder', 'Amount', '%'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { n: 'Knight Foundation', amt: '$650K', pct: 27 },
            { n: 'Hewlett Foundation', amt: '$500K', pct: 21 },
            { n: 'Democracy Fund', amt: '$400K', pct: 17 },
            { n: 'Small donors (≤ $1,000)', amt: '$520K', pct: 22 },
            { n: 'API + bulk data licensing', amt: '$210K', pct: 9 },
            { n: 'Earned interest', amt: '$90K', pct: 4 },
          ].map((f, i) => (
            <div
              key={f.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 110px 60px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{f.n}</div>
                <div style={{ height: 4, background: COLORS.bg3, marginTop: 6 }}>
                  <div style={{ width: `${f.pct}%`, height: '100%', background: COLORS.blue }} />
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {f.amt}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: COLORS.fg3,
                  textAlign: 'right',
                }}
              >
                {f.pct}%
              </span>
            </div>
          ))}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 110px 60px',
              gap: 12,
              padding: '14px 0',
              borderTop: '2px solid #000',
              alignItems: 'center',
              background: COLORS.bg2,
            }}
          >
            <span />
            <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
              Total · 2025
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'right',
                color: COLORS.blue,
              }}
            >
              $2.37M
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: COLORS.fg3,
                textAlign: 'right',
              }}
            >
              100%
            </span>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99}>
          {' '}
          Annual audit by Klein & Associates, CPA. Form 990 filed Mar 12, 2026.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

// ════════════════════════════════════════════════════
// ERROR / NOT FOUND — same chassis, but black hero block, file-not-found dossier.
// ════════════════════════════════════════════════════
function NotFoundPage() {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Error', '404', 'Not in record']}
      crumbRight={[
        <span key="r">Ref · 404-NTREC</span>,
        <span key="t">Apr 26, 2026 · 10:42 EDT</span>,
      ]}
    >
      {/* Black file-stamp hero */}
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '48px 56px',
          border: '2px solid #000',
          display: 'grid',
          gridTemplateColumns: '180px 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            position: 'relative',
            border: '3px solid #fff',
            background: 'transparent',
            backgroundImage: `repeating-linear-gradient(45deg, transparent 0 8px, rgba(255,255,255,0.06) 8px 16px)`,
          }}
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
            <div style={{ fontSize: 11, color: '#9ca3af', letterSpacing: '0.12em' }}>STATUS</div>
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
            <div style={{ fontSize: 10, color: '#9ca3af', letterSpacing: '0.08em', marginTop: 8 }}>
              NOT IN RECORD
            </div>
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: COLORS.blue,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
            }}
          >
            File · 404-NTREC · Civ.IQ Documentation
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '10px 0 14px',
              textTransform: 'uppercase',
            }}
          >
            That page
            <br />
            is not in the record.
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: '#d1d5db', margin: 0, maxWidth: 600 }}>
            We didn't find anything matching this URL. The page may have been renamed, moved into a
            different Congress, or simply never existed.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <CqButton variant="primary" size="md">
              Search instead →
            </CqButton>
            <CqButton variant="secondary" size="md">
              Report broken link
            </CqButton>
          </div>
        </div>
      </div>

      {/* TRY THESE — shortcuts to common entry points */}
      <div style={{ marginTop: 32 }}>
        <CqLabel>Try one of these</CqLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            border: '2px solid #000',
            marginTop: 8,
          }}
        >
          {[
            {
              eyebrow: 'Officials',
              t: 'Find your representative',
              b: 'Enter a street address or ZIP. Returns federal + state officials.',
            },
            {
              eyebrow: 'Bills',
              t: 'Browse the 119th Congress',
              b: '6,221 bills indexed. 312 became law. Full text + plain summaries.',
            },
            {
              eyebrow: 'States',
              t: 'Pick a state',
              b: '50 state pages. Federal delegation, legislature, and IIJA receipts.',
            },
          ].map((c, i) => (
            <a
              key={c.t}
              href="#"
              style={{
                padding: '24px 22px',
                textDecoration: 'none',
                color: COLORS.fg1,
                borderRight: i < 2 ? `1px solid ${COLORS.line}` : 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <CqLabel>{c.eyebrow}</CqLabel>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>{c.t}</div>
              <p style={{ fontSize: 13, color: COLORS.fg2, margin: 0, lineHeight: 1.5 }}>{c.b}</p>
              <span
                style={{
                  marginTop: 'auto',
                  fontSize: 11,
                  color: COLORS.blueHv,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Open →
              </span>
            </a>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={1.0}>
          {' '}
          If you reached this page from another site, the source link is broken. Please report it:
          civ.iq/report.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { MethodologyPage, AboutPage, NotFoundPage });
