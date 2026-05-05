// DISTRICT — single congressional district as a first-class page.
// NY-08 (Hakeem Jeffries). Demographics, the rep, neighboring districts,
// federal money flowing in, and ZIPs in district.

function DistrictPage() {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Districts', 'Federal · House', 'New York', 'NY-08 · Brooklyn-Queens']}
      crumbRight={[<span key="i">FIPS · 36-008</span>, <span key="c">119th Congress</span>]}
    >
      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '2px solid #000',
          marginBottom: 28,
        }}
      >
        {/* Left: numbers */}
        <div style={{ padding: '32px 36px', borderRight: `1px solid ${COLORS.line}` }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <CqChip variant="ink" size="sm">
              Federal · House
            </CqChip>
            <CqChip variant="d" filled={false} size="sm">
              D · Safe
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              Urban · Coastal
            </CqChip>
          </div>
          <div
            style={{
              fontSize: 13,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            NEW YORK · 8TH
          </div>
          <h1
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
              margin: '8px 0 4px',
              color: COLORS.blue,
            }}
          >
            NY-08
          </h1>
          <div style={{ fontSize: 18, color: COLORS.fg2, marginBottom: 16, fontWeight: 500 }}>
            Brooklyn · East New York · Coney Island · Howard Beach
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginTop: 24,
            }}
          >
            {[
              ['Population', '775,310'],
              ['Median age', '37.4'],
              ['Median HH income', '$71,224'],
              ['College+ adults', '38.4%'],
              ['Owner-occupied', '28.6%'],
              ['Foreign-born', '37.1%'],
            ].map(([k, v], i) => (
              <div key={k}>
                <CqLabel>{k}</CqLabel>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: COLORS.fg3,
              marginTop: 18,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Source · Census ACS 5-year 2024
          </div>
        </div>

        {/* Right: schematic district map */}
        <div style={{ position: 'relative', background: COLORS.bg2, padding: 0, minHeight: 480 }}>
          <DistrictMap />
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: COLORS.fg3,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Schematic · placeholder
          </div>
        </div>
      </div>

      {/* WHO REPRESENTS YOU */}
      <div style={{ marginBottom: 32 }}>
        <CqLabel>Who represents this district</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Federal + state delegation
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            border: '2px solid #000',
          }}
        >
          {[
            { who: 'U.S. House', name: 'Hakeem S. Jeffries', sub: 'D · Since 2013', p: 'd' },
            { who: 'U.S. Senate', name: 'Kirsten Gillibrand', sub: 'D · Since 2009', p: 'd' },
            { who: 'U.S. Senate', name: 'Charles E. Schumer', sub: 'D · Since 1999', p: 'd' },
            { who: 'NY State Sen.', name: 'Roxanne J. Persaud', sub: 'D · SD-19', p: 'd' },
          ].map((r, i) => (
            <div
              key={r.name}
              style={{
                padding: '20px 22px',
                borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <CqPortrait name={r.name} size={56} party={r.p} />
              <div>
                <CqLabel>{r.who}</CqLabel>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.2 }}>
                  {r.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: COLORS.fg3,
                    fontFamily: 'var(--font-mono)',
                    marginTop: 4,
                  }}
                >
                  {r.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FED MONEY IN + RACE/ETH */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, marginBottom: 32 }}>
        <div>
          <CqLabel>Federal spending · obligations to NY-08 · FY24</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Where federal money goes in this district
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: COLORS.blue,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 16,
            }}
          >
            $1.42B
          </div>
          {[
            {
              l: 'Health & HHS · Medicare/Medicaid mgmt',
              pct: 38,
              amt: '$540M',
              sub: '4 awards · NYC Health + Hospitals primary',
            },
            {
              l: 'Transportation · IIJA capital',
              pct: 22,
              amt: '$312M',
              sub: '11 awards · MTA, Port Authority',
            },
            { l: 'Education · Title I + IDEA', pct: 16, amt: '$227M', sub: 'NYC DOE · 78 schools' },
            {
              l: 'HUD · Section 8 + Public Housing',
              pct: 14,
              amt: '$199M',
              sub: 'NYCHA developments',
            },
            {
              l: 'SBA · COVID-era SBL outstanding',
              pct: 6,
              amt: '$85M',
              sub: '4,140 small businesses',
            },
            { l: 'Other', pct: 4, amt: '$57M', sub: 'NSF, USDA, Interior' },
          ].map(b => (
            <CqBar key={b.l} {...b} color={COLORS.blue} />
          ))}
        </div>
        <div>
          <CqLabel>Race + ethnicity</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            Demographic composition
          </div>
          <div style={{ display: 'flex', height: 32, border: '2px solid #000', marginBottom: 16 }}>
            {[
              { l: 'Black', pct: 51, c: COLORS.fg1 },
              { l: 'Hispanic', pct: 21, c: COLORS.vlau },
              { l: 'White', pct: 14, c: COLORS.greige },
              { l: 'Asian', pct: 11, c: COLORS.blue },
              { l: 'Other', pct: 3, c: COLORS.fg3 },
            ].map(s => (
              <div
                key={s.l}
                style={{ width: s.pct + '%', background: s.c, borderRight: '2px solid #000' }}
              />
            ))}
          </div>
          {[
            { l: 'Black', pct: 51, c: COLORS.fg1 },
            { l: 'Hispanic', pct: 21, c: COLORS.vlau },
            { l: 'White', pct: 14, c: COLORS.greige },
            { l: 'Asian', pct: 11, c: COLORS.blue },
            { l: 'Other', pct: 3, c: COLORS.fg3 },
          ].map((s, i) => (
            <div
              key={s.l}
              style={{
                display: 'grid',
                gridTemplateColumns: '12px 1fr 50px',
                gap: 10,
                padding: '8px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ width: 10, height: 10, background: s.c, display: 'inline-block' }} />
              <span style={{ fontSize: 13 }}>{s.l}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {s.pct}%
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${COLORS.line}`,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: COLORS.fg3,
            }}
          >
            Source · Census ACS 5-year 2024
          </div>
        </div>
      </div>

      {/* NEIGHBORS + ZIPS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
        <div>
          <CqLabel>Neighboring districts</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            NY-08 borders
          </div>
          {[
            { d: 'NY-07', who: 'Nydia M. Velázquez', p: 'd', sh: 'shares Brooklyn waterfront' },
            { d: 'NY-09', who: 'Yvette D. Clarke', p: 'd', sh: 'shares central Brooklyn' },
            { d: 'NY-10', who: 'Daniel S. Goldman', p: 'd', sh: 'shares Bay Ridge corridor' },
            { d: 'NY-05', who: 'Gregory W. Meeks', p: 'd', sh: 'shares Howard Beach line' },
          ].map((n, i) => (
            <a
              key={n.d}
              href="#"
              style={{
                textDecoration: 'none',
                color: COLORS.fg1,
                display: 'grid',
                gridTemplateColumns: '70px 1fr 24px',
                gap: 14,
                alignItems: 'center',
                padding: '14px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: COLORS.blue,
                }}
              >
                {n.d}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.who}</div>
                <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {n.sh}
                </div>
              </div>
              <span style={{ color: COLORS.blueHv, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                →
              </span>
            </a>
          ))}
        </div>
        <div>
          <CqLabel>ZIP codes in district</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            26 ZIPs · whole + partial
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              border: '2px solid #000',
            }}
          >
            {[
              ['11201', 1],
              ['11203', 1],
              ['11207', 1],
              ['11208', 1],
              ['11210', 0.6],
              ['11212', 1],
              ['11215', 0.4],
              ['11217', 1],
              ['11218', 0.3],
              ['11220', 0.7],
              ['11222', 0],
              ['11223', 1],
              ['11224', 1],
              ['11225', 0.5],
              ['11226', 0.4],
              ['11228', 1],
              ['11229', 1],
              ['11230', 0.5],
              ['11232', 0.4],
              ['11233', 1],
              ['11235', 1],
              ['11236', 1],
              ['11237', 0.2],
              ['11238', 0.5],
              ['11239', 1],
              ['11414', 1],
            ].map(([z, share], i) => (
              <div
                key={z}
                style={{
                  padding: '10px 12px',
                  borderRight: (i + 1) % 4 ? `1px solid ${COLORS.line}` : 0,
                  borderTop: i >= 4 ? `1px solid ${COLORS.line}` : 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                  {z}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: share === 1 ? COLORS.green : share > 0.4 ? COLORS.blue : COLORS.fg3,
                    fontWeight: 700,
                  }}
                >
                  {share === 1 ? 'whole' : Math.round(share * 100) + '%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.94} method="Census TIGER/Line · ACS 5-year · USASpending DSAC">
          {' '}
          District boundaries reflect 2022 redistricting. ZIP-to-district mapping is approximate;
          some ZIPs span multiple districts.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function DistrictMap() {
  // Schematic blocky outline of NY-08, 4 wedges colored. Pure abstract.
  return (
    <svg viewBox="0 0 600 480" style={{ width: '100%', height: 480, display: 'block' }}>
      <rect x={0} y={0} width={600} height={480} fill={COLORS.bg2} />
      {/* grid */}
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={'h' + i} x1={0} x2={600} y1={i * 40} y2={i * 40} stroke={COLORS.bg3} />
      ))}
      {Array.from({ length: 16 }).map((_, i) => (
        <line key={'v' + i} x1={i * 40} x2={i * 40} y1={0} y2={480} stroke={COLORS.bg3} />
      ))}
      {/* district shape */}
      <polygon
        points="120,80 360,60 480,140 460,260 380,360 240,420 120,400 60,300 80,180"
        fill="rgba(62,162,212,0.15)"
        stroke={COLORS.blue}
        strokeWidth={3}
      />
      {/* labels */}
      <g fontFamily="var(--font-mono)" fontWeight={700} fontSize={12}>
        <text x={200} y={140} fill={COLORS.fg1}>
          BROOKLYN HTS
        </text>
        <text x={300} y={220} fill={COLORS.fg1}>
          EAST NY
        </text>
        <text x={140} y={340} fill={COLORS.fg1}>
          CONEY ISLAND
        </text>
        <text x={400} y={320} fill={COLORS.fg1}>
          HOWARD BEACH
        </text>
      </g>
      {/* compass */}
      <g transform="translate(540, 40)">
        <polygon points="0,-12 4,4 0,0 -4,4" fill={COLORS.fg1} />
        <text x={-4} y={-16} fontSize={10} fill={COLORS.fg3} fontFamily="var(--font-mono)">
          N
        </text>
      </g>
      {/* district number stamp */}
      <g transform="translate(40, 40)">
        <rect x={0} y={0} width={70} height={28} fill="#000" />
        <text
          x={35}
          y={20}
          fill="#fff"
          fontSize={14}
          fontWeight={700}
          fontFamily="var(--font-mono)"
          textAnchor="middle"
          letterSpacing="0.08em"
        >
          NY-08
        </text>
      </g>
    </svg>
  );
}

Object.assign(window, { DistrictPage });
