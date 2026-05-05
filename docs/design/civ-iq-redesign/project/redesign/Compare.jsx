// COMPARE — two officials side-by-side. Same chassis as profile, but split.
// Default load: Hakeem Jeffries (D, NY-08) vs Mike Johnson (R, LA-04).
// Reuses OFFICIAL_JEFFRIES + OFFICIAL_JOHNSON; presents matched rows.

function ComparePage({ a = OFFICIAL_JEFFRIES, b = OFFICIAL_JOHNSON }) {
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Tools', 'Compare officials', `${a.short} vs ${b.short}`]}
      crumbRight={[
        <span key="m">Both 119th Congress · House</span>,
        <span key="d">As of Apr 26, 2026</span>,
      ]}
    >
      {/* TWO HEROES */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '2px solid #000',
          paddingBottom: 24,
        }}
      >
        <CompareHero o={a} side="left" />
        <CompareHero o={b} side="right" />
      </div>

      {/* MATCHED ROWS */}
      <div style={{ marginTop: 24 }}>
        <CompareSection title="Headline record">
          <CompareRow label="Bills sponsored" la={a.bills_sponsored} lb={b.bills_sponsored} />
          <CompareRow label="Bills co-sponsored" la={a.cosponsored} lb={b.cosponsored} />
          <CompareRow label="Attendance" la={a.attendance + '%'} lb={b.attendance + '%'} />
          <CompareRow
            label="Votes w/ own party"
            la={a.party_vote + '%'}
            lb={b.party_vote + '%'}
            colorA={partyColor(a.party)}
            colorB={partyColor(b.party)}
          />
          <CompareRow
            label="Committees served"
            la={a.committees.join(', ')}
            lb={b.committees.join(', ')}
            small
          />
          <CompareRow label="Caucuses joined" la={a.caucus_count} lb={b.caucus_count} />
        </CompareSection>

        <CompareSection title="Money · 2024 cycle">
          <CompareRow
            label="Total raised"
            la={a.raised}
            lb={b.raised}
            colorA={COLORS.blue}
            colorB={COLORS.blue}
          />
          <CompareRow label="Cash on hand" la={a.cash_on_hand} lb={b.cash_on_hand} />
          <CompareRow
            label="Small donors share"
            la={a.small_donor_pct + '%'}
            lb={b.small_donor_pct + '%'}
          />
          <CompareRow label="PAC share" la={a.pac_pct + '%'} lb={b.pac_pct + '%'} />
          <CompareRow label="Top industry" la={a.industry_top} lb={b.industry_top} small />
        </CompareSection>

        <CompareSection title="Office and tenure">
          <CompareRow label="Position" la={a.position} lb={b.position} small />
          <CompareRow label="In office since" la={a.since} lb={b.since} />
          <CompareRow label="Next election" la={a.next_election} lb={b.next_election} small />
          <CompareRow
            label="District / state"
            la={a.district + ' · ' + a.state}
            lb={b.district + ' · ' + b.state}
            small
          />
        </CompareSection>

        {/* HEAD-TO-HEAD VOTES */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
            }}
          >
            <div>
              <CqLabel>Where they diverged · last 7 floor votes</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                Head-to-head, by bill
              </div>
            </div>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              Source · House Clerk roll calls
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 70px 70px 110px',
              gap: 12,
              padding: '10px 0',
              borderTop: '2px solid #000',
              borderBottom: `1px solid ${COLORS.line}`,
            }}
          >
            {['Bill', 'Title', a.short, b.short, 'Outcome'].map(h => (
              <CqLabel key={h}>{h}</CqLabel>
            ))}
          </div>
          {[
            {
              bill: 'H.R. 815',
              t: 'Israel Security Supplemental',
              va: 'Yes',
              vb: 'Yes',
              oc: 'Passed',
            },
            {
              bill: 'H.R. 7024',
              t: 'Tax Relief for American Families Act',
              va: 'No',
              vb: 'Yes',
              oc: 'Stalled',
            },
            { bill: 'H.R. 5376', t: 'Inflation Reduction Act', va: 'Yes', vb: 'No', oc: 'Passed' },
            {
              bill: 'H.R. 3684',
              t: 'Infrastructure Investment & Jobs Act',
              va: 'Yes',
              vb: 'No',
              oc: 'Passed',
            },
            { bill: 'H.R. 2', t: 'Secure the Border Act', va: 'No', vb: 'Yes', oc: 'Passed H.' },
            { bill: 'H.R. 8404', t: 'Respect for Marriage Act', va: 'Yes', vb: 'No', oc: 'Passed' },
            { bill: 'S. 2226', t: 'NDAA · FY24', va: 'Yes', vb: 'Yes', oc: 'Passed' },
          ].map(v => {
            const agree = v.va === v.vb;
            return (
              <div
                key={v.bill}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 70px 70px 110px',
                  gap: 12,
                  padding: '14px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                  background: agree ? COLORS.bg2 : '#fff',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.bill}</span>
                <span style={{ fontSize: 13 }}>
                  {v.t}
                  {agree && <CqLabel style={{ marginLeft: 8 }}>· agreed</CqLabel>}
                </span>
                <CqChip variant={v.va === 'Yes' ? 'd' : 'r'} filled={false} size="sm">
                  {v.va}
                </CqChip>
                <CqChip variant={v.vb === 'Yes' ? 'd' : 'r'} filled={false} size="sm">
                  {v.vb}
                </CqChip>
                <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                  {v.oc}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }}>
          <CqPlainReading>
            On 7 recent major floor votes, {a.short} and {b.short} agreed on 2 (NDAA, Israel
            security) and split on 5. Their party-line agreement reflects 96% / 98% caucus
            alignment.
          </CqPlainReading>
        </div>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.97}>
          {' '}
          Comparison metrics are computed from primary sources for the 119th Congress only. Add a
          third official by appending ?c=name to the URL.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

function CompareHero({ o, side }) {
  return (
    <div
      style={{
        padding: '20px 28px',
        borderRight: side === 'left' ? `1px solid ${COLORS.line}` : 0,
        background: side === 'right' ? COLORS.bg2 : '#fff',
      }}
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <CqPortrait name={o.name} size={88} party={o.party} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <CqChip variant={o.party} size="sm">
              {o.partyLong} · {o.district}
            </CqChip>
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {o.name}
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 6,
            }}
          >
            {o.position} · Since {o.since}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareSection({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          background: COLORS.fg1,
          color: '#fff',
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function CompareRow({ label, la, lb, colorA = COLORS.fg1, colorB = COLORS.fg1, small = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px 1fr',
        borderBottom: `1px solid ${COLORS.line}`,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          textAlign: 'right',
          fontSize: small ? 12 : 16,
          fontWeight: 700,
          color: colorA,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: small ? 0 : '-0.01em',
        }}
      >
        {la}
      </div>
      <div
        style={{
          padding: '14px 12px',
          textAlign: 'center',
          borderLeft: `1px solid ${COLORS.line}`,
          borderRight: `1px solid ${COLORS.line}`,
          background: COLORS.bg2,
        }}
      >
        <CqLabel>{label}</CqLabel>
      </div>
      <div
        style={{
          padding: '14px 20px',
          textAlign: 'left',
          fontSize: small ? 12 : 16,
          fontWeight: 700,
          color: colorB,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: small ? 0 : '-0.01em',
        }}
      >
        {lb}
      </div>
    </div>
  );
}

Object.assign(window, { ComparePage });
