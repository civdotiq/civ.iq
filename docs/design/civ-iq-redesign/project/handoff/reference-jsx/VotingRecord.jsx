// VOTING RECORD — full filterable voting history for a member.
// Default: Hakeem Jeffries (D, NY-08). Layout: hero compact, filter rail,
// long table with 24 votes, summary stats by category and year.

function VotingRecordPage({ o = OFFICIAL_JEFFRIES }) {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Federal', o.chamber, o.state, o.short, 'Voting record', 'Full history']}
      crumbRight={[
        <span key="c">{o.congress} Congress</span>,
        <span key="d">1,248 votes cast · 4 missed</span>,
      ]}
    >
      {/* COMPACT HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '64px 1fr auto',
          gap: 20,
          alignItems: 'center',
          paddingBottom: 16,
          borderBottom: '2px solid #000',
        }}
      >
        <CqPortrait name={o.name} size={64} party={o.party} />
        <div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {o.role} · {o.partyLong} · {o.district}
          </div>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              margin: '4px 0 0',
              lineHeight: 1,
            }}
          >
            {o.name} · Voting record
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <CqButton variant="secondary" size="sm">
            Download CSV
          </CqButton>
          <CqButton variant="secondary" size="sm">
            Subscribe RSS
          </CqButton>
        </div>
      </div>

      {/* SUMMARY STRIP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          { l: 'Total votes', v: '1,248', c: 'cast in 119th' },
          { l: 'Yea', v: '914', c: '73.2%' },
          { l: 'Nay', v: '328', c: '26.3%' },
          { l: 'Present', v: '2', c: '0.2%' },
          { l: 'Missed', v: '4', c: '0.3%' },
          { l: 'w/ Party', v: o.party_vote + '%', c: 'Democratic caucus', cl: partyColor(o.party) },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{ padding: '16px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqLabel>{s.l}</CqLabel>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
                color: s.cl || COLORS.fg1,
              }}
            >
              {s.v}
            </div>
            <div
              style={{
                fontSize: 10,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 2,
              }}
            >
              {s.c}
            </div>
          </div>
        ))}
      </div>

      {/* FILTER RAIL */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          marginTop: 20,
          marginBottom: 20,
          border: '2px solid #000',
          alignItems: 'stretch',
        }}
      >
        {[
          ['Topic', 'All', '12'],
          ['Vote', 'All', '4'],
          ['Outcome', 'All', '3'],
          ['Year', '2024', '4'],
          ['Bipartisan', 'Any', '2'],
        ].map(([l, v, c], i) => (
          <div
            key={l}
            style={{
              padding: '10px 16px',
              borderRight: i < 4 ? `1px solid ${COLORS.line}` : 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              flex: 1,
            }}
          >
            <CqLabel>{l}</CqLabel>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{v}</span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  color: COLORS.fg3,
                  background: COLORS.bg2,
                  padding: '2px 6px',
                  border: `1px solid ${COLORS.line}`,
                }}
              >
                {c} options
              </span>
            </div>
          </div>
        ))}
        <button
          style={{
            background: '#000',
            color: '#fff',
            border: 0,
            padding: '0 24px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-primary)',
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>

      {/* LONG TABLE */}
      <div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 100px 1fr 90px 120px 100px 110px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['Roll', 'Bill', 'Title', 'Vote', 'Topic', 'Outcome', 'Date'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {[
          {
            r: '142',
            b: 'H.R. 815',
            t: 'Israel Security Supplemental Appropriations',
            v: 'Yes',
            tg: 'Foreign aid',
            oc: 'Passed 311–112',
            d: 'Apr 20, 2024',
          },
          {
            r: '141',
            b: 'H.R. 7521',
            t: 'Protecting Americans from Foreign-Adversary Apps',
            v: 'Yes',
            tg: 'Tech',
            oc: 'Passed 352–65',
            d: 'Mar 13, 2024',
          },
          {
            r: '140',
            b: 'H.R. 7024',
            t: 'Tax Relief for American Families and Workers',
            v: 'No',
            tg: 'Tax',
            oc: 'Passed H · stalled S',
            d: 'Jan 31, 2024',
          },
          {
            r: '139',
            b: 'H.R. 6090',
            t: 'Antisemitism Awareness Act',
            v: 'Yes',
            tg: 'Civil rights',
            oc: 'Passed 320–91',
            d: 'May 1, 2024',
          },
          {
            r: '138',
            b: 'H.R. 5860',
            t: 'Continuing Appropriations · Sept CR',
            v: 'Yes',
            tg: 'Approps',
            oc: 'Passed 335–91',
            d: 'Sep 30, 2023',
          },
          {
            r: '137',
            b: 'H.R. 4366',
            t: 'CJS / MilCon-VA appropriations FY24',
            v: 'No',
            tg: 'Approps',
            oc: 'Passed 339–85',
            d: 'Mar 6, 2024',
          },
          {
            r: '136',
            b: 'H.R. 2',
            t: 'Secure the Border Act of 2023',
            v: 'No',
            tg: 'Immigration',
            oc: 'Passed H · stalled S',
            d: 'May 11, 2023',
          },
          {
            r: '135',
            b: 'S. 2226',
            t: 'NDAA · FY24',
            v: 'Yes',
            tg: 'Defense',
            oc: 'Public law',
            d: 'Dec 14, 2023',
            pl: true,
          },
          {
            r: '134',
            b: 'H.R. 5376',
            t: 'Inflation Reduction Act',
            v: 'Yes',
            tg: 'Energy',
            oc: 'Public law',
            d: 'Aug 12, 2022',
            pl: true,
          },
          {
            r: '133',
            b: 'H.R. 8404',
            t: 'Respect for Marriage Act',
            v: 'Yes',
            tg: 'Civil rights',
            oc: 'Public law',
            d: 'Dec 8, 2022',
            pl: true,
          },
          {
            r: '132',
            b: 'H.R. 3684',
            t: 'Infrastructure Investment & Jobs Act',
            v: 'Yes',
            tg: 'Infrastructure',
            oc: 'Public law',
            d: 'Nov 5, 2021',
            pl: true,
          },
          {
            r: '131',
            b: 'H.R. 1',
            t: 'For the People Act',
            v: 'Yes',
            tg: 'Voting',
            oc: 'Passed H · stalled S',
            d: 'Mar 3, 2021',
          },
          {
            r: '130',
            b: 'H.R. 4',
            t: 'John Lewis Voting Rights Advancement',
            v: 'Yes',
            tg: 'Voting',
            oc: 'Passed H · stalled S',
            d: 'Aug 24, 2021',
          },
          {
            r: '129',
            b: 'H.R. 8',
            t: 'Bipartisan Background Checks Act',
            v: 'Yes',
            tg: 'Guns',
            oc: 'Passed H · stalled S',
            d: 'Mar 11, 2021',
          },
        ].map(v => (
          <div
            key={v.r}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 100px 1fr 90px 120px 100px 110px',
              gap: 12,
              padding: '14px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
              #{v.r}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.b}</span>
            <span style={{ fontSize: 13 }}>
              {v.t}
              {v.pl && (
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
            <CqChip variant={v.v === 'Yes' ? 'd' : 'r'} filled={false} size="sm">
              {v.v}
            </CqChip>
            <span style={{ fontSize: 11, color: COLORS.fg2 }}>{v.tg}</span>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {v.oc.split(' ')[0]} {v.oc.split(' ').slice(1).join(' ')}
            </span>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {v.d}
            </span>
          </div>
        ))}
      </div>

      {/* BY TOPIC + BY YEAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
        <div>
          <CqLabel>By topic · 12 categories</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Yes / No mix by topic
          </div>
          {[
            { t: 'Defense', yes: 88, no: 12, n: 142 },
            { t: 'Civil rights', yes: 96, no: 4, n: 87 },
            { t: 'Foreign aid', yes: 72, no: 28, n: 64 },
            { t: 'Tax', yes: 41, no: 59, n: 58 },
            { t: 'Immigration', yes: 18, no: 82, n: 49 },
            { t: 'Energy', yes: 89, no: 11, n: 38 },
            { t: 'Voting', yes: 99, no: 1, n: 22 },
          ].map((row, i) => (
            <div
              key={row.t}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 60px',
                gap: 12,
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{row.t}</div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {row.n} votes
                </div>
              </div>
              <div style={{ display: 'flex', height: 14, border: `1px solid ${COLORS.line}` }}>
                <div style={{ width: row.yes + '%', background: COLORS.green }} />
                <div style={{ width: row.no + '%', background: COLORS.red }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {row.yes}/{row.no}
              </span>
            </div>
          ))}
        </div>

        <div>
          <CqLabel>By year · attendance + party-line</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Year-by-year breakdown
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 110px 1fr 80px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Year', 'Votes cast', 'Party-line %', 'Att.'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { y: '2025', n: 412, p: 96, a: 99.0 },
            { y: '2024', n: 506, p: 96, a: 98.4 },
            { y: '2023', n: 484, p: 95, a: 98.1 },
            { y: '2022', n: 521, p: 97, a: 97.8 },
            { y: '2021', n: 498, p: 95, a: 96.4 },
          ].map(r => (
            <div
              key={r.y}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 110px 1fr 80px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>
                {r.y}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.n}</span>
              <div style={{ height: 8, background: COLORS.bg3 }}>
                <div
                  style={{ width: r.p + '%', height: '100%', background: partyColor(o.party) }}
                />
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: COLORS.fg2,
                  textAlign: 'right',
                }}
              >
                {r.a}%
              </span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              {o.short} has cast 1,248 of 1,252 floor votes since the 119th Congress began.
              Party-line agreement has held at 95–96% across every year since 2021.
            </CqPlainReading>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99} method="House Clerk roll-call XML · ingested daily">
          {' '}
          A Yes/No record reflects how a vote was cast, not the substance of the bill. See the bill
          page for plain-language summaries and full text.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { VotingRecordPage });
