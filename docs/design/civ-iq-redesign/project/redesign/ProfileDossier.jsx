// VARIATION 2 — DOSSIER
// Wire-service / federal-register density. Two-column body. Every fact attributed inline.
// Larger 160px portrait, marginalia-style sources, narrow column measure for readability.

function ProfileDossier({ official: o }) {
  const partyClr = partyColor(o.party);

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
      {/* MASTHEAD STRIP — black bar w/ dossier metadata */}
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
          CIV.IQ · Public Record Dossier · {o.chamber} · {o.state}
        </span>
        <span style={{ display: 'flex', gap: 18 }}>
          <span>
            File · {o.id.toUpperCase()}-{o.congress}
          </span>
          <span>Compiled Apr 26, 2026</span>
          <span>Sources · {o.sources.length}</span>
        </span>
      </div>

      <div style={{ padding: '36px 36px 0' }}>
        {/* HERO — portrait left, identity + meta right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 240px',
            gap: 32,
            alignItems: 'flex-start',
            paddingBottom: 24,
            borderBottom: '2px solid #000',
          }}
        >
          <CqPortrait name={o.name} size={160} party={o.party} />
          <div>
            <CqLabel>Subject</CqLabel>
            <h1
              style={{
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.0,
                margin: '6px 0 10px',
                textTransform: 'uppercase',
              }}
            >
              {o.name}
            </h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
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
                <CqChip variant="info" filled={false} size="sm">
                  {o.position}
                </CqChip>
              )}
            </div>

            {/* Field grid — biographical + service vitals */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px 24px',
                marginTop: 4,
              }}
            >
              {[
                ['In office', `Since ${o.since}`],
                ['Next election', o.next_election],
                ['Congress', o.congress],
                ['Chamber', o.chamber],
                ['Caucuses', `${o.caucus_count}`],
                ['Committees', `${o.committees.length}`],
                ['Bills sponsored', `${o.bills_sponsored}`],
                ['Co-sponsored', `${o.cosponsored}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <CqLabel>{k}</CqLabel>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 3,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sources marginalia */}
          <div style={{ borderLeft: `2px solid ${COLORS.fg1}`, paddingLeft: 16 }}>
            <CqLabel>Sources cited</CqLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {o.sources.map(s => (
                <div
                  key={s.name}
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    paddingBottom: 4,
                    borderBottom: `1px solid ${COLORS.line}`,
                  }}
                >
                  <span>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 5,
                        height: 5,
                        background: COLORS.blue,
                        marginRight: 6,
                        verticalAlign: 'middle',
                      }}
                    />
                    {s.name}
                  </span>
                  <span style={{ color: COLORS.fg3 }}>{s.updated}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HEADLINE NUMBERS — three big stats with footnoted sources */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            borderBottom: '2px solid #000',
          }}
        >
          {[
            {
              label: 'Votes with party',
              value: `${o.party_vote}%`,
              caption: '1,248 of 1,300 floor votes [1]',
              color: partyClr,
            },
            {
              label: 'Raised, cycle',
              value: o.raised,
              caption: `Cash on hand · ${o.cash_on_hand} [2]`,
              color: COLORS.blue,
            },
            {
              label: 'Floor attendance',
              value: `${o.attendance}%`,
              caption: 'Roll-call participation [1]',
              color: COLORS.fg1,
            },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{ padding: '24px 22px', borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}` }}
            >
              <CqStat {...s} size={48} />
            </div>
          ))}
        </div>

        {/* TWO-COLUMN BODY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, marginTop: 28 }}>
          {/* LEFT — record */}
          <section>
            <DossierH>§ I. Voting record</DossierH>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.fg2, margin: '0 0 14px' }}>
              {o.short} cast {o.party_vote}% of votes with the {o.partyLong} caucus during the{' '}
              {o.congress} Congress. Six representative floor votes are listed below; full record at
              Congress.gov [1].
            </p>
            <div style={{ borderTop: '2px solid #000' }} />
            {[
              {
                bill: 'H.R. 8070',
                vote: o.party === 'd' ? 'Yes' : 'No',
                title: 'FY25 Defense Authorization',
              },
              {
                bill: 'S. 4361',
                vote: o.party === 'd' ? 'No' : 'Yes',
                title: 'Border Act of 2024',
              },
              {
                bill: 'H.R. 7024',
                vote: o.party === 'd' ? 'Yes' : 'No',
                title: 'Tax Relief for American Families',
              },
              { bill: 'H.R. 815', vote: 'Yes', title: 'Israel Security Supplemental' },
              { bill: 'S. 2226', vote: 'Yes', title: 'NDAA, FY24' },
              {
                bill: 'H.R. 2',
                vote: o.party === 'd' ? 'No' : 'Yes',
                title: 'Secure the Border Act',
              },
            ].map(v => (
              <div
                key={v.bill}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 60px',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.bill}</span>
                <span style={{ fontSize: 12 }}>{v.title}</span>
                <CqChip variant={v.vote === 'Yes' ? 'd' : 'r'} size="sm" filled={false}>
                  {v.vote}
                </CqChip>
              </div>
            ))}

            <DossierH style={{ marginTop: 28 }}>§ II. Committees</DossierH>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {o.committees.map((c, i) => (
                <li
                  key={c}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '24px 1fr auto',
                    gap: 8,
                    padding: '10px 0',
                    borderBottom: `1px solid ${COLORS.line}`,
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{c}</span>
                  <CqLabel color={COLORS.fg3}>{i === 0 ? 'Ranking' : 'Member'}</CqLabel>
                </li>
              ))}
            </ul>

            <DossierH style={{ marginTop: 28 }}>§ III. Bills sponsored</DossierH>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: COLORS.fg2, margin: '0 0 12px' }}>
              {o.bills_sponsored} bills sponsored, {o.cosponsored} co-sponsored in the {o.congress}{' '}
              Congress [1].
            </p>
            {[
              {
                n: 'H.R. 1491',
                t: 'Stop Institutional Investors from Acquiring Single-Family Homes',
                st: 'Introduced',
              },
              { n: 'H.R. 2620', t: 'Community Land Trust Support Act', st: 'Committee' },
              { n: 'H.R. 3911', t: 'Voting Rights Restoration Act of 2023', st: 'Referred' },
              { n: 'H.R. 4422', t: 'Federal Workforce Modernization', st: 'Reported' },
            ].map(b => (
              <div
                key={b.n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 90px',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.n}</span>
                <span style={{ fontSize: 12 }}>{b.t}</span>
                <CqChip variant="info" filled={false} size="sm">
                  {b.st}
                </CqChip>
              </div>
            ))}
          </section>

          {/* RIGHT — money + contact */}
          <section>
            <DossierH>§ IV. Campaign finance</DossierH>
            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}
            >
              <div style={{ border: '2px solid #000', padding: '14px 16px' }}>
                <CqLabel>Total raised, cycle</CqLabel>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.blue,
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {o.raised}
                </div>
                <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  FEC · {o.sources[1].id}
                </div>
              </div>
              <div style={{ border: '2px solid #000', padding: '14px 16px' }}>
                <CqLabel>Cash on hand</CqLabel>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 700,
                    color: COLORS.fg1,
                    marginTop: 4,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {o.cash_on_hand}
                </div>
                <div style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  End-of-quarter filing
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: 12,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                margin: '0 0 8px',
              }}
            >
              Composition by source [2]:
            </p>
            <CqBar
              label="Individual contributions"
              pct={o.small_donor_pct + 30}
              amount="$2.10M"
              color={COLORS.blue}
              sub="68% · ≥$200"
            />
            <CqBar
              label="PACs"
              pct={o.pac_pct}
              amount="$0.95M"
              color={COLORS.vlau}
              sub="Industry + ideological"
            />
            <CqBar
              label="Party committees"
              pct={18}
              amount="$0.43M"
              color={COLORS.greige}
              sub="DCCC / NRCC transfers"
            />
            <CqBar
              label="Self / loans"
              pct={5}
              amount="$0.10M"
              color={COLORS.fg4}
              sub="Candidate funds"
            />

            <CqPlainReading>
              {o.short}'s top industry, by reported contributor employer, is{' '}
              <strong>{o.industry_top}</strong>. {o.small_donor_pct}% of dollars came from donors
              giving over $200.
            </CqPlainReading>

            <DossierH style={{ marginTop: 28 }}>§ V. How to contact</DossierH>
            <div style={{ border: '2px solid #000' }}>
              <ContactRow
                label="Washington, DC"
                addr={o.contact.dc.addr}
                phone={o.contact.dc.phone}
              />
              {o.contact.district.slice(0, 2).map(d => (
                <ContactRow key={d.name} label={d.name} addr={d.addr} phone={d.phone} />
              ))}
              <div
                style={{
                  padding: '12px 16px',
                  borderTop: `1px solid ${COLORS.line}`,
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr',
                  gap: 12,
                  alignItems: 'center',
                  background: COLORS.bg2,
                }}
              >
                <CqLabel>Online</CqLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <a style={dossierLink} href="#">
                    {o.contact.web} →
                  </a>
                  <a style={dossierLink} href="#">
                    {o.contact.contact_form} →
                  </a>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: COLORS.fg3 }}>
                    {o.contact.twitter}
                  </span>
                </div>
              </div>
              {o.contact.district.length > 2 && (
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: `1px solid ${COLORS.line}`,
                    fontSize: 11,
                    color: COLORS.fg3,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  + {o.contact.district.length - 2} additional district offices
                </div>
              )}
            </div>
          </section>
        </div>

        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
          <CqDisclaimer confidence={0.95}>
            {' '}
            [1] Congress.gov · roll-call. [2] FEC.gov · cycle filings. Methodology at
            civ.iq/methodology.
          </CqDisclaimer>
        </div>
      </div>
    </div>
  );
}

function DossierH({ children, style = {} }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        margin: '0 0 12px',
        paddingBottom: 8,
        borderBottom: '2px solid #000',
        color: COLORS.fg1,
        ...style,
      }}
    >
      {children}
    </h3>
  );
}

function ContactRow({ label, addr, phone }) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${COLORS.line}`,
        display: 'grid',
        gridTemplateColumns: '110px 1fr 130px',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <CqLabel>{label}</CqLabel>
      <div style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5 }}>{addr}</div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
        }}
      >
        {phone}
      </span>
    </div>
  );
}

const dossierLink = {
  fontSize: 12,
  color: COLORS.blueHv,
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
};

Object.assign(window, { ProfileDossier });
