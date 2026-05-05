// PAC PROFILE — Senate Majority PAC (super PAC, supports Democrats).
// Mirrors the official-profile chassis: hero, headline metrics, top recipients,
// top donors, ad-spending log, plain reading.

function PACProfilePage() {
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Money', 'Outside groups', 'Super PACs', 'Senate Majority PAC']}
      crumbRight={[
        <span key="i">FEC · C00484642</span>,
        <span key="d">Q1 2026 · Filed Apr 15</span>,
      ]}
    >
      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 240px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid #000',
          alignItems: 'flex-start',
        }}
      >
        {/* Aicher mark in lieu of portrait */}
        <div
          style={{
            width: 120,
            height: 120,
            border: '2px solid #000',
            background: '#fff',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: COLORS.green,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: COLORS.fg3,
                letterSpacing: '0.12em',
              }}
            >
              SUPER
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: '-0.04em',
                color: COLORS.fg1,
              }}
            >
              PAC
            </div>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <CqChip variant="d" size="sm">
              Aligned · Democratic
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              Super PAC · Independent expenditure
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              Federal · Senate
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            Senate Majority PAC
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            Founded 2011 · Treasurer J.B. Poersch · Independent of Senate Democratic Caucus per FEC
            declaration
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            FEC filings
          </CqButton>
          <CqButton variant="primary" size="sm">
            All recipients →
          </CqButton>
        </div>
      </div>

      {/* HEADLINE METRICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          {
            label: 'Total raised',
            value: '$184.6M',
            caption: '2025–26 cycle to date',
            color: COLORS.blue,
          },
          {
            label: 'Cash on hand',
            value: '$71.2M',
            caption: 'As of Mar 31, 2026',
            color: COLORS.fg1,
          },
          {
            label: 'Indep. expend.',
            value: '$62.4M',
            caption: '8 races · 5 states',
            color: COLORS.fg1,
          },
          { label: 'Avg gift size', value: '$24,808', caption: '7,438 donors', color: COLORS.fg1 },
          { label: 'Million-dollar+', value: '47', caption: 'Donors ≥ $1M', color: COLORS.fg1 },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...s} size={28} />
          </div>
        ))}
      </div>

      {/* TOP DONORS + TOP RECIPIENTS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          marginTop: 32,
          marginBottom: 32,
        }}
      >
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
              <CqLabel>Top donors · cycle to date</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Where the money came from
              </div>
            </div>
          </div>
          {[
            { n: 'Reid Hoffman', d: 'Tech · LinkedIn co-founder', amt: '$15.0M', pct: 8.1 },
            { n: 'George Soros', d: 'Open Society Foundations', amt: '$12.5M', pct: 6.8 },
            { n: 'Patricia Quillin · Reed Hastings', d: 'Tech · Netflix', amt: '$11.0M', pct: 6.0 },
            { n: 'Stephen F. Mandel Jr.', d: 'Finance · Lone Pine', amt: '$8.0M', pct: 4.3 },
            { n: 'Karla Jurvetson', d: 'Medicine · investor', amt: '$7.5M', pct: 4.1 },
            { n: 'Henry Laufer', d: 'Finance · Renaissance Tech', amt: '$5.0M', pct: 2.7 },
            { n: 'Other 7,432 donors', d: '7,432 donors', amt: '$125.6M', pct: 68.0, faded: true },
          ].map((d, i) => (
            <div
              key={d.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 100px 50px',
                gap: 10,
                padding: '12px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: d.faded ? COLORS.fg2 : COLORS.fg1,
                  }}
                >
                  {d.n}
                </div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {d.d}
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'right',
                  color: d.faded ? COLORS.fg2 : COLORS.fg1,
                }}
              >
                {d.amt}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: COLORS.fg3,
                  textAlign: 'right',
                }}
              >
                {d.pct}%
              </span>
            </div>
          ))}
        </div>

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
              <CqLabel>Independent expenditures · by race</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Where the money went
              </div>
            </div>
          </div>
          {[
            {
              race: 'Sen. Sherrod Brown',
              st: 'OH · 2024',
              amt: '$22.4M',
              dir: 'For',
              bills: '47 ad flights',
            },
            {
              race: 'Sen. Jacky Rosen',
              st: 'NV · 2024',
              amt: '$11.8M',
              dir: 'For',
              bills: '31 ad flights',
            },
            {
              race: 'Sen. Jon Tester',
              st: 'MT · 2024',
              amt: '$10.9M',
              dir: 'For',
              bills: '29 ad flights',
            },
            {
              race: 'Bernie Moreno',
              st: 'OH · 2024',
              amt: '$8.6M',
              dir: 'Against',
              bills: '24 ad flights',
            },
            {
              race: 'Sam Brown',
              st: 'NV · 2024',
              amt: '$3.8M',
              dir: 'Against',
              bills: '11 ad flights',
            },
            {
              race: 'Tim Sheehy',
              st: 'MT · 2024',
              amt: '$4.9M',
              dir: 'Against',
              bills: '14 ad flights',
            },
          ].map((r, i) => (
            <div
              key={r.race}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 70px 90px',
                gap: 10,
                padding: '12px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.race}</div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {r.st} · {r.bills}
                </div>
              </div>
              <CqChip variant={r.dir === 'For' ? 'd' : 'r'} filled={false} size="sm">
                {r.dir}
              </CqChip>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {r.amt}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SPENDING TIMELINE */}
      <div style={{ marginBottom: 32 }}>
        <CqLabel>Quarterly raise + burn · 2023 → 2026 Q1</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
          Cycle pace
        </div>
        <div style={{ border: '2px solid #000', padding: 24, height: 220, position: 'relative' }}>
          <PACChart />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <CqPlainReading>
          Senate Majority PAC raised $184.6M in the 2025–26 cycle through Mar 31, primarily from 47
          donors giving $1M or more. As an "independent expenditure" committee, it can raise
          unlimited sums but cannot legally coordinate with candidate campaigns. The largest single
          recipient race is the Ohio Senate seat held by Sen. Sherrod Brown.
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.98} method="FEC bulk · Q1 2026 · ingested Apr 16">
          {' '}
          Independent-expenditure totals reflect FEC reports only; communications not subject to
          disclosure (e.g., genuine issue ads outside electioneering windows) are not included.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function PACChart() {
  const data = [
    { q: '23 Q1', raise: 12, spend: 4 },
    { q: '23 Q2', raise: 18, spend: 6 },
    { q: '23 Q3', raise: 22, spend: 9 },
    { q: '23 Q4', raise: 28, spend: 14 },
    { q: '24 Q1', raise: 36, spend: 22 },
    { q: '24 Q2', raise: 32, spend: 31 },
    { q: '24 Q3', raise: 24, spend: 38 },
    { q: '25 Q1', raise: 8, spend: 3 },
    { q: '25 Q2', raise: 14, spend: 5 },
    { q: '25 Q3', raise: 22, spend: 8 },
    { q: '25 Q4', raise: 35, spend: 14 },
    { q: '26 Q1', raise: 48, spend: 22 },
  ];
  const w = 1212,
    h = 172,
    max = 50;
  const bw = (w - 80) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
      {[10, 20, 30, 40, 50].map(v => (
        <g key={v}>
          <line
            x1={50}
            x2={w - 20}
            y1={h - 28 - (v / max) * (h - 56)}
            y2={h - 28 - (v / max) * (h - 56)}
            stroke={COLORS.line}
          />
          <text
            x={10}
            y={h - 24 - (v / max) * (h - 56)}
            fontSize={10}
            fill={COLORS.fg3}
            fontFamily="var(--font-mono)"
          >
            ${v}M
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = 50 + i * bw;
        const rH = (d.raise / max) * (h - 56);
        const sH = (d.spend / max) * (h - 56);
        return (
          <g key={d.q}>
            <rect x={x + 4} y={h - 28 - rH} width={(bw - 12) / 2} height={rH} fill={COLORS.blue} />
            <rect
              x={x + 4 + (bw - 12) / 2 + 2}
              y={h - 28 - sH}
              width={(bw - 12) / 2}
              height={sH}
              fill={COLORS.fg1}
            />
            <text
              x={x + bw / 2}
              y={h - 12}
              fontSize={10}
              fill={COLORS.fg3}
              fontFamily="var(--font-mono)"
              textAnchor="middle"
            >
              {d.q}
            </text>
          </g>
        );
      })}
      <g transform="translate(60, 12)">
        <rect x={0} y={0} width={10} height={10} fill={COLORS.blue} />
        <text x={16} y={9} fill={COLORS.fg1} fontSize={11} fontWeight={700}>
          RAISED
        </text>
        <rect x={90} y={0} width={10} height={10} fill={COLORS.fg1} />
        <text x={106} y={9} fill={COLORS.fg1} fontSize={11} fontWeight={700}>
          SPENT (IE)
        </text>
      </g>
    </svg>
  );
}

Object.assign(window, { PACProfilePage });
