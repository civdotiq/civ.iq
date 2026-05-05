// ROLL CALL DETAIL — single floor vote, every member's position.
// Currently a tab inside Bill, broken out as its own URL.

function RollCallDetail() {
  const yeas = 228,
    nays = 206,
    present = 1,
    notVoting = 0;
  const total = yeas + nays + present + notVoting;
  const reps = [
    { name: 'Hakeem S. Jeffries', party: 'd', district: 'NY-08', vote: 'Yea', initials: 'HJ' },
    { name: 'Mike Johnson', party: 'r', district: 'LA-04', vote: 'Nay', initials: 'MJ' },
    {
      name: 'Alexandria Ocasio-Cortez',
      party: 'd',
      district: 'NY-14',
      vote: 'Yea',
      initials: 'AO',
    },
    { name: 'Marjorie Taylor Greene', party: 'r', district: 'GA-14', vote: 'Nay', initials: 'MG' },
    { name: 'Pramila Jayapal', party: 'd', district: 'WA-07', vote: 'Yea', initials: 'PJ' },
    { name: 'Liz Cheney', party: 'r', district: 'WY-AL', vote: 'Yea', initials: 'LC' },
    { name: 'Kevin McCarthy', party: 'r', district: 'CA-20', vote: 'Yea', initials: 'KM' },
    { name: 'Nancy Pelosi', party: 'd', district: 'CA-11', vote: 'Yea', initials: 'NP' },
    { name: 'Jim Jordan', party: 'r', district: 'OH-04', vote: 'Nay', initials: 'JJ' },
    { name: 'Ilhan Omar', party: 'd', district: 'MN-05', vote: 'Yea', initials: 'IO' },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Bills', 'H.R. 3684', 'Roll Call 369', 'Final passage']}
      crumbRight={[
        <span key="f">File · RC-2021-369</span>,
        <span key="c">Recorded Nov 5, 2021 · 11:33 PM EST</span>,
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
          ← Back to bill
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="House Clerk" id="roll-call-2021-369" />
          <CqSourceTag compact source="Congress.gov" id="/vote/117-1-369" />
        </div>
      </div>

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
          <CqLabel>Roll Call · 117th Congress · 1st session</CqLabel>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            On passage · H.R. 3684
          </h1>
          <p style={{ fontSize: 16, color: COLORS.fg2, margin: 0, lineHeight: 1.5, maxWidth: 720 }}>
            Final House vote on the Infrastructure Investment and Jobs Act. Question:{' '}
            <strong style={{ color: COLORS.fg1 }}>
              "On agreeing to the Senate amendments to the House amendment to the Senate amendment."
            </strong>
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant="d" filled size="sm">
              Passed
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              House · Roll Call 369
            </CqChip>
            <CqChip variant="info" filled={false} size="sm">
              2/3 not required
            </CqChip>
          </div>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Vote document</CqLabel>
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
              ['Recorded', 'Nov 5, 2021'],
              ['Time', '11:33 PM EST'],
              ['Duration', '15 min'],
              ['Question', 'Final passage'],
              ['Required', 'Simple majority'],
              ['Outcome', 'Passed'],
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

      {/* TALLY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: `1px solid ${COLORS.line}`,
        }}
      >
        {[
          {
            l: 'Yea',
            v: yeas,
            c: COLORS.green,
            cap: `${Math.round((yeas / total) * 100)}% of voting`,
          },
          {
            l: 'Nay',
            v: nays,
            c: COLORS.red,
            cap: `${Math.round((nays / total) * 100)}% of voting`,
          },
          { l: 'Present', v: present, c: COLORS.fg2, cap: 'Present, not voting' },
          { l: 'Not voting', v: 0, c: COLORS.fg3, cap: 'Absent or excused' },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat label={s.l} value={s.v} caption={s.cap} color={s.c} size={36} />
          </div>
        ))}
      </div>

      {/* BAR */}
      <div style={{ display: 'flex', height: 40, border: '2px solid #000', marginTop: 20 }}>
        <div
          style={{
            width: `${(yeas / total) * 100}%`,
            background: COLORS.green,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '2px solid #000',
          }}
        >
          <span
            style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
          >
            {yeas} YEA
          </span>
        </div>
        <div
          style={{
            width: `${(nays / total) * 100}%`,
            background: COLORS.red,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{ color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
          >
            {nays} NAY
          </span>
        </div>
      </div>

      {/* PARTY BREAKDOWN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 32 }}>
        {[
          { p: 'Democrat', total: 215, yea: 215, nay: 0, c: COLORS.green },
          { p: 'Republican', total: 220, yea: 13, nay: 206, c: COLORS.red },
        ].map(p => (
          <div key={p.p} style={{ border: '2px solid #000' }}>
            <div
              style={{
                background: p.c,
                color: '#fff',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {p.p} caucus
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {p.total} members voted
              </span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <CqLabel>Yea</CqLabel>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: COLORS.green,
                      marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.yea}
                  </div>
                </div>
                <div>
                  <CqLabel>Nay</CqLabel>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 700,
                      color: COLORS.red,
                      marginTop: 4,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {p.nay}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', height: 8, marginTop: 14, background: COLORS.bg3 }}>
                <div style={{ width: `${(p.yea / p.total) * 100}%`, background: COLORS.green }} />
                <div style={{ width: `${(p.nay / p.total) * 100}%`, background: COLORS.red }} />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: COLORS.fg3,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Cohesion · {Math.round((Math.max(p.yea, p.nay) / p.total) * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MEMBER LIST */}
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
            <CqLabel>Member positions · 435 voting · sample shown</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>How each member voted</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <CqButton variant="secondary" size="sm">
              All members
            </CqButton>
            <CqButton variant="secondary" size="sm">
              Filter · Defectors
            </CqButton>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 100px 80px 110px 30px',
            gap: 12,
            padding: '10px 0',
            borderTop: '2px solid #000',
            borderBottom: `1px solid ${COLORS.line}`,
          }}
        >
          {['Photo', 'Member', 'Party', 'Vote', 'District', ''].map((h, i) => (
            <CqLabel key={i}>{h}</CqLabel>
          ))}
        </div>
        {reps.map(r => (
          <a
            key={r.name}
            href="#"
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 100px 80px 110px 30px',
              gap: 12,
              padding: '12px 0',
              borderBottom: `1px solid ${COLORS.line}`,
              alignItems: 'center',
              textDecoration: 'none',
              color: COLORS.fg1,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
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
                  background: r.party === 'd' ? COLORS.green : COLORS.red,
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
                  fontSize: 14,
                }}
              >
                {r.initials}
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</span>
            <CqChip variant={r.party} size="sm">
              {r.party === 'd' ? 'Democrat' : 'Republican'}
            </CqChip>
            <CqChip variant={r.vote === 'Yea' ? 'd' : 'r'} filled size="sm">
              {r.vote.toUpperCase()}
            </CqChip>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: COLORS.fg2 }}>
              {r.district}
            </span>
            <span style={{ fontSize: 14, color: COLORS.fg3, textAlign: 'right' }}>→</span>
          </a>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <CqPlainReading>
          The bill passed with all 215 voting Democrats in favor and 13 Republicans crossing party
          lines. It became Public Law 117-58 on Nov 15, 2021.
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99}>
          {' '}
          Roll-call captured at vote close from House Clerk XML. Late corrections (if any) reflected
          in the record.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

// ════════════════════════════════════════════════════
// LOBBYING FILING DETAIL — one LDA filing, who they met, on what.
// ════════════════════════════════════════════════════

function LobbyFilingDetail() {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Lobbying', 'Filings', 'Q4 2024', '2024-Q4-AKINGUMP-87291']}
      crumbRight={[
        <span key="f">File · LDA-2024Q4-87291</span>,
        <span key="c">Filed Jan 22, 2025 · 4:18 PM EST</span>,
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
          ← All Q4 2024 filings
        </a>
        <div style={{ display: 'flex', gap: 14 }}>
          <CqSourceTag compact source="Senate LDA" id="2024-Q4-87291" />
          <CqSourceTag compact source="House Clerk" id="LD-203" />
        </div>
      </div>

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
          <CqLabel>Senate LDA · Form LD-2 · Q4 2024</CqLabel>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            Akin Gump Strauss
            <br />
            Hauer & Feld
          </h1>
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
            For client: <strong style={{ color: COLORS.fg1 }}>BlackRock, Inc.</strong> · Reporting
            period · Oct 1 – Dec 31, 2024
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              Quarterly · LD-2
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              5 lobbyists
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              7 issues
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              Compensation · $640,000
            </CqChip>
          </div>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Filing record</CqLabel>
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
              ['Form', 'LD-2'],
              ['Filing ID', '87291'],
              ['Period', 'Q4 2024'],
              ['Filed', 'Jan 22, 2025'],
              ['Filer type', 'Lobbying firm'],
              ['Registrant', '301013'],
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

      {/* HEADLINE STATS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          { l: 'Compensation', v: '$640K', c: 'Q4 2024 · gross income', col: COLORS.blue },
          { l: 'Lobbyists', v: 5, c: '3 ex-government', col: COLORS.fg1 },
          { l: 'Issues covered', v: 7, c: 'Tax · Banking · ESG', col: COLORS.fg1 },
          { l: 'Bills referenced', v: 12, c: 'IIJA, IRA, CHIPS, …', col: COLORS.fg1 },
          { l: 'Annual total', v: '$2.48M', c: '2024 · all 4 quarters', col: COLORS.blue },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{ padding: '20px 18px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat label={s.l} value={s.v} caption={s.c} color={s.col} size={32} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, marginTop: 32 }}>
        <div>
          {/* LOBBYISTS */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Registrants on this filing</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Lobbyists</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 200px 100px',
                gap: 12,
                padding: '10px 0',
                borderTop: '2px solid #000',
                borderBottom: `1px solid ${COLORS.line}`,
              }}
            >
              {['#', 'Name', 'Prior government role', 'Years'].map(h => (
                <CqLabel key={h}>{h}</CqLabel>
              ))}
            </div>
            {[
              { n: 'Brian Pomper', role: 'Senate Finance · staff director', yrs: '2007–11' },
              { n: 'Hunter Bates', role: 'Senate Republican Conference', yrs: '2003–06' },
              { n: 'Rebecca Cox', role: 'Treasury · Asst Secretary', yrs: '2014–17' },
              { n: 'Daniel Glickman', role: 'House · KS-04 (D)', yrs: '1977–95' },
              { n: 'Maria Echaveste', role: 'White House · Deputy Chief', yrs: '1998–01' },
            ].map((l, i) => (
              <div
                key={l.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 200px 100px',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{l.n}</span>
                <span style={{ fontSize: 12, color: COLORS.fg2 }}>{l.role}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                  {l.yrs}
                </span>
              </div>
            ))}
          </div>

          {/* ISSUES */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Issues covered · 7</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Subjects of contact</div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 0,
                border: '2px solid #000',
              }}
            >
              {[
                {
                  code: 'BAN',
                  t: 'Banking',
                  desc: 'Capital requirements; SEC private fund rules; Basel III endgame implementation.',
                },
                {
                  code: 'TAX',
                  t: 'Taxation/Internal Revenue',
                  desc: 'Carried interest treatment; international corporate minimum tax; pass-through deduction extension.',
                },
                {
                  code: 'TRD',
                  t: 'Trade · domestic & foreign',
                  desc: 'CHIPS Act semiconductor tax credits; export controls; outbound investment review.',
                },
                {
                  code: 'ENV',
                  t: 'Environment · ESG',
                  desc: 'SEC climate disclosure rule (S7-10-22); state anti-ESG legislation preemption.',
                },
                {
                  code: 'RET',
                  t: 'Retirement',
                  desc: 'SECURE 2.0 implementation; defined contribution plan rules; in-plan annuity guidance.',
                },
                {
                  code: 'LBR',
                  t: 'Labor',
                  desc: 'DOL fiduciary rule rewrite; PRO Act provisions affecting REITs.',
                },
              ].map((iss, i) => (
                <div
                  key={iss.code}
                  style={{
                    padding: '16px 18px',
                    borderRight: i % 2 === 0 ? `1px solid ${COLORS.line}` : 0,
                    borderTop: i > 1 ? `1px solid ${COLORS.line}` : 0,
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: COLORS.blue,
                        padding: '2px 6px',
                        border: `1px solid ${COLORS.blue}`,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {iss.code}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{iss.t}</span>
                  </div>
                  <p style={{ fontSize: 12, color: COLORS.fg2, margin: 0, lineHeight: 1.5 }}>
                    {iss.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CONTACTS */}
          <div>
            <div style={{ marginBottom: 14 }}>
              <CqLabel>Persons contacted · this period</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Government bodies + officials
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 110px',
                gap: 12,
                padding: '10px 0',
                borderTop: '2px solid #000',
                borderBottom: `1px solid ${COLORS.line}`,
              }}
            >
              {['Body', 'Official(s)', 'Issue'].map(h => (
                <CqLabel key={h}>{h}</CqLabel>
              ))}
            </div>
            {[
              {
                body: 'Senate Finance Committee',
                who: 'Wyden (D-OR), Crapo (R-ID) — staff',
                i: 'TAX',
              },
              { body: 'U.S. House', who: 'Jeffries (D-NY-08), Smith (R-MO-08)', i: 'BAN' },
              {
                body: 'Securities & Exchange Comm.',
                who: 'Office of the Chair, Div. Corp Fin',
                i: 'ENV',
              },
              { body: 'Department of Treasury', who: 'Office of Tax Policy', i: 'TAX' },
              { body: 'Department of Labor', who: 'Employee Benefits Security Admin.', i: 'RET' },
            ].map((c, i) => (
              <div
                key={c.body + i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 110px',
                  gap: 12,
                  padding: '12px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700 }}>{c.body}</span>
                <span style={{ fontSize: 12, color: COLORS.fg2 }}>{c.who}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: COLORS.blue,
                    padding: '2px 6px',
                    border: `1px solid ${COLORS.blue}`,
                    justifySelf: 'start',
                  }}
                >
                  {c.i}
                </span>
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <CqPlainReading>
                LDA filings disclose that contact occurred and the topic — not what was said. Five
                contacts touched both Finance and Banking issues simultaneously.
              </CqPlainReading>
            </div>
          </div>
        </div>

        <aside>
          <div style={{ border: '2px solid #000', padding: 18, marginBottom: 14 }}>
            <CqLabel>Client</CqLabel>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>BlackRock, Inc.</div>
            <div
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              NYSE: BLK · Asset management · NY, NY
            </div>
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0 }}>
              {[
                ['2024 spend', '$2.48M'],
                ['2023 spend', '$2.31M'],
                ['Firms used', '6'],
                ['Top firm', 'Akin Gump'],
                ['LDA history', '2008–'],
              ].map(([k, v], i) => (
                <li
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: i === 0 ? `1px solid ${COLORS.line}` : `1px solid ${COLORS.line}`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: COLORS.fg3 }}>{k}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v}</span>
                </li>
              ))}
            </ul>
            <a
              href="#"
              style={{
                display: 'inline-block',
                marginTop: 12,
                fontSize: 11,
                color: COLORS.blueHv,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                fontFamily: 'var(--font-mono)',
              }}
            >
              All BlackRock filings →
            </a>
          </div>

          <div
            style={{
              borderLeft: `6px solid ${COLORS.blue}`,
              background: COLORS.bg2,
              padding: '14px 16px',
            }}
          >
            <CqLabel>Compensation trend · 4Q rolling</CqLabel>
            <div
              style={{ marginTop: 12, display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}
            >
              {[440, 500, 580, 620, 590, 640].map((h, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: h / 8, background: COLORS.blue, marginBottom: 4 }} />
                  <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                    ${h}K
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
                fontSize: 9,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              <span>Q3'23</span>
              <span>Q4'23</span>
              <span>Q1'24</span>
              <span>Q2'24</span>
              <span>Q3'24</span>
              <span>Q4'24</span>
            </div>
          </div>
        </aside>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.97}>
          {' '}
          Senate LDA filings are self-reported by the registrant. Compensation is gross income, not
          net.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

Object.assign(window, { RollCallDetail, LobbyFilingDetail });
