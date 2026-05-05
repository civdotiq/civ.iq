// LOCAL COUNCIL — city council page (NYC City Council, District 33).
// Mirrors a federal Profile chassis at the city scale: members table,
// recent legislation, ward map placeholder, finance summary.

function LocalCouncilPage() {
  const members = [
    {
      d: '01',
      n: 'Christopher Marte',
      p: 'd',
      nbhd: 'Lower Manhattan',
      since: 2022,
      att: 96.2,
      spon: 31,
    },
    {
      d: '02',
      n: 'Carlina Rivera',
      p: 'd',
      nbhd: 'East Village',
      since: 2018,
      att: 97.4,
      spon: 44,
    },
    {
      d: '33',
      n: 'Lincoln Restler',
      p: 'd',
      nbhd: 'Brooklyn Heights',
      since: 2022,
      att: 99.1,
      spon: 52,
      current: true,
    },
    {
      d: '34',
      n: 'Jennifer Gutiérrez',
      p: 'd',
      nbhd: 'Williamsburg',
      since: 2022,
      att: 95.0,
      spon: 28,
    },
    { d: '35', n: 'Crystal Hudson', p: 'd', nbhd: 'Fort Greene', since: 2022, att: 98.3, spon: 39 },
    {
      d: '36',
      n: 'Chi Ossé',
      p: 'd',
      nbhd: 'Bedford-Stuyvesant',
      since: 2022,
      att: 94.8,
      spon: 22,
    },
    { d: '38', n: 'Alexa Avilés', p: 'd', nbhd: 'Sunset Park', since: 2022, att: 97.6, spon: 33 },
    { d: '39', n: 'Shahana Hanif', p: 'd', nbhd: 'Park Slope', since: 2022, att: 98.1, spon: 41 },
    {
      d: '51',
      n: 'Joseph Borelli',
      p: 'r',
      nbhd: 'South Shore SI',
      since: 2015,
      att: 91.4,
      spon: 18,
    },
  ];

  const legislation = [
    {
      id: 'Int 0024-2024',
      t: 'Open Restaurants Permanent Program',
      st: 'Adopted',
      d: 'Mar 14, 2024',
      vote: '37–8',
    },
    {
      id: 'Int 0190-2024',
      t: 'Right-to-Counsel Expansion · Housing',
      st: 'Committee',
      d: 'Apr 02, 2024',
      vote: '—',
    },
    {
      id: 'Res 0091-2024',
      t: 'Calling on Albany to pass HALT Act',
      st: 'Adopted',
      d: 'Apr 16, 2024',
      vote: '42–9',
    },
    {
      id: 'Int 0411-2024',
      t: 'Fair Workweek · Fast-food Amendment',
      st: 'First reading',
      d: 'Apr 28, 2024',
      vote: '—',
    },
    {
      id: 'Int 0078-2024',
      t: 'Universal Pre-K Funding Floor',
      st: 'Adopted',
      d: 'Mar 28, 2024',
      vote: '50–1',
    },
  ];

  return (
    <CqPage
      width={1280}
      currentNav="states"
      crumbs={['Local government', 'New York', 'New York City', 'City Council', '2024 session']}
      crumbRight={[
        <span key="s">Sources · NYC Council Legistar · 2 more</span>,
        <span key="t">Updated · 4 hrs ago</span>,
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
              Local · Legislative
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              51 districts
            </CqChip>
            <CqChip variant="d" filled={false} size="sm">
              D · 46
            </CqChip>
            <CqChip variant="r" filled={false} size="sm">
              R · 5
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '0 0 12px',
              textTransform: 'uppercase',
            }}
          >
            New York City
            <br />
            Council
          </h1>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: COLORS.fg2, margin: 0, maxWidth: 640 }}>
            The legislative body of the City of New York. 51 council members elected from geographic
            districts. Speaker chairs sessions; standing committees handle review and oversight.
          </p>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Session file</CqLabel>
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
              ['Speaker', 'Adrienne E. Adams (D-28)'],
              ['Term', 'Jan 2022 – Dec 2025'],
              ['Members', '51'],
              ['Sessions in 2024', '38 stated meetings'],
              ['Bills introduced', '712 (year-to-date)'],
              ['Bills enacted', '94 (year-to-date)'],
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
            label: 'Bills introduced',
            value: '712',
            caption: 'YTD · 2024 session',
            color: COLORS.fg1,
          },
          { label: 'Bills enacted', value: '94', caption: '13.2% pass rate', color: COLORS.fg1 },
          { label: 'Stated meetings', value: '38', caption: '14 livestreamed', color: COLORS.fg1 },
          { label: 'Avg attendance', value: '96.4%', caption: '51 members', color: COLORS.blue },
          { label: 'Public hearings', value: '142', caption: 'Open to comment', color: COLORS.fg1 },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...s} size={32} />
          </div>
        ))}
      </div>

      {/* MEMBERS TABLE + SIDEBAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 32 }}>
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
              <CqLabel>Members · 9 of 51 shown · filter your district</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Council roster</div>
            </div>
            <CqButton variant="secondary" size="sm">
              View all 51 →
            </CqButton>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '52px 1fr 110px 80px 70px 70px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Dist.', 'Member', 'Neighborhood', 'Party', 'Att.', 'Spon.'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {members.map(m => (
            <div
              key={m.d}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px 1fr 110px 80px 70px 70px',
                gap: 12,
                padding: '14px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
                background: m.current ? COLORS.bg2 : 'transparent',
                boxShadow: m.current ? `inset 3px 0 0 ${COLORS.blue}` : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: COLORS.fg1,
                }}
              >
                D-{m.d}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{m.n}</div>
                <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  Serving since {m.since}
                </div>
              </div>
              <span style={{ fontSize: 12, color: COLORS.fg2 }}>{m.nbhd}</span>
              <CqChip variant={m.p} size="sm">
                {m.p === 'd' ? 'Dem' : 'Rep'}
              </CqChip>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                {m.att}%
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {m.spon}
              </span>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              The Council is currently 46 Democrats and 5 Republicans. Average attendance across all
              51 members is 96.4%. Speaker Adrienne Adams presides; the Progressive Caucus holds 27
              of 46 Democratic seats.
            </CqPlainReading>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* MAP PLACEHOLDER */}
          <div style={{ border: '2px solid #000' }}>
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${COLORS.line}` }}>
              <CqLabel>District map · five boroughs</CqLabel>
            </div>
            <div
              style={{
                height: 200,
                position: 'relative',
                background: COLORS.bg2,
                backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
              }}
            >
              {/* schematic of 5 boroughs as squares */}
              <div
                style={{
                  position: 'absolute',
                  inset: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 4,
                }}
              >
                {['BX', 'MN', 'QN', 'BK', 'SI'].map((b, i) => (
                  <div
                    key={b}
                    style={{
                      border: `2px solid ${i === 3 ? COLORS.blue : '#000'}`,
                      background: i === 3 ? COLORS.blue : '#fff',
                      color: i === 3 ? '#fff' : COLORS.fg1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}
                  >
                    {b}
                  </div>
                ))}
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: 6,
                  right: 8,
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

          {/* COMMITTEES */}
          <div style={{ border: '2px solid #000', padding: 18 }}>
            <CqLabel>Standing committees · 35</CqLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Land Use',
                'Finance',
                'Housing & Buildings',
                'Education',
                'Transportation',
                'Public Safety',
                'Health',
              ].map((c, i, a) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    paddingBottom: 6,
                    borderBottom: i === a.length - 1 ? 0 : `1px solid ${COLORS.line}`,
                    fontSize: 12,
                  }}
                >
                  <span>{c}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                    {[12, 14, 11, 9, 10, 11, 10][i]} mem.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* RECENT LEGISLATION */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
          }}
        >
          <div>
            <CqLabel>Recent legislation · last 60 days</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              What the Council has been voting on
            </div>
          </div>
          <CqButton variant="secondary" size="sm">
            Browse all bills →
          </CqButton>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 130px 110px 90px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['File', 'Title', 'Status', 'Date', 'Vote'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {legislation.map(b => (
          <div
            key={b.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 130px 110px 90px',
              gap: 12,
              padding: '14px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.id}</span>
            <span style={{ fontSize: 13 }}>{b.t}</span>
            <CqChip
              variant={b.st === 'Adopted' ? 'd' : 'info'}
              filled={b.st === 'Adopted'}
              size="sm"
            >
              {b.st}
            </CqChip>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {b.d}
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                textAlign: 'right',
              }}
            >
              {b.vote}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.92} method="NYC Council Legistar API · ingested daily">
          {' '}
          Local-government coverage expands incrementally. NYC Council is fully indexed; 47 of 50
          largest U.S. cities are next.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { LocalCouncilPage });
