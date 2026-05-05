// VARIATION 3 — MONEY-FIRST
// Campaign finance is the hero. No portrait — pictogram identity instead, per the system's
// "human figure as Aicher pictogram" rule. Provenance bars dominate the page; voting is secondary.

function ProfileMoneyFirst({ official: o }) {
  const partyClr = partyColor(o.party);

  // Money provenance — top sources composing total raised.
  const sources = [
    {
      label: 'Individual ≥ $200',
      pct: 56,
      amount: '$8.51M',
      color: COLORS.blue,
      sub: '14,302 unique donors',
    },
    {
      label: 'Industry PACs',
      pct: 22,
      amount: '$3.34M',
      color: COLORS.vlau,
      sub: 'Energy · Defense · Pharma',
    },
    {
      label: 'Leadership PACs',
      pct: 11,
      amount: '$1.67M',
      color: COLORS.fg2,
      sub: 'Cross-member transfers',
    },
    {
      label: 'Party committees',
      pct: 6,
      amount: '$0.91M',
      color: COLORS.greige,
      sub: 'DCCC / NRCC',
    },
    {
      label: 'Individual < $200',
      pct: 3,
      amount: '$0.46M',
      color: COLORS.blueHv,
      sub: 'Small-dollar',
    },
    { label: 'Self / loans', pct: 2, amount: '$0.31M', color: COLORS.fg4, sub: 'Candidate funds' },
  ];

  const industries = [
    { name: o.industry_top, pct: 18, amount: '$2.74M' },
    { name: 'Securities & Investment', pct: 14, amount: '$2.13M' },
    { name: 'Real Estate', pct: 11, amount: '$1.67M' },
    { name: 'Lawyers & Lobbyists', pct: 9, amount: '$1.37M' },
    { name: 'Health Professionals', pct: 7, amount: '$1.06M' },
  ];

  return (
    <div
      style={{
        width: 1080,
        padding: '32px 36px 56px',
        background: '#fff',
        color: COLORS.fg1,
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <CqLabel>
          Federal · {o.chamber} · {o.state} · Money lens
        </CqLabel>
        <CqLabel color={COLORS.fg3}>
          Cycle · 2023–2024 · FEC ID {o.sources[1].id.split(' · ')[0]}
        </CqLabel>
      </div>

      {/* MONEY HERO — name on the left, big total raised on the right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: 32,
          alignItems: 'flex-end',
          paddingBottom: 24,
          borderBottom: '2px solid #000',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <CqChip variant={o.party} size="sm">
              {o.partyLong}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {o.role}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {o.district}
            </CqChip>
            {o.position && (
              <CqChip variant="warn" filled={false} size="sm">
                {o.position}
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              lineHeight: 0.95,
              margin: 0,
              textTransform: 'uppercase',
            }}
          >
            {o.name}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: COLORS.fg2,
              margin: '10px 0 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {o.position ? `${o.position} · ` : ''}In office since {o.since} · Next election{' '}
            {o.next_election}
          </p>
        </div>
        <div style={{ borderLeft: '2px solid #000', paddingLeft: 24, textAlign: 'right' }}>
          <CqLabel>Total raised, cycle</CqLabel>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: COLORS.blue,
              lineHeight: 0.95,
              marginTop: 4,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.04em',
            }}
          >
            {o.raised}
          </div>
          <div
            style={{
              fontSize: 12,
              color: COLORS.fg3,
              marginTop: 4,
              fontFamily: 'var(--font-mono)',
            }}
          >
            Cash on hand · {o.cash_on_hand} · 23 quarters reporting
          </div>
        </div>
      </div>

      {/* PROVENANCE — the hero data viz */}
      <section style={{ marginTop: 28 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <div>
            <CqLabel>FEC · cycle 2024</CqLabel>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                margin: '4px 0 0',
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              Where the money came from
            </h2>
          </div>
          <CqButton variant="secondary" size="sm">
            Download CSV
          </CqButton>
        </div>

        {/* Stacked composition bar — Aicher rectilinear, full-width */}
        <div style={{ display: 'flex', height: 56, border: '2px solid #000', marginBottom: 0 }}>
          {sources.map(s => (
            <div
              key={s.label}
              title={`${s.label}: ${s.pct}%`}
              style={{
                width: `${s.pct}%`,
                background: s.color,
                borderRight: '2px solid #000',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {s.pct >= 6 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.06em',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.pct}%
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
          {sources.map(s => (
            <div key={s.label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{ width: 10, height: 10, background: s.color, border: '1px solid #000' }}
              />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{s.label}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                {s.amount}
              </span>
            </div>
          ))}
        </div>

        {/* Detail rows */}
        <div style={{ marginTop: 24 }}>
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
        </div>

        <div style={{ marginTop: 18 }}>
          <CqPlainReading>
            {o.small_donor_pct}% of {o.short}'s {o.raised} came from donors giving more than $200,
            and {o.pac_pct}% came from political action committees. The largest single industry was{' '}
            <strong>{o.industry_top}</strong>.
          </CqPlainReading>
        </div>
      </section>

      {/* INDUSTRY + VOTING SIDE-BY-SIDE */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginTop: 36 }}>
        <section>
          <CqLabel>OpenSecrets · industry codes</CqLabel>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 16px' }}>
            Top industries by contribution
          </h3>
          {industries.map((ind, i) => (
            <div
              key={ind.name}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 70px 100px',
                gap: 10,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? '2px solid #000' : `1px solid ${COLORS.line}`,
              }}
            >
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{ind.name}</span>
              <div style={{ height: 8, background: COLORS.bg3 }}>
                <div
                  style={{ width: `${ind.pct * 4}%`, height: '100%', background: COLORS.vlau }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                }}
              >
                {ind.amount}
              </span>
            </div>
          ))}
        </section>

        <section>
          <CqLabel>Record summary</CqLabel>
          <h3 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 16px' }}>Voting + service</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 0,
              border: '2px solid #000',
            }}
          >
            {[
              { label: 'Votes with party', value: `${o.party_vote}%`, color: partyClr },
              { label: 'Attendance', value: `${o.attendance}%`, color: COLORS.fg1 },
              { label: 'Bills sponsored', value: o.bills_sponsored, color: COLORS.fg1 },
              { label: 'Co-sponsored', value: o.cosponsored, color: COLORS.fg1 },
              { label: 'Committees', value: o.committees.length, color: COLORS.fg1 },
              { label: 'Caucuses', value: o.caucus_count, color: COLORS.fg1 },
            ].map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: '16px 18px',
                  borderRight: i % 2 === 0 ? `1px solid ${COLORS.line}` : 0,
                  borderTop: i >= 2 ? `1px solid ${COLORS.line}` : 0,
                }}
              >
                <CqLabel>{s.label}</CqLabel>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: s.color,
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <CqLabel>Committees</CqLabel>
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {o.committees.map(c => (
                <CqChip key={c} variant="ink" filled={false} size="sm">
                  {c}
                </CqChip>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* CONTACT — full-width band of offices */}
      <section style={{ marginTop: 40, border: '2px solid #000' }}>
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <CqLabel color="#fff" style={{ color: '#fff' }}>
            Contact {o.short}
          </CqLabel>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: '#9ca3af',
              letterSpacing: '0.04em',
            }}
          >
            {o.contact.district.length + 1} offices · {o.contact.web}
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(o.contact.district.length + 1, 4)}, 1fr)`,
          }}
        >
          <ContactSlot
            label="Washington, DC"
            addr={o.contact.dc.addr}
            phone={o.contact.dc.phone}
            primary
          />
          {o.contact.district.slice(0, 3).map((d, i) => (
            <ContactSlot key={d.name} label={d.name} addr={d.addr} phone={d.phone} />
          ))}
        </div>
        {o.contact.district.length > 3 && (
          <div
            style={{
              padding: '10px 18px',
              borderTop: `1px solid ${COLORS.line}`,
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              background: COLORS.bg2,
            }}
          >
            + {o.contact.district.length - 3} additional district offices · see full list at{' '}
            {o.contact.web}/offices
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            borderTop: `1px solid ${COLORS.line}`,
            alignItems: 'center',
            padding: '12px 18px',
            background: COLORS.bg2,
          }}
        >
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <CqLabel>Online</CqLabel>
            <a style={moneyLink} href="#">
              {o.contact.web} →
            </a>
            <a style={moneyLink} href="#">
              {o.contact.contact_form} →
            </a>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
              {o.contact.twitter}
            </span>
          </div>
          <CqButton variant="primary" size="sm">
            Email constituent services
          </CqButton>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <CqDisclaimer confidence={0.93}>
          {' '}
          Money figures aggregate FEC committee filings; minor PAC transfers may shift category
          percentages by ±1.
        </CqDisclaimer>
      </div>
    </div>
  );
}

function ContactSlot({ label, addr, phone, primary }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRight: `1px solid ${COLORS.line}`,
        background: primary ? COLORS.bg2 : '#fff',
      }}
    >
      <CqLabel color={primary ? COLORS.blueHv : COLORS.fg3}>
        {label}
        {primary ? ' · primary' : ''}
      </CqLabel>
      <div
        style={{ fontSize: 12, color: COLORS.fg2, marginTop: 8, lineHeight: 1.5, minHeight: 54 }}
      >
        {addr}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          marginTop: 8,
          color: COLORS.fg1,
        }}
      >
        {phone}
      </div>
    </div>
  );
}

const moneyLink = {
  fontSize: 12,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

Object.assign(window, { ProfileMoneyFirst });
