// VARIATION 4 — HYBRID
// Refined Classic chassis (tabs at top) + Dossier-level density inside each tab.
// Sticky tab bar with quick-jump anchors inside the active panel.
// All facts attributed inline; sources rail kept; contact strip remains under the hero.

function ProfileHybrid({ official: o }) {
  const partyClr = partyColor(o.party);
  const [tab, setTab] = React.useState('record');

  return (
    <div
      style={{
        width: 1080,
        padding: '0 0 56px',
        background: '#fff',
        color: COLORS.fg1,
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* Black masthead — dossier marker */}
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '10px 36px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span>
          CIV.IQ · Public Record · {o.chamber} · {o.state}
        </span>
        <span style={{ display: 'flex', gap: 18 }}>
          <span>
            File · {o.id.toUpperCase()}-{o.congress}
          </span>
          <span>Compiled Apr 26, 2026</span>
          <span>Sources · {o.sources.length}</span>
        </span>
      </div>

      <div style={{ padding: '32px 36px 0' }}>
        {/* Crumb + sources rail */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <CqLabel color={COLORS.fg3}>
            ← Federal · {o.chamber} · {o.state}
          </CqLabel>
          <div style={{ display: 'flex', gap: 14 }}>
            {o.sources.slice(0, 3).map(s => (
              <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
            ))}
            <CqLabel color={COLORS.fg3}>+{o.sources.length - 3} more</CqLabel>
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
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
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
            <p
              style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}
            >
              In office since {o.since} · Next election {o.next_election} · {o.congress} Congress
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <CqButton variant="secondary" size="sm">
              Compare
            </CqButton>
            <CqButton variant="primary" size="sm">
              Contact rep →
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
              {o.contact.district.length + 1} offices · {o.contact.web}
            </span>
          </div>
        </div>

        {/* HEADLINE STATS — what the rep DID, then what funds them. Party-vote demoted to a thin secondary row. */}
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
              caption: o.cosponsored + ' co-sponsored [1]',
              color: COLORS.fg1,
            },
            {
              label: 'Attendance',
              value: `${o.attendance}%`,
              caption: 'Roll-call votes cast [1]',
              color: COLORS.fg1,
            },
            {
              label: 'Raised, cycle',
              value: o.raised,
              caption: `Cash on hand · ${o.cash_on_hand} [2]`,
              color: COLORS.blue,
            },
            {
              label: 'Committees',
              value: o.committees.length,
              caption: o.committees.slice(0, 2).join(', '),
              color: COLORS.fg1,
            },
            {
              label: 'Caucuses',
              value: o.caucus_count,
              caption: 'Cross-party + ideological',
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
        {/* Secondary alignment row — small, contextual, not headline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '2px solid #000',
            background: COLORS.bg2,
          }}
        >
          {[
            { l: `Votes w/ ${o.partyLong} caucus`, v: `${o.party_vote}%`, c: partyClr },
            { l: 'Votes w/ chamber majority', v: '78%', c: COLORS.fg1 },
            { l: 'Bipartisan bills co-sponsored', v: '94 of 312', c: COLORS.fg1 },
          ].map((r, i) => (
            <div
              key={r.l}
              style={{
                padding: '10px 18px',
                borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <CqLabel>{r.l}</CqLabel>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: r.c,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.01em',
                }}
              >
                {r.v}
              </span>
            </div>
          ))}
        </div>

        {/* CONTACT STRIP — Refined-style, all 4 cells */}
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
              Public office
              <br />
              Constituent inquiry
            </div>
          </div>
          <HCell label="Washington, DC" addr={o.contact.dc.addr} phone={o.contact.dc.phone} />
          <HCell
            label={o.contact.district[0].name}
            addr={o.contact.district[0].addr}
            phone={o.contact.district[0].phone}
          />
          <HCell
            label={o.contact.district[1].name}
            addr={o.contact.district[1].addr}
            phone={o.contact.district[1].phone}
          />
          <div
            style={{
              padding: '14px 16px',
              borderLeft: `1px solid ${COLORS.line}`,
              background: COLORS.bg2,
            }}
          >
            <CqLabel>Online</CqLabel>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <a style={hLink} href="#">
                {o.contact.web} →
              </a>
              <a style={hLink} href="#">
                {o.contact.contact_form} →
              </a>
              <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {o.contact.twitter}
              </span>
            </div>
          </div>
        </div>

        {/* TAB BAR */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: '#fff',
            display: 'flex',
            borderTop: '2px solid #000',
            borderBottom: '2px solid #000',
          }}
        >
          {[
            ['record', 'Voting record'],
            ['money', 'Money'],
            ['bills', 'Bills sponsored'],
            ['committees', 'Committees'],
            ['meetings', 'Lobbyist meetings'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: tab === k ? '#000' : 'transparent',
                color: tab === k ? '#fff' : COLORS.fg1,
                border: 0,
                padding: '14px 18px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* PANEL */}
        <div style={{ paddingTop: 24 }}>
          {tab === 'record' && <RecordPanel o={o} />}
          {tab === 'money' && <MoneyPanel o={o} />}
          {tab === 'bills' && <BillsPanel o={o} />}
          {tab === 'committees' && <CommitteesPanel o={o} />}
          {tab === 'meetings' && <MeetingsPanel o={o} />}
        </div>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
          <CqDisclaimer confidence={0.96}>
            {' '}
            [1] Congress.gov · roll-call. [2] FEC.gov · cycle filings. Methodology at
            civ.iq/methodology.
          </CqDisclaimer>
        </div>
      </div>
    </div>
  );
}

// ── PANELS ─────────────────────────────────────────────────────

function RecordPanel({ o }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <PanelHeader
          eyebrow={`${o.congress} Congress · 1,248 floor votes cast`}
          title="Recent floor votes"
          right={
            <CqButton variant="secondary" size="sm">
              Download CSV
            </CqButton>
          }
        />

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
            bill: 'H.R. 8404',
            title: 'Respect for Marriage Act',
            vote: 'Yes',
            oc: 'Passed',
            date: 'Dec 8, 2022',
            pl: true,
          },
          {
            bill: 'H.R. 3684',
            title: 'Infrastructure Investment and Jobs Act',
            vote: 'Yes',
            oc: 'Passed',
            date: 'Nov 5, 2021',
            pl: true,
          },
          {
            bill: 'H.R. 5376',
            title: 'Inflation Reduction Act of 2022',
            vote: 'Yes',
            oc: 'Passed',
            date: 'Aug 12, 2022',
            pl: true,
          },
          {
            bill: 'H.R. 7024',
            title: 'Tax Relief for American Families Act',
            vote: 'No',
            oc: 'Stalled',
            date: 'Jan 31, 2024',
          },
          {
            bill: 'S. 2226',
            title: 'National Defense Authorization Act',
            vote: 'Yes',
            oc: 'Passed',
            date: 'Dec 14, 2023',
            pl: true,
          },
          {
            bill: 'H.R. 2',
            title: 'Secure the Border Act of 2023',
            vote: 'No',
            oc: 'Passed H',
            date: 'May 11, 2023',
          },
          {
            bill: 'H.R. 815',
            title: 'Israel Security Supplemental',
            vote: 'Yes',
            oc: 'Passed',
            date: 'Apr 20, 2024',
            pl: true,
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
            <span style={{ fontSize: 13 }}>
              {v.title}
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
            {o.short} voted with the {o.partyLong} caucus on {o.party_vote}% of floor votes this
            Congress; the most frequent dissents were on procedural rule votes.
          </CqPlainReading>
        </div>
      </div>

      <aside>
        <div style={{ border: '2px solid #000', padding: '18px', marginBottom: 16 }}>
          <CqLabel>Vote alignment</CqLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { l: `with ${o.partyLong}`, p: o.party_vote, c: partyColor(o.party) },
              { l: 'with majority', p: 78, c: COLORS.fg1 },
              { l: 'with Speaker', p: 64, c: COLORS.vlau },
              { l: 'attendance', p: o.attendance, c: COLORS.blue },
            ].map(r => (
              <div key={r.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ fontWeight: 600 }}>{r.l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{r.p}%</span>
                </div>
                <div style={{ height: 6, background: COLORS.bg3, marginTop: 4 }}>
                  <div style={{ width: `${r.p}%`, height: '100%', background: r.c }} />
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
          }}
        >
          <CqLabel>Most-recent vote</CqLabel>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
            H.R. 815 · Israel Security Supplemental
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            Apr 20, 2024 · Yes · Passed 311–112
          </div>
        </div>
      </aside>
    </div>
  );
}

function MoneyPanel({ o }) {
  const sources = [
    {
      label: 'Individual ≥ $200',
      pct: 41,
      amount: '$1.40M',
      color: COLORS.blue,
      sub: '5,108 unique donors',
    },
    {
      label: 'Industry PACs',
      pct: 27,
      amount: '$0.92M',
      color: COLORS.vlau,
      sub: 'Top sector: Securities & Investment',
    },
    {
      label: 'Leadership PACs',
      pct: 14,
      amount: '$0.48M',
      color: COLORS.fg2,
      sub: 'Cross-member transfers',
    },
    {
      label: 'Party committees',
      pct: 11,
      amount: '$0.38M',
      color: COLORS.greige,
      sub: 'DCCC transfers',
    },
    {
      label: 'Individual < $200',
      pct: 5,
      amount: '$0.17M',
      color: COLORS.blueHv,
      sub: 'Small-dollar',
    },
    { label: 'Self / loans', pct: 2, amount: '$0.07M', color: COLORS.fg4, sub: 'Candidate funds' },
  ];
  const industries = [
    { name: 'Securities & Investment', pct: 18, amount: '$0.61M' },
    { name: 'Lawyers & Lobbyists', pct: 14, amount: '$0.48M' },
    { name: 'Real Estate', pct: 11, amount: '$0.38M' },
    { name: 'Business Services', pct: 9, amount: '$0.31M' },
    { name: 'Health Professionals', pct: 7, amount: '$0.24M' },
  ];

  return (
    <div>
      <PanelHeader
        eyebrow="2024 cycle · FEC filings · $3.42M raised"
        title="Where the money came from"
        right={
          <CqButton variant="secondary" size="sm">
            Download CSV
          </CqButton>
        }
      />

      <div style={{ display: 'flex', height: 48, border: '2px solid #000', marginBottom: 12 }}>
        {sources.map(s => (
          <div
            key={s.label}
            style={{
              width: `${s.pct}%`,
              background: s.color,
              borderRight: '2px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {s.pct >= 7 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {s.pct}%
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginTop: 20 }}>
        <div>
          {sources.map(s => (
            <CqBar
              key={s.label}
              label={s.label}
              pct={s.pct}
              amount={s.amount}
              color={s.color}
              sub={s.sub}
            />
          ))}
          <div style={{ marginTop: 16 }}>
            <CqPlainReading>
              {o.small_donor_pct}% of {o.short}'s {o.raised} came from donors giving more than $200.
              PACs supplied {o.pac_pct}%; the top sector was <strong>{o.industry_top}</strong>.
            </CqPlainReading>
          </div>
        </div>
        <div>
          <CqLabel>OpenSecrets · industry codes</CqLabel>
          <h4 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 12px' }}>Top industries</h4>
          {industries.map((ind, i) => (
            <div
              key={ind.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr 80px',
                gap: 10,
                alignItems: 'center',
                padding: '10px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{ind.name}</div>
                <div style={{ height: 6, background: COLORS.bg3, marginTop: 4 }}>
                  <div
                    style={{ width: `${ind.pct * 4}%`, height: '100%', background: COLORS.vlau }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                }}
              >
                {ind.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillsPanel({ o }) {
  const bills = [
    {
      n: 'H.R. 1491',
      t: 'Stop Institutional Investors from Acquiring Single-Family Homes',
      st: 'Introduced',
      d: 'Mar 8, 2023',
      cs: 47,
    },
    {
      n: 'H.R. 2620',
      t: 'Community Land Trust Support Act',
      st: 'Committee',
      d: 'Apr 16, 2023',
      cs: 22,
    },
    {
      n: 'H.R. 3911',
      t: 'Voting Rights Restoration Act of 2023',
      st: 'Referred',
      d: 'Jun 1, 2023',
      cs: 198,
    },
    {
      n: 'H.R. 4422',
      t: 'Federal Workforce Modernization Act',
      st: 'Reported',
      d: 'Jul 12, 2023',
      cs: 14,
    },
    {
      n: 'H.R. 5103',
      t: 'Brooklyn Waterfront Resilience Act',
      st: 'Introduced',
      d: 'Aug 2, 2023',
      cs: 7,
    },
  ];
  return (
    <div>
      <PanelHeader
        eyebrow={`${o.bills_sponsored} bills sponsored · ${o.cosponsored} co-sponsored · ${o.congress} Congress`}
        title="Recently sponsored"
      />
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
      {bills.map(b => (
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
          <CqChip variant="info" filled={false} size="sm">
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
    </div>
  );
}

function CommitteesPanel({ o }) {
  const committees = [
    { name: 'Budget', role: 'Ranking member', since: 2023, members: 38, sub: ['Health', 'Tax'] },
    {
      name: 'Judiciary',
      role: 'Member',
      since: 2013,
      members: 41,
      sub: ['Constitution', 'Antitrust'],
    },
  ];
  const caucuses = [
    'Congressional Black Caucus',
    'New Democrat Coalition',
    'Problem Solvers Caucus',
    'Equality Caucus',
    'Pro-Choice Caucus',
    'Smart Cities Caucus',
    'Voting Rights Caucus',
    'Israel Allies Caucus',
    'Brooklyn Caucus',
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <PanelHeader
          eyebrow={`${o.committees.length} committee assignments`}
          title="Committee service"
        />
        {committees.map((c, i) => (
          <div
            key={c.name}
            style={{
              borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              padding: '16px 0',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
            >
              <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{c.name}</h4>
              <CqChip variant={i === 0 ? 'd' : 'ink'} filled={i === 0} size="sm">
                {c.role}
              </CqChip>
            </div>
            <div
              style={{
                fontSize: 12,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 6,
              }}
            >
              Serving since {c.since} · {c.members} members
            </div>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.sub.map(s => (
                <CqChip key={s} variant="ink" filled={false} size="sm">
                  Sub · {s}
                </CqChip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <aside>
        <div style={{ border: '2px solid #000', padding: '18px' }}>
          <CqLabel>Caucuses · {caucuses.length}</CqLabel>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {caucuses.map((c, i) => (
              <div
                key={c}
                style={{
                  display: 'flex',
                  gap: 8,
                  paddingBottom: 6,
                  borderBottom: i === caucuses.length - 1 ? 0 : `1px solid ${COLORS.line}`,
                  fontSize: 12,
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function MeetingsPanel({ o }) {
  const meetings = [
    {
      date: 'Mar 12, 2024',
      org: 'BlackRock, Inc.',
      topic: 'Housing finance reform',
      filer: 'Akin Gump Strauss Hauer & Feld',
    },
    { date: 'Feb 28, 2024', org: 'AIPAC', topic: 'Israel security aid', filer: 'Direct lobbying' },
    {
      date: 'Feb 14, 2024',
      org: 'National Association of REALTORS',
      topic: 'Single-family rental policy',
      filer: 'NAR Govt Affairs',
    },
    {
      date: 'Jan 22, 2024',
      org: 'Sierra Club',
      topic: 'IRA implementation',
      filer: 'Direct lobbying',
    },
  ];
  return (
    <div>
      <PanelHeader eyebrow="Senate LDA · Q1 2024 · 4 disclosures" title="Lobbyist meetings" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr 1fr 1fr',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid #000',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {['Date', 'Organization', 'Topic', 'Filing'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {meetings.map(m => (
        <div
          key={m.date}
          style={{
            display: 'grid',
            gridTemplateColumns: '110px 1fr 1fr 1fr',
            gap: 12,
            padding: '14px 0',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
            {m.date}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{m.org}</span>
          <span style={{ fontSize: 13 }}>{m.topic}</span>
          <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
            {m.filer}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 16 }}>
        <CqPlainReading>
          Disclosures only show that a meeting occurred and the topic — not what was said.
        </CqPlainReading>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function PanelHeader({ eyebrow, title, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 14,
      }}
    >
      <div>
        <CqLabel>{eyebrow}</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function HCell({ label, addr, phone }) {
  return (
    <div style={{ padding: '14px 16px', borderLeft: `1px solid ${COLORS.line}` }}>
      <CqLabel>{label}</CqLabel>
      <div style={{ fontSize: 11, color: COLORS.fg2, marginTop: 6, lineHeight: 1.5 }}>{addr}</div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
          color: COLORS.fg1,
        }}
      >
        {phone}
      </div>
    </div>
  );
}

const hLink = {
  fontSize: 11,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

Object.assign(window, { ProfileHybrid });
