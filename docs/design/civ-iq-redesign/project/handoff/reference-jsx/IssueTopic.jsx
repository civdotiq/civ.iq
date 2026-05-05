// ISSUE / TOPIC — "Housing" as a topic page.
// Aggregates: bills, key reps (sponsors + opposition), money flows, milestones.

function IssueTopicPage() {
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Topics', 'Housing & Real Estate', '119th Congress']}
      crumbRight={[
        <span key="b">142 bills indexed</span>,
        <span key="d">Updated · 6 hrs ago</span>,
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
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <CqChip variant="ink" size="sm">
              Topic · Federal
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              119th Congress
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              8 sub-topics
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 0.92,
              margin: '0 0 12px',
              textTransform: 'uppercase',
            }}
          >
            Housing
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: COLORS.fg2, margin: 0, maxWidth: 640 }}>
            All federal legislation, sponsoring members, committee referrals, and donor industry
            flows touching housing supply, affordability, finance, and tenant protections.
          </p>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
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
            {[
              ['Code', 'HSG'],
              ['Bills active', '142'],
              ['Public laws (cycle)', '7'],
              ['Top sponsor', 'Rep. Pressley (D, MA-7)'],
              ['Committee primary', 'Financial Services'],
              ['Industry money', '$214.8M'],
            ].map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                  gap: 12,
                }}
              >
                <span style={{ color: COLORS.fg3 }}>{k}</span>
                <span style={{ fontWeight: 700, textAlign: 'right' }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* SUB-TOPIC BAR */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          ['Supply', 32],
          ['Affordability', 28],
          ['Finance', 24],
          ['Zoning', 16],
          ['Tenant', 19],
          ['Homeless', 11],
          ['Federal HUD', 8],
          ['Tax', 4],
        ].map(([n, c], i) => (
          <div
            key={n}
            style={{
              padding: '14px 12px',
              borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
              background: i === 0 ? COLORS.bg2 : '#fff',
            }}
          >
            <CqLabel>{n}</CqLabel>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {c}
            </div>
          </div>
        ))}
      </div>

      {/* BILLS + REPS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, marginTop: 32 }}>
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <div>
              <CqLabel>Active legislation · 12 of 142 shown</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Major housing bills</div>
            </div>
            <CqButton variant="secondary" size="sm">
              Browse all 142 →
            </CqButton>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 110px 90px 70px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Bill', 'Title', 'Status', 'Introduced', 'Co-sp.'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            {
              n: 'H.R. 1491',
              t: 'Stop Wall Street Landlords Act',
              st: 'Committee',
              d: 'Mar 8, 2023',
              cs: 47,
            },
            {
              n: 'S.  1391',
              t: 'Decent, Affordable, Safe Housing Act',
              st: 'Reported',
              d: 'May 2, 2023',
              cs: 18,
            },
            {
              n: 'H.R. 2620',
              t: 'Community Land Trust Support Act',
              st: 'Committee',
              d: 'Apr 16, 2023',
              cs: 22,
            },
            {
              n: 'H.R. 4351',
              t: 'Housing Crisis Response Act',
              st: 'Floor',
              d: 'Jun 28, 2023',
              cs: 89,
            },
            {
              n: 'H.R. 6889',
              t: 'Yes In My Back Yard Act',
              st: 'Public law',
              d: 'Dec 14, 2023',
              cs: 51,
              pl: true,
            },
            {
              n: 'S.  3010',
              t: 'Affordable Housing Credit Improvement',
              st: 'Reported',
              d: 'Oct 17, 2023',
              cs: 29,
            },
            {
              n: 'H.R. 5103',
              t: 'Brooklyn Waterfront Resilience Act',
              st: 'Introduced',
              d: 'Aug 2, 2023',
              cs: 7,
            },
            {
              n: 'H.R. 7321',
              t: 'Tenant Protection Act of 2024',
              st: 'Introduced',
              d: 'Feb 14, 2024',
              cs: 32,
            },
          ].map(b => (
            <div
              key={b.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 110px 90px 70px',
                gap: 12,
                padding: '14px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.n}</span>
              <span style={{ fontSize: 13 }}>
                {b.t}
                {b.pl && (
                  <span
                    style={{
                      color: COLORS.green,
                      marginLeft: 6,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                    }}
                  >
                    · public law
                  </span>
                )}
              </span>
              <CqChip variant={b.pl ? 'd' : 'info'} filled={!!b.pl} size="sm">
                {b.st}
              </CqChip>
              <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {b.d}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                }}
              >
                {b.cs}
              </span>
            </div>
          ))}

          {/* MONEY FLOW */}
          <div style={{ marginTop: 32 }}>
            <CqLabel>Industry contributions · 2023–24 cycle</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
              Real-estate money to Members of Congress
            </div>
            <div
              style={{ display: 'flex', height: 36, border: '2px solid #000', marginBottom: 12 }}
            >
              {[
                { p: 'r', pct: 58, c: COLORS.red, amt: '$124.6M' },
                { p: 'd', pct: 39, c: COLORS.green, amt: '$83.8M' },
                { p: 'i', pct: 3, c: COLORS.vlau, amt: '$6.4M' },
              ].map(x => (
                <div
                  key={x.p}
                  style={{
                    width: x.pct + '%',
                    background: x.c,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: '2px solid #000',
                  }}
                >
                  <span
                    style={{
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {x.pct}%
                  </span>
                </div>
              ))}
            </div>
            {[
              {
                l: 'To Republican members',
                pct: 58,
                amt: '$124.6M',
                c: COLORS.red,
                sub: '218 of 222 GOP House members took ≥ $1',
              },
              {
                l: 'To Democratic members',
                pct: 39,
                amt: '$83.8M',
                c: COLORS.green,
                sub: '198 of 213 Dem House members took ≥ $1',
              },
              {
                l: 'To Independent members',
                pct: 3,
                amt: '$6.4M',
                c: COLORS.vlau,
                sub: '2 senators (Sanders, King)',
              },
            ].map(b => (
              <CqBar key={b.l} {...b} color={b.c} />
            ))}
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* TOP SPONSORS */}
          <div style={{ border: '2px solid #000' }}>
            <div
              style={{
                background: COLORS.fg1,
                color: '#fff',
                padding: '10px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Most-active sponsors
            </div>
            {[
              { n: 'Ayanna Pressley', d: 'D · MA-7', c: 14, p: 'd' },
              { n: 'Maxine Waters', d: 'D · CA-43', c: 11, p: 'd' },
              { n: 'Patrick McHenry', d: 'R · NC-10', c: 9, p: 'r' },
              { n: 'Sherrod Brown', d: 'D · OH', c: 8, p: 'd' },
              { n: 'Ron Wyden', d: 'D · OR', c: 7, p: 'd' },
              { n: 'Andy Biggs', d: 'R · AZ-5', c: 6, p: 'r' },
            ].map((m, i) => (
              <div
                key={m.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 50px',
                  gap: 10,
                  padding: '12px 14px',
                  borderBottom: i === 5 ? 0 : `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{m.n}</div>
                  <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                    {m.d}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: partyColor(m.p),
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                  }}
                >
                  {m.c}
                </span>
              </div>
            ))}
          </div>

          {/* MILESTONES */}
          <div style={{ border: '2px solid #000', padding: 18 }}>
            <CqLabel>Milestones · last 12 months</CqLabel>
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
              {[
                ['Dec 14, 2023', 'YIMBY Act enacted (P.L. 118-39)', COLORS.green],
                ['Mar 02, 2024', 'House passes Tenant Protection markup', COLORS.fg1],
                ['Mar 28, 2024', 'Senate Banking holds Wall St. Landlords hrg.', COLORS.fg1],
                ['Apr 16, 2024', 'CBO scores Housing Crisis Response · $48B', COLORS.blue],
              ].map(([d, t, c], i, a) => (
                <li
                  key={d}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr',
                    gap: 10,
                    paddingBottom: 8,
                    borderBottom: i === a.length - 1 ? 0 : `1px solid ${COLORS.line}`,
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                    {d}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      lineHeight: 1.4,
                      color: c,
                      fontWeight: c === COLORS.green ? 700 : 500,
                    }}
                  >
                    {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 32 }}>
        <CqPlainReading>
          142 bills touching housing are active in the 119th Congress; 7 have become public law.
          Real-estate-industry PACs gave $214.8M to current members this cycle; 58% went to
          Republicans, 39% to Democrats. The most-active sponsor is Rep. Pressley (D, MA-7) with 14
          bills.
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.95}>
          {' '}
          Topic clustering uses Congress.gov subject codes plus OpenSecrets industry codes. A bill
          may appear under multiple topics.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { IssueTopicPage });
