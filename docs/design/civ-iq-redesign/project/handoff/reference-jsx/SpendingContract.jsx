// FEDERAL CONTRACT / SPENDING — single award page.
// Real-ish: USASpending award for SpaceX · NASA Commercial Crew, FY24.
// Layout: hero (award + amount), parties, period, milestones, related contracts.

function SpendingContractPage() {
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Federal spending', 'Contracts', 'Awards', 'NASA · NNJ24-CCV-001']}
      crumbRight={[
        <span key="i">USASpending · award ID NNJ24CCV001</span>,
        <span key="d">FY 2024 · Active</span>,
      ]}
    >
      {/* HERO — black file stamp */}
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '32px 36px',
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 32,
          marginBottom: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: COLORS.blue,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            CONTRACT · TYPE C · COST-PLUS-INCENTIVE-FEE
          </div>
          <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
            NASA Commercial Crew Program · Phase 2
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              margin: '0 0 14px',
              textTransform: 'uppercase',
            }}
          >
            Crew Transportation
            <br />
            Services · Crew-9 / 10
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 24,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: '#d1d5db',
              flexWrap: 'wrap',
            }}
          >
            <span>
              Award ID · <strong style={{ color: '#fff' }}>NNJ24-CCV-001</strong>
            </span>
            <span>
              Period · <strong style={{ color: '#fff' }}>Jan 2024 – Dec 2027</strong>
            </span>
            <span>
              Type · <strong style={{ color: '#fff' }}>Definitive contract</strong>
            </span>
          </div>
        </div>
        <div
          style={{
            border: '2px solid #fff',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9ca3af',
              letterSpacing: '0.12em',
            }}
          >
            OBLIGATED, FY24
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              marginTop: 6,
              color: COLORS.blue,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            $1.84B
          </div>
          <div
            style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9ca3af', marginTop: 6 }}
          >
            of $4.93B ceiling
          </div>
        </div>
      </div>

      {/* PARTIES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 80px 1fr',
          border: '2px solid #000',
          marginBottom: 32,
        }}
      >
        <PartyCard
          eyebrow="Awarding agency"
          name="National Aeronautics and Space Administration"
          short="NASA · Johnson Space Center"
          dom="nasa.gov"
          meta={[
            ['UEI', 'KZJL2KK8YK53'],
            ['CFO', 'Margaret Vo Schaus'],
            ['Office', 'Houston, TX'],
            ['Subagency', 'Mission Directorate'],
          ]}
          accent={COLORS.blue}
        />
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 6,
            padding: '20px 0',
            borderLeft: `1px solid ${COLORS.line}`,
            borderRight: `1px solid ${COLORS.line}`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: '#9ca3af',
              letterSpacing: '0.12em',
            }}
          >
            OBLIGATES
          </span>
          <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>
            →
          </span>
        </div>
        <PartyCard
          eyebrow="Recipient · prime contractor"
          name="Space Exploration Technologies Corp."
          short="SpaceX · Hawthorne, CA"
          dom="spacex.com"
          meta={[
            ['UEI', 'NEXNW7RKW5C5'],
            ['CEO', 'Elon Musk'],
            ['Founded', '2002'],
            ['Type', 'For-profit · Closely held'],
          ]}
          accent={COLORS.green}
        />
      </div>

      {/* OBLIGATION SCHEDULE + RELATED */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32 }}>
        <div>
          <CqLabel>Obligation schedule · 12 modifications</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, marginBottom: 12 }}>
            How the award has been funded
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 110px 1fr 130px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['#', 'Date', 'Action', 'Obligated', 'Cumulative'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            { d: 'Jan 12, 2024', a: 'Initial award', o: '$680.0M', c: '$680.0M' },
            { d: 'Mar 04, 2024', a: 'Mod 01 · Pre-launch checkout', o: '$112.0M', c: '$792.0M' },
            { d: 'Apr 22, 2024', a: 'Mod 02 · Crew-9 launch services', o: '$240.0M', c: '$1.03B' },
            { d: 'Jun 18, 2024', a: 'Mod 03 · Spares + sustaining', o: '$96.0M', c: '$1.13B' },
            {
              d: 'Aug 30, 2024',
              a: 'Mod 04 · Crew-10 mission insertion',
              o: '$320.0M',
              c: '$1.45B',
            },
            { d: 'Oct 11, 2024', a: 'Mod 05 · Cargo upmass extension', o: '$88.0M', c: '$1.54B' },
            { d: 'Dec 02, 2024', a: 'Mod 06 · Pad refurbishment', o: '$172.0M', c: '$1.71B' },
            {
              d: 'Mar 14, 2025',
              a: 'Mod 07 · Quarterly performance fee',
              o: '$130.0M',
              c: '$1.84B',
              current: true,
            },
          ].map((m, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 110px 1fr 130px 110px',
                gap: 12,
                padding: '12px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
                background: m.current ? COLORS.bg2 : 'transparent',
                boxShadow: m.current ? `inset 3px 0 0 ${COLORS.blue}` : 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {String(i + 0).padStart(2, '0')}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg2 }}>
                {m.d}
              </span>
              <span style={{ fontSize: 13 }}>{m.a}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {m.o}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: COLORS.blue,
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {m.c}
              </span>
            </div>
          ))}

          {/* PROGRESS BAR */}
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 700 }}>Obligated against ceiling</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>$1.84B / $4.93B · 37.3%</span>
            </div>
            <div style={{ height: 14, background: COLORS.bg3, border: `1px solid ${COLORS.line}` }}>
              <div style={{ height: '100%', width: '37.3%', background: COLORS.blue }} />
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <CqPlainReading>
              NASA awarded SpaceX a $4.93 billion ceiling for Commercial Crew Phase 2. Through Mar
              14, 2025, NASA has obligated $1.84 billion across 8 modifications, primarily funding
              Crew-9 and Crew-10 launch services and pad refurbishment.
            </CqPlainReading>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* CONGRESSIONAL CONTEXT */}
          <div style={{ border: '2px solid #000', padding: 18 }}>
            <CqLabel>Authorizing law</CqLabel>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8, lineHeight: 1.4 }}>
              NASA Authorization Act of 2022 (P.L. 117-167, Title VII)
            </div>
            <div style={{ fontSize: 12, color: COLORS.fg2, marginTop: 8, lineHeight: 1.5 }}>
              Section 715 directed continued procurement of crew transportation services from at
              least one commercial provider through 2030.
            </div>
            <a
              style={{
                fontSize: 11,
                color: COLORS.blueHv,
                fontFamily: 'var(--font-mono)',
                textDecoration: 'underline',
                textDecorationThickness: 1,
                textUnderlineOffset: 3,
                display: 'inline-block',
                marginTop: 10,
              }}
            >
              P.L. 117-167 →
            </a>
          </div>

          {/* RELATED CONTRACTS */}
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
              Related awards · same recipient
            </div>
            {[
              ['NNK20-MA-001', 'NASA · HLS Option B', '$2.89B'],
              ['NNJ23-CRS-002', 'NASA · CRS-2 cargo', '$0.74B'],
              ['F8650-22-D-CCS', 'USSF · Falcon Heavy NSSL', '$0.32B'],
              ['HQ0034-22-D-0001', 'DoD · Starshield', '$1.80B'],
            ].map(([id, t, amt], i, a) => (
              <div
                key={id}
                style={{
                  padding: '12px 14px',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.fg3 }}>
                  {id}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{t}</div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.blue,
                    marginTop: 4,
                  }}
                >
                  {amt}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.97} method="USASpending bulk · daily ingest · ingested Apr 25">
          {' '}
          Award amounts reflect federal obligations as recorded in FPDS-NG. Subcontracts and
          pass-through awards are linked separately under the related-awards rail.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function PartyCard({ eyebrow, name, short, dom, meta, accent }) {
  return (
    <div style={{ padding: '20px 24px', position: 'relative' }}>
      <div
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }}
      />
      <CqLabel>{eyebrow}</CqLabel>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 6,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
        }}
      >
        {name}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg2 }}>
        {short} · {dom}
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: '12px 0 0',
          padding: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}
      >
        {meta.map(([k, v], i) => (
          <li
            key={k}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '5px 0',
              borderTop: i === 0 ? `1px solid ${COLORS.line}` : `1px solid ${COLORS.line}`,
              gap: 12,
            }}
          >
            <span style={{ color: COLORS.fg3 }}>{k}</span>
            <span style={{ fontWeight: 700, textAlign: 'right', color: COLORS.fg1 }}>{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { SpendingContractPage });
