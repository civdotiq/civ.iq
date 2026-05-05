// VARIATION 1 — REFINED CLASSIC
// A more disciplined version of the existing detail page. Same IA, sharper hierarchy.
// Adds: a contact strip pinned below the hero, a sources rail, a confidence/methodology line,
// and a tighter stat row that distinguishes party-vote (green/red, party token) from
// non-party metrics (ink, neutral) per the design-system rule that party colors only encode party.

function ProfileRefined({ official: o }) {
  const partyClr = partyColor(o.party);

  return (
    <div
      style={{
        width: 1080,
        padding: '32px 36px 48px',
        background: '#fff',
        color: COLORS.fg1,
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* Crumb + sources rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
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
          gridTemplateColumns: '120px 1fr auto',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 28,
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
          <p style={{ fontSize: 14, color: COLORS.fg2, margin: 0, fontFamily: 'var(--font-mono)' }}>
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
        </div>
      </div>

      {/* STATS ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          {
            label: 'Votes with party',
            value: `${o.party_vote}%`,
            caption: '1,248 of 1,300 floor votes',
            color: partyClr,
          },
          {
            label: 'Attendance',
            value: `${o.attendance}%`,
            caption: 'Roll-call · 119th',
            color: COLORS.fg1,
          },
          {
            label: 'Bills sponsored',
            value: o.bills_sponsored,
            caption: o.cosponsored + ' co-sponsored',
            color: COLORS.fg1,
          },
          {
            label: 'Raised 2024',
            value: o.raised,
            caption: 'FEC cycle filings',
            color: COLORS.blue,
          },
          {
            label: 'Committees',
            value: o.committees.length,
            caption: o.committees.slice(0, 2).join(', '),
            color: COLORS.fg1,
          },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{ padding: '20px 22px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
          >
            <CqStat {...s} size={32} />
          </div>
        ))}
      </div>

      {/* CONTACT STRIP */}
      <div
        style={{
          marginTop: 28,
          marginBottom: 32,
          border: '2px solid #000',
          display: 'grid',
          gridTemplateColumns: '180px 1fr 1fr 1fr',
        }}
      >
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            padding: '20px 18px',
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
              fontSize: 11,
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
        <ContactCell label="Washington, DC" addr={o.contact.dc.addr} phone={o.contact.dc.phone} />
        <ContactCell
          label={o.contact.district[0].name}
          addr={o.contact.district[0].addr}
          phone={o.contact.district[0].phone}
        />
        <div style={{ padding: '16px 18px', borderLeft: `1px solid ${COLORS.line}` }}>
          <CqLabel>Online</CqLabel>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <a style={linkStyle} href="#">
              {o.contact.web} →
            </a>
            <a style={linkStyle} href="#">
              {o.contact.contact_form} →
            </a>
            <span style={{ fontSize: 12, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              {o.contact.twitter}
            </span>
          </div>
          {o.contact.district.length > 1 && (
            <div
              style={{
                marginTop: 12,
                fontSize: 10,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              + {o.contact.district.length - 1} other district offices
            </div>
          )}
        </div>
      </div>

      {/* TAB BAR (visual only) */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #000', marginBottom: 26 }}>
        {[
          ['Voting record', true],
          ['Where the money came from', false],
          ['Bills sponsored', false],
          ['Lobbyist meetings', false],
          ['Committees', false],
        ].map(([label, active]) => (
          <div
            key={label}
            style={{
              background: active ? '#000' : 'transparent',
              color: active ? '#fff' : COLORS.fg1,
              padding: '14px 18px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* VOTING RECORD */}
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
              <CqLabel>{o.congress} Congress · 1,248 floor votes cast</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Recent floor votes</div>
            </div>
            <CqButton variant="secondary" size="sm">
              Download CSV
            </CqButton>
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
              bill: 'H.R. 8404',
              title: 'Respect for Marriage Act',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Dec 8, 2022',
            },
            {
              bill: 'H.R. 3684',
              title: 'Infrastructure Investment and Jobs Act',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Nov 5, 2021',
            },
            {
              bill: 'H.R. 5376',
              title: 'Inflation Reduction Act of 2022',
              vote: 'Yes',
              oc: 'Passed',
              date: 'Aug 12, 2022',
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
            },
            {
              bill: 'H.R. 2',
              title: 'Secure the Border Act of 2023',
              vote: 'No',
              oc: 'Passed H',
              date: 'May 11, 2023',
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
        </div>

        {/* SIDE PANEL — Committees + caucuses */}
        <aside>
          <div style={{ border: '2px solid #000', padding: '20px 22px', marginBottom: 16 }}>
            <CqLabel>Committees · {o.committees.length}</CqLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {o.committees.map((c, i) => (
                <div
                  key={c}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: i === o.committees.length - 1 ? 0 : `1px solid ${COLORS.line}`,
                    paddingBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c}</span>
                  <CqLabel color={COLORS.fg3}>{i === 0 ? 'Ranking' : 'Member'}</CqLabel>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              borderLeft: `6px solid ${COLORS.blue}`,
              background: COLORS.bg2,
              padding: '16px 18px',
            }}
          >
            <CqLabel>Caucuses</CqLabel>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginTop: 6,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {o.caucus_count}
            </div>
            <div style={{ fontSize: 12, color: COLORS.fg3, marginTop: 4 }}>
              Including: Congressional Black Caucus, New Democrat Coalition, Problem Solvers
            </div>
          </div>
          <CqDisclaimer confidence={0.96} />
        </aside>
      </div>
    </div>
  );
}

const linkStyle = {
  fontSize: 12,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

function ContactCell({ label, addr, phone }) {
  return (
    <div style={{ padding: '16px 18px', borderLeft: `1px solid ${COLORS.line}` }}>
      <CqLabel>{label}</CqLabel>
      <div style={{ fontSize: 12, color: COLORS.fg2, marginTop: 8, lineHeight: 1.5 }}>{addr}</div>
      <div
        style={{
          fontSize: 13,
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

Object.assign(window, { ProfileRefined });
