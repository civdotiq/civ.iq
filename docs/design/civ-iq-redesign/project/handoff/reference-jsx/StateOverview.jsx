// STATE OVERVIEW — landing page for a state. Same chassis: black masthead crumb,
// hero, 5-stat strip, secondary row, content grid. Heavy on aggregates.

function StateOverview({ s }) {
  return (
    <CqPage
      width={1280}
      currentNav="states"
      crumbs={['States', s.name, 'Overview']}
      crumbRight={[
        <span key="f">
          File · STATE-{s.abbr}-{s.cycle}
        </span>,
        <span key="c">Compiled Apr 26, 2026</span>,
        <span key="src">Sources · 5</span>,
      ]}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <a
          href="#"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: COLORS.fg3,
            textDecoration: 'none',
          }}
        >
          ← All states
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="Congress.gov" id={`/state/${s.abbr}`} />
          <CqSourceTag compact source="FEC.gov" id={`state-${s.abbr}-cycle`} />
          <CqSourceTag compact source="Census.gov" id="acs-2024" />
          <CqSourceTag compact source="USASpending" id="state-receipts" />
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 240px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            position: 'relative',
            border: '2px solid #000',
            background: '#fff',
            backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: COLORS.blue,
            }}
          />
          <div
            style={{
              fontSize: 72,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: COLORS.fg1,
            }}
          >
            {s.abbr}
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              State · {s.region}
            </CqChip>
            <CqChip variant="d" filled={false} size="sm">
              Lean: {s.lean}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {s.districts} House districts
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '0 0 10px',
              textTransform: 'uppercase',
            }}
          >
            {s.name}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            {s.population} residents · {s.medianIncome} median household · Capital: {s.capital}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Find your reps →
          </CqButton>
          <CqButton variant="primary" size="sm">
            Legislature →
          </CqButton>
        </div>
      </div>

      {/* STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {[
          {
            label: 'House delegation',
            value: s.districts,
            caption: `${s.dHouse}D · ${s.rHouse}R`,
            color: COLORS.fg1,
          },
          {
            label: 'Senators',
            value: 2,
            caption: `${s.dSenate}D · ${s.rSenate}R`,
            color: COLORS.fg1,
          },
          {
            label: 'State legislators',
            value: s.stateLeg,
            caption: 'Bicameral',
            color: COLORS.fg1,
          },
          {
            label: 'IIJA spending',
            value: s.iija,
            caption: 'USASpending · 2021–26',
            color: COLORS.blue,
          },
          {
            label: 'Bills with sponsor',
            value: s.sponsored,
            caption: '119th Congress',
            color: COLORS.fg1,
          },
        ].map((st, i) => (
          <div
            key={st.label}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...st} size={32} />
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '2px solid #000',
          background: COLORS.bg2,
        }}
      >
        {[
          { l: 'Avg attendance · House', v: `${s.attendHouse}%`, c: COLORS.fg1 },
          { l: 'Avg attendance · Senate', v: `${s.attendSenate}%`, c: COLORS.fg1 },
          { l: 'Total raised · 2024 cycle', v: s.totalRaised, c: COLORS.blue },
        ].map((r, i) => (
          <div
            key={r.l}
            style={{
              padding: '10px 18px',
              borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <CqLabel>{r.l}</CqLabel>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: r.c,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {r.v}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 32 }}>
        <div>
          {/* Senators */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 12,
              }}
            >
              <div>
                <CqLabel>U.S. Senators</CqLabel>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Senate delegation</div>
              </div>
              <a
                href="#"
                style={{
                  fontSize: 11,
                  color: COLORS.blueHv,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Compare voting records →
              </a>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 0,
                border: '2px solid #000',
              }}
            >
              {s.senators.map((sen, i) => (
                <a
                  key={sen.name}
                  href="#"
                  style={{
                    padding: '20px 22px',
                    textDecoration: 'none',
                    color: COLORS.fg1,
                    borderRight: i === 0 ? `1px solid ${COLORS.line}` : 0,
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr',
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
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
                        background: sen.party === 'd' ? COLORS.green : COLORS.red,
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
                        fontSize: 20,
                      }}
                    >
                      {sen.initials}
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <CqChip variant={sen.party} size="sm">
                        {sen.party === 'd' ? 'D' : 'R'}
                      </CqChip>
                      <CqLabel>Senior · since {sen.since}</CqLabel>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>
                      {sen.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: COLORS.fg3,
                        fontFamily: 'var(--font-mono)',
                        marginTop: 4,
                      }}
                    >
                      Next election: {sen.next} · Attendance {sen.attend}%
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* House map */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 12,
              }}
            >
              <div>
                <CqLabel>{s.districts} House districts</CqLabel>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                  U.S. House delegation
                </div>
              </div>
              <a
                href="#"
                style={{
                  fontSize: 11,
                  color: COLORS.blueHv,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                Find by address →
              </a>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(13, 1fr)',
                gap: 4,
                padding: 16,
                border: '2px solid #000',
              }}
            >
              {s.districtGrid.map(d => (
                <div
                  key={d.n}
                  title={`${d.n}: ${d.name}`}
                  style={{
                    aspectRatio: '1',
                    border: '2px solid #000',
                    background: d.party === 'd' ? COLORS.green : COLORS.red,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {d.n}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                gap: 16,
                marginTop: 8,
                fontSize: 10,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: COLORS.green }} /> Democrat
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, background: COLORS.red }} /> Republican
              </span>
            </div>
          </div>

          {/* Recent bills sponsored from this state */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <CqLabel>119th Congress · sponsored from {s.name}</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Recent bills</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 130px 110px',
                gap: 12,
                padding: '10px 0',
                borderTop: '2px solid #000',
                borderBottom: `1px solid ${COLORS.line}`,
              }}
            >
              {['Bill', 'Title · sponsor', 'Status', 'Date'].map(h => (
                <CqLabel key={h}>{h}</CqLabel>
              ))}
            </div>
            {s.recentBills.map(b => (
              <div
                key={b.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr 130px 110px',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.n}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{b.t}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: COLORS.fg3,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 2,
                    }}
                  >
                    Sponsor: {b.sp}
                  </div>
                </div>
                <CqChip variant={b.variant} filled={b.variant === 'd'} size="sm">
                  {b.st}
                </CqChip>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                  {b.d}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside>
          <div style={{ border: '2px solid #000', padding: '18px' }}>
            <CqLabel>Top industries · 2024 contributions</CqLabel>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {s.industries.map(ind => (
                <div key={ind.n}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{ind.n}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg2 }}>
                      {ind.amt}
                    </span>
                  </div>
                  <div style={{ height: 6, background: COLORS.bg3 }}>
                    <div
                      style={{ width: `${ind.pct}%`, height: '100%', background: COLORS.blue }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderLeft: `6px solid ${COLORS.blue}`,
              background: COLORS.bg2,
              padding: '14px 16px',
              marginTop: 14,
            }}
          >
            <CqLabel>Election calendar</CqLabel>
            <div style={{ marginTop: 8, fontSize: 13, color: COLORS.fg1 }}>
              <div style={{ padding: '6px 0', borderBottom: `1px solid ${COLORS.line}` }}>
                <div style={{ fontWeight: 700 }}>U.S. Senate · class III</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                  Nov 3, 2026
                </div>
              </div>
              <div style={{ padding: '6px 0' }}>
                <div style={{ fontWeight: 700 }}>State legislature · biennial</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                  Nov 3, 2026
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, border: '2px solid #000', padding: '16px' }}>
            <CqLabel>Federal funding · per capita</CqLabel>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 6,
                color: COLORS.blue,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              {s.perCapita}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              USASpending · FY2025
            </div>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.93}>
          {' '}
          Aggregates from Congress.gov, FEC.gov, and USASpending.gov. Methodology at
          civ.iq/methodology.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

const STATE_NY = {
  name: 'New York',
  abbr: 'NY',
  region: 'Northeast',
  lean: 'D+12',
  districts: 26,
  capital: 'Albany',
  population: '19.5M',
  medianIncome: '$81,386',
  cycle: '2024',
  dHouse: 16,
  rHouse: 10,
  dSenate: 2,
  rSenate: 0,
  stateLeg: 213,
  iija: '$23.8B',
  sponsored: 312,
  attendHouse: 94,
  attendSenate: 96,
  totalRaised: '$284M',
  perCapita: '$3,420',
  senators: [
    { name: 'Charles E. Schumer', initials: 'CS', party: 'd', since: 1999, next: 2028, attend: 97 },
    {
      name: 'Kirsten E. Gillibrand',
      initials: 'KG',
      party: 'd',
      since: 2009,
      next: 2030,
      attend: 95,
    },
  ],
  districtGrid: Array.from({ length: 26 }, (_, i) => ({
    n: String(i + 1).padStart(2, '0'),
    name: `District ${i + 1}`,
    party: [3, 4, 11, 17, 19, 21, 22, 23, 24, 25].includes(i + 1) ? 'r' : 'd',
  })),
  recentBills: [
    {
      n: 'H.R. 4521',
      t: 'America COMPETES Act',
      sp: 'Jeffries (D-NY-08)',
      st: 'Became law',
      d: 'Jul 19, 2021',
      variant: 'd',
    },
    {
      n: 'H.R. 6744',
      t: 'Affordable Insulin Now Act',
      sp: 'Velázquez (D-NY-07)',
      st: 'Stalled',
      d: 'Feb 14, 2024',
      variant: 'warn',
    },
    {
      n: 'H.R. 7912',
      t: 'Empire State Tax Parity Act',
      sp: 'Lawler (R-NY-17)',
      st: 'Reported',
      d: 'Mar 22, 2024',
      variant: 'info',
    },
    {
      n: 'S. 1118',
      t: 'Hudson River Conservation Act',
      sp: 'Gillibrand (D-NY)',
      st: 'Hearing',
      d: 'Apr 11, 2024',
      variant: 'info',
    },
  ],
  industries: [
    { n: 'Securities & Investment', amt: '$48.2M', pct: 100 },
    { n: 'Real estate', amt: '$31.7M', pct: 66 },
    { n: 'Lawyers & Law Firms', amt: '$24.1M', pct: 50 },
    { n: 'Health professionals', amt: '$19.4M', pct: 40 },
    { n: 'Education', amt: '$14.8M', pct: 31 },
  ],
};

Object.assign(window, { StateOverview, STATE_NY });
