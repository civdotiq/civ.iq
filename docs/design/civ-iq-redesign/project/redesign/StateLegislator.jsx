// STATE LEGISLATOR PROFILE — the state-level analog to the federal profile.
// Same chassis (black masthead, hero, 5-stat strip, secondary row, content),
// adapted for state house data: state bills, district demographics, state PACs.

const STATE_LEGISLATOR_GOUNARDES = {
  id: 'gounardes',
  name: 'Andrew S. Gounardes',
  short: 'Gounardes',
  role: 'New York State Senator',
  body: 'NY State Senate',
  state: 'New York',
  district: 'SD-26',
  party: 'd',
  partyLong: 'Democrat',
  position: 'Chair, Budget & Revenue',
  since: 2019,
  next_election: 'Nov 3, 2026',
  session: '2025–26',
  party_vote: 92,
  attendance: 97.1,
  bills_sponsored: 47,
  cosponsored: 184,
  committees: ['Budget & Revenue', 'Cities', 'Transportation', 'Codes'],
  raised: '$612K',
  cash_on_hand: '$284K',
  small_donor_pct: 38,
  pac_pct: 22,
  industry_top: 'Real Estate',
  contact: {
    capitol: { addr: '188 State Street, LOB Room 502, Albany, NY 12247', phone: '(518) 455-3270' },
    district: [
      { name: 'Bay Ridge', addr: '8703 5th Avenue, Brooklyn, NY 11209', phone: '(718) 238-6044' },
      { name: 'Sunset Park', addr: '5114 4th Avenue, Brooklyn, NY 11220', phone: '(718) 238-6044' },
    ],
    web: 'nysenate.gov/senators/andrew-gounardes',
    twitter: '@agounardes',
  },
};

function StateLegislatorProfile({ o = STATE_LEGISLATOR_GOUNARDES }) {
  const partyClr = partyColor(o.party);
  return (
    <CqPage
      width={1280}
      currentNav="states"
      crumbs={['States', o.state, o.body, o.district]}
      crumbRight={[
        <span key="f">
          File · {o.id.toUpperCase()}-{o.session}
        </span>,
        <span key="c">Compiled Apr 26, 2026</span>,
        <span key="src">Sources · 4</span>,
      ]}
    >
      {/* Sources rail */}
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
          ← All NY legislators
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="OpenStates" id={`/${o.id}`} />
          <CqSourceTag compact source="NY State Senate" id={o.district} />
          <CqSourceTag compact source="NY BOE" id={`fin-${o.id}-2024`} />
          <CqSourceTag compact source="Census ACS" id="2024" />
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 220px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <CqPortrait name={o.name} size={120} party={o.party} />
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant={o.party} size="sm">
              {o.partyLong} · {o.district}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {o.role}
            </CqChip>
            {o.position && (
              <CqChip variant="info" filled={false} size="sm">
                {o.position}
              </CqChip>
            )}
            <CqChip variant="ink" filled size="sm">
              STATE
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            {o.name}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            In office since {o.since} · Next election {o.next_election} · {o.session} session
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Compare
          </CqButton>
          <CqButton variant="primary" size="sm">
            Contact senator →
          </CqButton>
          <span
            style={{
              fontSize: 10,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            {o.contact.district.length + 1} offices · {o.contact.web.split('/')[0]}
          </span>
        </div>
      </div>

      {/* HEADLINE STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {[
          {
            label: 'Bills sponsored',
            value: o.bills_sponsored,
            caption: o.cosponsored + ' co-sponsored',
            color: COLORS.fg1,
          },
          {
            label: 'Attendance',
            value: `${o.attendance}%`,
            caption: 'Floor sessions, 2025',
            color: COLORS.fg1,
          },
          {
            label: 'Raised, cycle',
            value: o.raised,
            caption: `Cash on hand · ${o.cash_on_hand}`,
            color: COLORS.blue,
          },
          {
            label: 'Committees',
            value: o.committees.length,
            caption: 'Inc. one chair',
            color: COLORS.fg1,
          },
          {
            label: 'Constituents',
            value: '309K',
            caption: 'ACS 2024 · district pop.',
            color: COLORS.fg1,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...s} size={32} />
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
          { l: 'Votes w/ Senate Majority', v: `${o.party_vote}%`, c: partyClr },
          { l: 'Bipartisan bills sponsored', v: '12 of 47', c: COLORS.fg1 },
          { l: 'Bills passed Senate', v: '9 of 47', c: COLORS.fg1 },
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

      {/* CONTACT STRIP */}
      <div
        style={{
          marginTop: 24,
          marginBottom: 28,
          border: '2px solid #000',
          display: 'grid',
          gridTemplateColumns: '160px 1fr 1fr 1fr 220px',
        }}
      >
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <CqLabel color="#fff" style={{ color: '#fff' }}>
            Contact
          </CqLabel>
          <div
            style={{
              fontSize: 10,
              color: '#9ca3af',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            State office
            <br />
            Constituent inquiry
          </div>
        </div>
        <SLCell
          label="Albany · LOB"
          addr={o.contact.capitol.addr}
          phone={o.contact.capitol.phone}
        />
        {o.contact.district.map(d => (
          <SLCell key={d.name} label={d.name} addr={d.addr} phone={d.phone} />
        ))}
        <div
          style={{
            padding: '14px 16px',
            borderLeft: `1px solid ${COLORS.line}`,
            background: COLORS.bg2,
          }}
        >
          <CqLabel>Online</CqLabel>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <a style={hLinkSL} href="#">
              {o.contact.web} →
            </a>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {o.contact.twitter}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        <div>
          {/* Recent state bills */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 14,
            }}
          >
            <div>
              <CqLabel>
                {o.session} · {o.bills_sponsored} sponsored
              </CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Recently sponsored bills
              </div>
            </div>
            <CqButton variant="secondary" size="sm">
              Download CSV
            </CqButton>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 110px 110px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Bill', 'Title', 'Status', 'Introduced', 'Co-sponsors'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            {
              n: 'S. 4396',
              t: 'Working Families Tax Credit Expansion',
              st: 'Passed Senate',
              d: 'Jan 18, 2025',
              cs: 28,
              variant: 'd',
            },
            {
              n: 'S. 5235',
              t: 'Universal School Meals Act',
              st: 'In Finance',
              d: 'Feb 4, 2025',
              cs: 19,
              variant: 'info',
            },
            {
              n: 'S. 6121',
              t: 'Brooklyn Waterfront Resilience Act',
              st: 'Reported',
              d: 'Feb 22, 2025',
              cs: 12,
              variant: 'info',
            },
            {
              n: 'S. 7042',
              t: 'Public Housing Capital Repair Bond',
              st: 'Hearing',
              d: 'Mar 8, 2025',
              cs: 24,
              variant: 'info',
            },
            {
              n: 'S. 7811',
              t: 'Subway Modernization & Accessibility',
              st: 'Introduced',
              d: 'Mar 19, 2025',
              cs: 9,
              variant: 'info',
            },
            {
              n: 'S. 8403',
              t: 'Tenant Anti-Eviction Notice Act',
              st: 'Stalled',
              d: 'Apr 2, 2025',
              cs: 7,
              variant: 'warn',
            },
          ].map(b => (
            <div
              key={b.n}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 110px 110px 110px',
                gap: 12,
                padding: '14px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.n}</span>
              <span style={{ fontSize: 13 }}>{b.t}</span>
              <CqChip variant={b.variant} filled={b.variant === 'd'} size="sm">
                {b.st}
              </CqChip>
              <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {b.d}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {b.cs}
              </span>
            </div>
          ))}

          {/* Floor votes */}
          <div style={{ marginTop: 32, marginBottom: 14 }}>
            <CqLabel>2025 session · 412 floor votes cast</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Recent floor votes</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 80px 110px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Bill', 'Title', 'Vote', 'Outcome', 'Date'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            {
              bill: 'S. 4396',
              title: 'Working Families Tax Credit Expansion',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Apr 12, 2025',
            },
            {
              bill: 'A. 7129',
              title: 'NY HEAT Act',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Apr 5, 2025',
            },
            {
              bill: 'S. 1175',
              title: 'NY Health Act (Universal Coverage)',
              vote: 'Yes',
              oc: 'Stalled',
              date: 'Mar 27, 2025',
            },
            {
              bill: 'S. 882',
              title: 'MTA Capital Plan Authorization',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Mar 19, 2025',
            },
            {
              bill: 'S. 6589',
              title: 'Casino Siting Reform',
              vote: 'No',
              oc: 'Passed',
              date: 'Mar 11, 2025',
            },
          ].map(v => (
            <div
              key={v.bill}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 80px 110px 110px',
                gap: 12,
                padding: '14px 0',
                borderBottom: `1px solid ${COLORS.line}`,
                alignItems: 'center',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.bill}</span>
              <span style={{ fontSize: 13 }}>{v.title}</span>
              <CqChip variant={v.vote === 'Yes' ? 'd' : 'r'} size="sm" filled={false}>
                {v.vote}
              </CqChip>
              <span style={{ fontSize: 11, color: COLORS.fg2 }}>{v.oc}</span>
              <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {v.date}
              </span>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              {o.short} voted with the Senate Democratic majority on {o.party_vote}% of floor votes
              in the 2025 session. The most frequent dissents were on procedural rules and casino
              siting.
            </CqPlainReading>
          </div>
        </div>

        <aside>
          {/* District demographics */}
          <div style={{ border: '2px solid #000', padding: 18, marginBottom: 14 }}>
            <CqLabel>District · SD-26 · Census ACS 2024</CqLabel>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, marginBottom: 12 }}>
              Brooklyn · waterfront south
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {[
                ['Population', '309,402'],
                ['Median household', '$88,710'],
                ['Renters', '64%'],
                ['Foreign-born', '38%'],
                ["Bachelor's+", '52%'],
                ['Avg age', '38.4'],
              ].map(([k, v], i) => (
                <li
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: COLORS.fg2 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Money — small panel */}
          <div style={{ border: '2px solid #000', padding: 18, marginBottom: 14 }}>
            <CqLabel>NY BOE · 2024 cycle</CqLabel>
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
              {o.raised}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              Cash on hand · {o.cash_on_hand}
            </div>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: 'Individual ≥ $250', p: 38, c: COLORS.blue },
                { l: 'Real estate PACs', p: 22, c: COLORS.vlau },
                { l: 'Labor PACs', p: 14, c: COLORS.green },
                { l: 'Small donors', p: 18, c: COLORS.blueHv },
                { l: 'Other', p: 8, c: COLORS.fg4 },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span>{s.l}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{s.p}%</span>
                  </div>
                  <div style={{ height: 5, background: COLORS.bg3, marginTop: 3 }}>
                    <div style={{ width: `${s.p}%`, height: '100%', background: s.c }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              borderLeft: `6px solid ${COLORS.amber}`,
              background: COLORS.bg2,
              padding: '14px 16px',
            }}
          >
            <CqLabel color={COLORS.amber}>State coverage note</CqLabel>
            <p style={{ fontSize: 12, color: COLORS.fg2, margin: '8px 0 0', lineHeight: 1.5 }}>
              State campaign finance is sourced from the NY Board of Elections; structure differs
              from FEC. Confidence on individual line items is 0.92, vs 0.99 federal.
            </p>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.94}>
          {' '}
          State data via OpenStates and NY State Senate; finance via NY BOE quarterly filings.
          Methodology at civ.iq/methodology.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function SLCell({ label, addr, phone }) {
  return (
    <div style={{ padding: '14px 16px', borderLeft: `1px solid ${COLORS.line}` }}>
      <CqLabel>{label}</CqLabel>
      <div style={{ fontSize: 11, color: COLORS.fg2, marginTop: 6, lineHeight: 1.5 }}>{addr}</div>
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 6 }}>
        {phone}
      </div>
    </div>
  );
}
const hLinkSL = {
  fontSize: 11,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
};

// ════════════════════════════════════════════════════
// STATE LEGISLATURE PAGE — chamber rosters, leadership, session calendar
// ════════════════════════════════════════════════════

function StateLegislaturePage() {
  const senate = { D: 41, R: 22, total: 63, control: 'D' };
  const assembly = { D: 102, R: 48, total: 150, control: 'D' };

  const leadership = [
    {
      name: 'Andrea Stewart-Cousins',
      role: 'Senate Majority Leader',
      party: 'd',
      district: 'SD-35',
      initials: 'AS',
    },
    {
      name: 'Robert Ortt',
      role: 'Senate Minority Leader',
      party: 'r',
      district: 'SD-62',
      initials: 'RO',
    },
    {
      name: 'Carl E. Heastie',
      role: 'Assembly Speaker',
      party: 'd',
      district: 'AD-83',
      initials: 'CH',
    },
    {
      name: 'Will Barclay',
      role: 'Assembly Minority Leader',
      party: 'r',
      district: 'AD-120',
      initials: 'WB',
    },
  ];

  const upcoming = [
    { d: 'Apr 28', t: 'Senate session · Budget conference report' },
    { d: 'Apr 29', t: 'Assembly · Codes Committee · S. 4396 review' },
    { d: 'May 1', t: 'Joint conference · MTA capital plan' },
    { d: 'May 5', t: 'Senate Finance · Hearing on rental assistance' },
    { d: 'May 14', t: 'Session day 47 · Adjournment vote' },
    { d: 'Jun 6', t: 'End of regular session · Sine die' },
  ];

  const recentBills = [
    {
      n: 'S. 4396',
      t: 'Working Families Tax Credit Expansion',
      chamber: 'Senate',
      st: 'Passed Senate',
      d: 'Apr 12',
      sp: 'Gounardes (D-SD-26)',
    },
    {
      n: 'A. 7129',
      t: 'NY HEAT Act',
      chamber: 'Assembly',
      st: 'Passed both',
      d: 'Apr 5',
      sp: 'Solages (D-AD-22)',
    },
    {
      n: 'S. 882',
      t: 'MTA Capital Plan Authorization',
      chamber: 'Senate',
      st: 'Passed Senate',
      d: 'Mar 19',
      sp: 'Comrie (D-SD-14)',
    },
    {
      n: 'A. 9012',
      t: 'Tenant Notice Standardization Act',
      chamber: 'Assembly',
      st: 'In Codes',
      d: 'Mar 14',
      sp: 'Cruz (D-AD-86)',
    },
    {
      n: 'S. 6589',
      t: 'Casino Siting Reform',
      chamber: 'Senate',
      st: 'Passed Senate',
      d: 'Mar 11',
      sp: 'Skoufis (D-SD-42)',
    },
    {
      n: 'A. 4801',
      t: 'Public Records Modernization',
      chamber: 'Assembly',
      st: 'Hearing',
      d: 'Mar 4',
      sp: 'Gallagher (D-AD-50)',
    },
  ];

  return (
    <CqPage
      width={1280}
      currentNav="states"
      crumbs={['States', 'New York', 'Legislature', '2025–26 session']}
      crumbRight={[<span key="f">File · NY-LEG-2526</span>, <span key="c">Apr 26, 2026</span>]}
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
          ← New York overview
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="OpenStates" id="ny-2526" />
          <CqSourceTag compact source="NY State Senate" id="/calendar" />
          <CqSourceTag compact source="NY Assembly" id="/calendar" />
        </div>
      </div>

      {/* HERO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 280px',
          gap: 32,
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
            }}
          >
            NY
          </div>
        </div>
        <div>
          <CqLabel>Bicameral · 2025–26 session · 213 members</CqLabel>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 0.95,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            New York
            <br />
            Legislature
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            Capital · Albany · Convened Jan 8, 2025 · Adjournment scheduled Jun 6, 2026
          </p>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Session at a glance</CqLabel>
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
              ['Bills introduced', '4,128'],
              ['Bills passed', '612'],
              ['Bills signed', '441'],
              ['Vetoed', '12'],
              ['Days in session', '46 / 60'],
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

      {/* CHAMBER COMPOSITION */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          marginTop: 32,
          border: '2px solid #000',
        }}
      >
        {[
          { title: 'Senate', m: senate, n: 63, dRange: [1, 41], lead: 'Stewart-Cousins (D)' },
          { title: 'Assembly', m: assembly, n: 150, dRange: [1, 102], lead: 'Heastie (D)' },
        ].map((ch, i) => (
          <div
            key={ch.title}
            style={{ padding: '24px', borderLeft: i === 0 ? 0 : '2px solid #000' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 12,
              }}
            >
              <div>
                <CqLabel>NY State {ch.title}</CqLabel>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    marginTop: 4,
                    textTransform: 'uppercase',
                  }}
                >
                  {ch.title}
                </div>
              </div>
              <CqChip variant="d" filled size="sm">
                D Majority
              </CqChip>
            </div>
            {/* dot grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${ch.title === 'Senate' ? 21 : 30}, 1fr)`,
                gap: 3,
                padding: 12,
                background: COLORS.bg2,
                border: `1px solid ${COLORS.line}`,
                marginTop: 8,
              }}
            >
              {Array.from({ length: ch.n }, (_, k) => (
                <div
                  key={k}
                  style={{
                    aspectRatio: '1',
                    background: k < ch.m.D ? COLORS.green : COLORS.red,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              <CqStat
                label="Democrat"
                value={ch.m.D}
                caption={`${Math.round((ch.m.D / ch.n) * 100)}% · majority`}
                color={COLORS.green}
                size={24}
              />
              <CqStat
                label="Republican"
                value={ch.m.R}
                caption={`${Math.round((ch.m.R / ch.n) * 100)}% · minority`}
                color={COLORS.red}
                size={24}
              />
              <CqStat label="Total seats" value={ch.n} caption="Term · 2 years" size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* LEADERSHIP + CALENDAR + RECENT BILLS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
        {/* Leadership */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Leadership · 4 of 213</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Chamber leadership</div>
          </div>
          <div style={{ border: '2px solid #000' }}>
            {leadership.map((l, i) => (
              <a
                key={l.name}
                href="#"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 110px',
                  gap: 14,
                  padding: '14px 16px',
                  textDecoration: 'none',
                  color: COLORS.fg1,
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    position: 'relative',
                    border: '2px solid #000',
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
                      background: l.party === 'd' ? COLORS.green : COLORS.red,
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
                      fontSize: 16,
                    }}
                  >
                    {l.initials}
                  </div>
                </div>
                <div>
                  <CqLabel>{l.role}</CqLabel>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 3 }}>{l.name}</div>
                  <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                    {l.district}
                  </div>
                </div>
                <CqChip variant={l.party} size="sm">
                  {l.party === 'd' ? 'Democrat' : 'Republican'}
                </CqChip>
              </a>
            ))}
          </div>
          <a
            href="#"
            style={{
              display: 'inline-block',
              marginTop: 14,
              fontSize: 11,
              color: COLORS.blueHv,
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            View all 213 members →
          </a>
        </div>

        {/* Session calendar */}
        <div>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Session calendar · upcoming</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Next sessions + hearings
            </div>
          </div>
          <div style={{ border: '2px solid #000' }}>
            {upcoming.map((u, i) => (
              <div
                key={u.d + i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 30px',
                  gap: 14,
                  padding: '14px 16px',
                  borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: COLORS.blueHv,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {u.d}
                </span>
                <span style={{ fontSize: 13 }}>{u.t}</span>
                <span style={{ fontSize: 14, color: COLORS.fg3, textAlign: 'right' }}>→</span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 14,
              borderLeft: `6px solid ${COLORS.blue}`,
              background: COLORS.bg2,
              padding: '14px 16px',
            }}
          >
            <CqLabel>Sine die countdown</CqLabel>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 4,
                color: COLORS.blue,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}
            >
              40 days
            </div>
            <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              Until Jun 6, 2026 adjournment
            </div>
          </div>
        </div>
      </div>

      {/* Recent bills (chamber-wide) */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div>
            <CqLabel>Recent activity · both chambers</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Bills moving this week
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
            View all 4,128 bills →
          </a>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 90px 130px 90px 30px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['Bill', 'Title · sponsor', 'Chamber', 'Status', 'Date', ''].map((h, i) => (
            <CqLabel key={i}>{h}</CqLabel>
          ))}
        </div>
        {recentBills.map(b => (
          <a
            key={b.n}
            href="#"
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 90px 130px 90px 30px',
              gap: 12,
              padding: '14px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
              textDecoration: 'none',
              color: COLORS.fg1,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
              {b.n}
            </span>
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
            <CqChip variant="ink" filled={false} size="sm">
              {b.chamber}
            </CqChip>
            <CqChip
              variant={b.st.startsWith('Passed') ? 'd' : 'info'}
              filled={b.st.startsWith('Passed')}
              size="sm"
            >
              {b.st}
            </CqChip>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {b.d}
            </span>
            <span style={{ fontSize: 14, color: COLORS.fg3, textAlign: 'right' }}>→</span>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.93}>
          {' '}
          State legislature data via OpenStates, NY State Senate, and NY Assembly websites. State
          campaign finance via NY BOE.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { StateLegislatorProfile, StateLegislaturePage, STATE_LEGISLATOR_GOUNARDES });
