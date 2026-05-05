// Official detail — deep dive on one representative

function OfficialDetailScreen({ officialId, onBack }) {
  const o = OFFICIALS.find(x => x.id === officialId) || OFFICIALS[0];
  const [tab, setTab] = React.useState('record');

  return (
    <main style={{ padding: '32px 32px 80px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            padding: 0,
            marginBottom: 20,
          }}
        >
          ← All officials
        </button>

        {/* HERO */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 280px',
            gap: 48,
            marginBottom: 48,
            alignItems: 'end',
          }}
        >
          <div>
            <Chip variant={o.party}>
              {o.party === 'd' ? 'Democrat' : 'Republican'} · {o.district}
            </Chip>
            <h1
              style={{
                fontSize: 80,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 0.95,
                margin: '16px 0 8px',
                textTransform: 'uppercase',
              }}
            >
              {o.name}
            </h1>
            <p style={{ fontSize: 18, color: '#4b5563', margin: 0 }}>
              {o.role} · In office since {o.since}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SourceTag source="Congress.gov" id="/member/J000294" time="Updated 2 days ago" />
            <SourceTag source="FEC.gov" id="C00399001 · 2024" time="Updated yesterday" />
          </div>
        </div>

        {/* STATS ROW */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '2px solid #000',
            borderBottom: '2px solid #000',
            marginBottom: 32,
          }}
        >
          <StatCell label="Party vote" value={`${o.party_vote}%`} color="#0a9338" />
          <StatCell label="Raised 2024" value={o.funding} color="#3ea2d4" divider />
          <StatCell label="Bills sponsored" value="24" color="#111827" divider />
          <StatCell label="Committees" value="3" color="#111827" divider />
        </div>

        {/* TAB BAR */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #000', marginBottom: 32 }}>
          {[
            ['record', 'Voting record'],
            ['money', 'Where the money came from'],
            ['bills', 'Bills sponsored'],
            ['meet', 'Lobbyist meetings'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: tab === k ? '#000' : 'transparent',
                color: tab === k ? '#fff' : '#111827',
                border: 0,
                padding: '14px 20px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'record' && <VotingRecordPanel />}
        {tab === 'money' && <MoneyPanel />}
        {tab === 'bills' && <BillsPanel />}
        {tab === 'meet' && <PlaceholderPanel title="Lobbyist meetings" />}
      </div>
    </main>
  );
}

function StatCell({ label, value, color, divider }) {
  return (
    <div
      style={{
        padding: '20px 24px',
        borderLeft: divider ? '1px solid #e5e7eb' : 0,
      }}
    >
      <Eyebrow>{label}</Eyebrow>
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          color,
          lineHeight: 1.1,
          marginTop: 6,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

const VOTES = [
  {
    bill: 'H.R. 8404',
    title: 'Respect for Marriage Act',
    vote: 'Yes',
    outcome: 'Passed',
    date: 'Dec 8, 2022',
    pl: true,
  },
  {
    bill: 'H.R. 3684',
    title: 'Infrastructure Investment and Jobs Act',
    vote: 'Yes',
    outcome: 'Passed',
    date: 'Nov 5, 2021',
    pl: true,
  },
  {
    bill: 'H.R. 5376',
    title: 'Inflation Reduction Act of 2022',
    vote: 'Yes',
    outcome: 'Passed',
    date: 'Aug 12, 2022',
    pl: true,
  },
  {
    bill: 'H.R. 7024',
    title: 'Tax Relief for American Families',
    vote: 'No',
    outcome: 'Stalled',
    date: 'Jan 31, 2024',
    pl: false,
  },
  {
    bill: 'S. 2226',
    title: 'National Defense Authorization Act',
    vote: 'Yes',
    outcome: 'Passed',
    date: 'Dec 14, 2023',
    pl: false,
  },
];

function VotingRecordPanel() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <Eyebrow>118th Congress · 1,248 votes cast</Eyebrow>
          <h3 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 0' }}>Recent floor votes</h3>
        </div>
        <Button variant="secondary" size="sm">
          Download CSV
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 90px 120px 140px',
          gap: 16,
          padding: '10px 0',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        {['Bill', 'Title', 'Vote', 'Outcome', 'Date'].map(h => (
          <Eyebrow key={h}>{h}</Eyebrow>
        ))}
      </div>
      {VOTES.map(v => (
        <div
          key={v.bill}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 90px 120px 140px',
            gap: 16,
            padding: '16px 0',
            borderBottom: '1px solid #e5e7eb',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#111827' }}>
            {v.bill}
          </span>
          <span style={{ fontSize: 14 }}>{v.title}</span>
          <Chip variant={v.vote === 'Yes' ? 'd' : 'r'} outlined size="sm">
            {v.vote}
          </Chip>
          <span style={{ fontSize: 12, color: '#4b5563' }}>{v.outcome}</span>
          <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
            {v.date}
          </span>
        </div>
      ))}
    </div>
  );
}

function MoneyPanel() {
  const donors = [
    { name: 'Individual contributions', pct: 68, amount: '$1.63M', color: '#3ea2d4' },
    { name: 'Party committees', pct: 18, amount: '$430K', color: '#0a9338' },
    { name: 'PACs', pct: 12, amount: '$290K', color: '#6b6b83' },
    { name: 'Other', pct: 2, amount: '$48K', color: '#b8b5a9' },
  ];
  return (
    <div>
      <Eyebrow>2024 cycle · FEC filings · $2.4M raised</Eyebrow>
      <h3 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 24px' }}>
        Where the money came from
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {donors.map(d => (
          <div
            key={d.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 80px 80px',
              gap: 14,
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</span>
            <div style={{ height: 20, background: '#f3f4f6' }}>
              <div style={{ height: '100%', background: d.color, width: `${d.pct}%` }} />
            </div>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: '#6b7280',
                textAlign: 'right',
              }}
            >
              {d.pct}%
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                textAlign: 'right',
              }}
            >
              {d.amount}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: '16px 20px',
          background: '#f9fafb',
          borderLeft: '3px solid #3ea2d4',
          fontSize: 13,
          color: '#4b5563',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: '#111827' }}>Plain reading:</strong> Most of Jeffries' 2024 money
        came from individual donors giving $200 or more, not corporate PACs. The biggest industry
        sector was securities & investment.
      </div>
    </div>
  );
}

function BillsPanel() {
  const bills = [
    {
      n: 'H.R. 1491',
      t: 'Stop Institutional Investors from Acquiring Single-Family Homes',
      st: 'Introduced',
    },
    { n: 'H.R. 2620', t: 'Community Land Trust Support Act', st: 'Committee' },
    { n: 'H.R. 3911', t: 'Voting Rights Restoration Act of 2023', st: 'Referred' },
  ];
  return (
    <div>
      <Eyebrow>24 bills sponsored · 118th Congress</Eyebrow>
      <h3 style={{ fontSize: 24, fontWeight: 700, margin: '6px 0 24px' }}>Recently sponsored</h3>
      {bills.map(b => (
        <div
          key={b.n}
          style={{
            padding: '18px 0',
            borderBottom: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: '120px 1fr 140px',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{b.n}</span>
          <span style={{ fontSize: 14 }}>{b.t}</span>
          <Chip variant="info" outlined size="sm">
            {b.st}
          </Chip>
        </div>
      ))}
    </div>
  );
}

function PlaceholderPanel({ title }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', border: '1px dashed #d4d2c9' }}>
      <Eyebrow>Coming soon</Eyebrow>
      <h3 style={{ margin: '8px 0 0', fontSize: 22 }}>{title}</h3>
    </div>
  );
}

Object.assign(window, { OfficialDetailScreen });
