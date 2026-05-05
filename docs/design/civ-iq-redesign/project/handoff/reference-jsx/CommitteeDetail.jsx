// COMMITTEE DETAIL — natural next click from the profile (Jeffries → Budget Committee).
// Same chassis: black masthead crumb → hero → 5-col stat strip → secondary bipartisan row → tab bar → panels.

function CommitteeDetail({ c }) {
  const [tab, setTab] = React.useState('members');
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Federal', c.chamber, 'Committees', c.name]}
      crumbRight={[
        <span key="f">
          File · {c.id.toUpperCase()}-{c.congress}
        </span>,
        <span key="c">Compiled Apr 26, 2026</span>,
        <span key="s">Sources · 3</span>,
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
          ← {c.chamber} · Committees
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="Congress.gov" id={`/committee/${c.id}`} />
          <CqSourceTag compact source="House Clerk" id="committee-rolls" />
          <CqSourceTag compact source="GovInfo" id="cmte-reports" />
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
        <div
          style={{
            width: 120,
            height: 120,
            position: 'relative',
            border: '2px solid #000',
            background: '#fff',
            backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: COLORS.fg1,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <div style={{ fontSize: 10, color: COLORS.fg3, letterSpacing: '0.08em' }}>CMTE</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}>{c.abbr}</div>
            <div style={{ fontSize: 10, color: COLORS.fg3, marginTop: 6 }}>{c.congress}</div>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              {c.chamber} · Standing
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {c.subs} subcommittees
            </CqChip>
            <CqChip variant="d" filled={false} size="sm">
              Majority: {c.majority}
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.05,
              margin: '0 0 10px',
              textTransform: 'uppercase',
            }}
          >
            {c.name}
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            Established {c.established} · Jurisdiction: {c.jurisdiction}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Full hearing schedule
          </CqButton>
          <CqButton variant="primary" size="sm">
            Reports →
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
            label: 'Members',
            value: c.members,
            caption: `${c.maj}D · ${c.min}R · ${c.ind}I`,
            color: COLORS.fg1,
          },
          {
            label: 'Bills referred',
            value: c.referred,
            caption: `${c.reported} reported out`,
            color: COLORS.fg1,
          },
          {
            label: 'Hearings (2024)',
            value: c.hearings,
            caption: `${c.markups} markups`,
            color: COLORS.fg1,
          },
          {
            label: 'Reports filed',
            value: c.reports,
            caption: 'Committee + sub',
            color: COLORS.fg1,
          },
          {
            label: 'Avg attendance',
            value: `${c.attendance}%`,
            caption: 'Across members',
            color: COLORS.blue,
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
          { l: 'Bipartisan reports', v: `${c.bipartisanReports} of ${c.reports}`, c: COLORS.fg1 },
          { l: 'Party-line markups', v: `${c.partyLineMarkups}%`, c: COLORS.fg1 },
          { l: 'Bills enacted', v: `${c.enacted}`, c: COLORS.green },
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

      {/* TAB BAR */}
      <div style={{ display: 'flex', borderBottom: '2px solid #000', marginTop: 0 }}>
        {[
          ['members', 'Members'],
          ['bills', 'Bills referred'],
          ['hearings', 'Hearings'],
          ['subs', 'Subcommittees'],
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

      <div style={{ paddingTop: 24 }}>
        {tab === 'members' && <MembersPanel c={c} />}
        {tab === 'bills' && <CmteBillsPanel />}
        {tab === 'hearings' && <HearingsPanel />}
        {tab === 'subs' && <SubsPanel c={c} />}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.95}>
          {' '}
          Source: Congress.gov committee API + House/Senate clerks. Methodology at
          civ.iq/methodology.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function MembersPanel({ c }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div>
            <CqLabel>{c.members} members · seniority order</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Roster</div>
          </div>
          <CqButton variant="secondary" size="sm">
            Download CSV
          </CqButton>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 110px 90px 90px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['#', 'Member', 'Role', 'Since', 'Attend.'].map(h => (
            <CqLabel key={h}>{h}</CqLabel>
          ))}
        </div>
        {c.roster.map((m, i) => (
          <div
            key={m.name}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr 110px 90px 90px',
              gap: 12,
              padding: '12px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
              <div style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                {m.party === 'd' ? 'D' : 'R'} · {m.district}
              </div>
            </div>
            <CqChip
              variant={m.role === 'Chair' || m.role === 'Ranking' ? 'd' : 'ink'}
              filled={m.role !== 'Member'}
              size="sm"
            >
              {m.role}
            </CqChip>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg2 }}>
              {m.since}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {m.attend}%
            </span>
          </div>
        ))}
      </div>
      <aside>
        <div style={{ border: '2px solid #000', padding: '18px' }}>
          <CqLabel>Composition</CqLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                l: 'Democrats',
                n: c.maj,
                pct: Math.round((c.maj / c.members) * 100),
                color: COLORS.green,
              },
              {
                l: 'Republicans',
                n: c.min,
                pct: Math.round((c.min / c.members) * 100),
                color: COLORS.red,
              },
              {
                l: 'Independent',
                n: c.ind,
                pct: Math.round((c.ind / c.members) * 100),
                color: COLORS.fg2,
              },
            ].map(r => (
              <div key={r.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ fontWeight: 600 }}>{r.l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {r.n} · {r.pct}%
                  </span>
                </div>
                <div style={{ height: 6, background: COLORS.bg3, marginTop: 4 }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', background: r.color }} />
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
          <CqLabel>Next hearing</CqLabel>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
            FY2026 Budget — Treasury
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            May 6, 2026 · 10:00 AM · 2128 Rayburn
          </div>
        </div>
      </aside>
    </div>
  );
}

function CmteBillsPanel() {
  const bills = [
    { n: 'H.R. 8120', t: 'FY2026 Continuing Appropriations', st: 'Reported', d: 'Apr 18, 2026' },
    { n: 'H.R. 7044', t: 'Fiscal Responsibility Act amendments', st: 'Markup', d: 'Apr 11, 2026' },
    { n: 'H.R. 6612', t: 'CBO Modernization Act', st: 'Reported', d: 'Mar 14, 2026' },
    { n: 'H.R. 5944', t: 'Budget Process Reform of 2025', st: 'Hearing', d: 'Feb 28, 2026' },
  ];
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div>
          <CqLabel>119th Congress · 312 bills referred</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Recently referred</div>
        </div>
        <CqButton variant="secondary" size="sm">
          Download CSV
        </CqButton>
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
        {['Bill', 'Title', 'Status', 'Date'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {bills.map(b => (
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
          <span style={{ fontSize: 13 }}>{b.t}</span>
          <CqChip variant="info" filled={false} size="sm">
            {b.st}
          </CqChip>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
            {b.d}
          </span>
        </div>
      ))}
    </div>
  );
}

function HearingsPanel() {
  const hearings = [
    {
      date: 'May 6, 2026',
      title: 'FY2026 Budget — Treasury',
      room: '2128 Rayburn',
      witnesses: 4,
      status: 'Scheduled',
    },
    {
      date: 'Apr 18, 2026',
      title: 'Markup: H.R. 8120',
      room: '210 Cannon',
      witnesses: 0,
      status: 'Held',
    },
    {
      date: 'Apr 11, 2026',
      title: 'CBO outlook for FY26',
      room: '2128 Rayburn',
      witnesses: 3,
      status: 'Held',
    },
    {
      date: 'Mar 28, 2026',
      title: 'Defense supplemental',
      room: '2128 Rayburn',
      witnesses: 6,
      status: 'Held',
    },
  ];
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <CqLabel>Hearings & markups · 2024–26</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Recent hearings</div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 140px 90px 110px',
          gap: 12,
          padding: '10px 0',
          borderTop: '2px solid #000',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {['Date', 'Title', 'Room', 'Witnesses', 'Status'].map(h => (
          <CqLabel key={h}>{h}</CqLabel>
        ))}
      </div>
      {hearings.map(h => (
        <div
          key={h.title}
          style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 140px 90px 110px',
            gap: 12,
            padding: '14px 0',
            borderBottom: `1px solid ${COLORS.line}`,
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
            {h.date}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{h.title}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg2 }}>
            {h.room}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
            {h.witnesses}
          </span>
          <CqChip
            variant={h.status === 'Scheduled' ? 'info' : 'd'}
            filled={h.status === 'Held'}
            size="sm"
          >
            {h.status}
          </CqChip>
        </div>
      ))}
    </div>
  );
}

function SubsPanel({ c }) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <CqLabel>{c.subs} subcommittees</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Subcommittees</div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 0,
          border: '2px solid #000',
        }}
      >
        {c.subList.map((s, i) => (
          <div
            key={s.name}
            style={{
              padding: '18px 20px',
              borderRight: i % 2 === 0 ? `1px solid ${COLORS.line}` : 0,
              borderBottom: i < c.subList.length - 2 ? `1px solid ${COLORS.line}` : 0,
            }}
          >
            <CqLabel>Sub · {String(i + 1).padStart(2, '0')}</CqLabel>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: COLORS.fg2, marginTop: 4 }}>
              Chair: {s.chair} · Ranking: {s.ranking}
            </div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 6,
              }}
            >
              {s.members} members · {s.bills} bills referred
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CMTE_BUDGET = {
  id: 'hsbu',
  abbr: 'BUD',
  chamber: 'House',
  congress: '119th',
  established: 1974,
  name: 'Committee on the Budget',
  jurisdiction: 'Concurrent budget resolution, federal fiscal policy, CBO oversight',
  majority: 'Republican',
  members: 38,
  maj: 17,
  min: 21,
  ind: 0,
  subs: 2,
  referred: 312,
  reported: 47,
  hearings: 64,
  markups: 19,
  reports: 23,
  attendance: 91,
  bipartisanReports: 6,
  partyLineMarkups: 78,
  enacted: 4,
  roster: [
    {
      name: 'Jodey C. Arrington',
      party: 'r',
      district: 'TX-19',
      role: 'Chair',
      since: 2023,
      attend: 96,
    },
    {
      name: 'Brendan F. Boyle',
      party: 'd',
      district: 'PA-02',
      role: 'Ranking',
      since: 2023,
      attend: 94,
    },
    {
      name: 'Hakeem S. Jeffries',
      party: 'd',
      district: 'NY-08',
      role: 'Member',
      since: 2013,
      attend: 98,
    },
    {
      name: 'Glenn Grothman',
      party: 'r',
      district: 'WI-06',
      role: 'Member',
      since: 2017,
      attend: 89,
    },
    {
      name: 'Lloyd Smucker',
      party: 'r',
      district: 'PA-11',
      role: 'Member',
      since: 2019,
      attend: 92,
    },
    {
      name: 'Scott Peters',
      party: 'd',
      district: 'CA-50',
      role: 'Member',
      since: 2017,
      attend: 95,
    },
    {
      name: 'Ralph Norman',
      party: 'r',
      district: 'SC-05',
      role: 'Member',
      since: 2021,
      attend: 88,
    },
    {
      name: 'Jennifer Wexton',
      party: 'd',
      district: 'VA-10',
      role: 'Member',
      since: 2021,
      attend: 90,
    },
  ],
  subList: [
    {
      name: 'Health Care, Pensions and Disability',
      chair: 'Lloyd Smucker',
      ranking: 'Brendan Boyle',
      members: 12,
      bills: 84,
    },
    {
      name: 'Tax, Trade and Economic Growth',
      chair: 'Glenn Grothman',
      ranking: 'Scott Peters',
      members: 13,
      bills: 73,
    },
  ],
};

Object.assign(window, { CommitteeDetail, CMTE_BUDGET });
