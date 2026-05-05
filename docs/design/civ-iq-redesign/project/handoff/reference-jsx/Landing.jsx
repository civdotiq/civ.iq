// LANDING — the front door. Otl Aicher hero with the address lookup as the
// primary action, civic-record framing, and an honest "what we cover" strip.
// The layout reads like the front page of a wire bulletin: black masthead band,
// huge uppercase head, single primary input, three secondary entry points.

function LandingPage() {
  return (
    <div
      style={{
        width: 1280,
        background: '#fff',
        color: COLORS.fg1,
        fontFamily: 'var(--font-primary)',
      }}
    >
      <CqHeader width={1280} current="find" />

      {/* Black masthead band — file stamp like every other page */}
      <CqBreadcrumb
        crumbs={['CIV.IQ', 'Vol. III · No. 26', 'Apr 26, 2026']}
        right={[
          <span key="e">Edition · Federal + State + 50</span>,
          <span key="s">Sources · 19 ingested</span>,
        ]}
      />

      {/* HERO — full-bleed black-on-white. Single column, the Aicher way. */}
      <div style={{ padding: '64px 56px 40px', borderBottom: '2px solid #000' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: 56,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <CqLabel>Civic intelligence · 119th Congress</CqLabel>
            <h1
              style={{
                fontSize: 128,
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 0.86,
                margin: '14px 0 18px',
                textTransform: 'uppercase',
              }}
            >
              Know your
              <br />
              representatives.
            </h1>
            <p
              style={{ fontSize: 22, lineHeight: 1.4, color: COLORS.fg2, margin: 0, maxWidth: 720 }}
            >
              See how the people who represent you vote, who funds them, and what they sponsor — all
              from the public government record. No editorializing, no signups, no ads.
            </p>
          </div>
          <aside style={{ border: '2px solid #000', padding: 22 }}>
            <CqLabel>What's new this week</CqLabel>
            <ul
              style={{
                listStyle: 'none',
                margin: '12px 0 0',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {[
                ['Apr 25', '127 new FEC filings · Q1 2026 totals posted'],
                ['Apr 24', 'Roll-call · H.R. 9148 · Pacific Salmon Authorization'],
                ['Apr 22', 'New state coverage · West Virginia legislature'],
                ['Apr 19', 'Methodology v3.4 · confidence formula updated'],
              ].map(([d, t], i) => (
                <li
                  key={d + i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr',
                    gap: 10,
                    paddingTop: 8,
                    borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: COLORS.fg3,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {d}
                  </span>
                  <span style={{ fontSize: 12, color: COLORS.fg1, lineHeight: 1.4 }}>{t}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Address lookup — the primary action */}
        <div style={{ marginTop: 48 }}>
          <CqLabel>Start with your address</CqLabel>
          <form
            onSubmit={e => e.preventDefault()}
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: '1fr 200px 200px',
              gap: 0,
              border: '3px solid #000',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 22px', gap: 14 }}>
              <CqSearchGlyph size={20} />
              <input
                defaultValue=""
                placeholder="123 Main St, Detroit, MI 48201"
                style={{
                  flex: 1,
                  height: 72,
                  border: 0,
                  outline: 'none',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: COLORS.fg1,
                  background: 'transparent',
                }}
              />
            </div>
            <button
              type="button"
              style={{
                borderLeft: '2px solid #000',
                background: '#fff',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLORS.fg1,
              }}
            >
              Use my location
            </button>
            <button
              type="submit"
              style={{
                borderLeft: '2px solid #000',
                background: COLORS.blue,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Find my reps →
            </button>
          </form>
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              Try: "1600 Pennsylvania Ave, Washington DC" · "ZIP 11217" · "Brooklyn, NY"
            </span>
            <a
              href="#"
              style={{
                fontSize: 11,
                color: COLORS.blueHv,
                fontFamily: 'var(--font-mono)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Browse without an address →
            </a>
          </div>
        </div>
      </div>

      {/* COVERAGE STRIP — the honest accounting of what we have. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '2px solid #000',
        }}
      >
        {[
          { l: 'Federal officials', v: '535', c: 'House + Senate · 119th' },
          { l: 'State legislators', v: '7,386', c: 'All 50 states · bicameral' },
          { l: 'Bills indexed', v: '6,221', c: '119th Congress · live' },
          { l: 'Cycle filings', v: '$2.1B', c: 'FEC · 2024 cycle' },
          { l: 'Lobbying filings', v: '54K', c: 'Senate LDA · 2024' },
        ].map((s, i) => (
          <div
            key={s.l}
            style={{
              padding: '24px 22px',
              borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
            }}
          >
            <CqStat label={s.l} value={s.v} caption={s.c} size={36} />
          </div>
        ))}
      </div>

      {/* THREE ENTRY PATHS — Aicher-pictogram tiles, no decoration */}
      <div style={{ padding: '40px 56px 32px' }}>
        <CqLabel>Other ways in</CqLabel>
        <div
          style={{
            marginTop: 12,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 0,
            border: '2px solid #000',
          }}
        >
          {[
            {
              eyebrow: 'Bills',
              t: 'Browse the 119th Congress',
              b: 'Every bill, every roll call, every co-sponsor. Plain-language summaries beside the official text.',
              cta: 'See bills →',
            },
            {
              eyebrow: 'States',
              t: 'Pick a state',
              b: 'Federal delegation, state legislature, IIJA receipts. 50 states; territories in pilot.',
              cta: 'See states →',
            },
            {
              eyebrow: 'Money',
              t: 'Follow the contributions',
              b: 'FEC quarterly filings rolled up by member, by industry, by zip. Source-tagged on every datum.',
              cta: 'See finance →',
            },
          ].map((c, i) => (
            <a
              key={c.t}
              href="#"
              style={{
                padding: '28px 26px',
                textDecoration: 'none',
                color: COLORS.fg1,
                borderLeft: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 220,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  background: i === 0 ? COLORS.blue : i === 1 ? COLORS.green : COLORS.red,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <CqLabel>{c.eyebrow}</CqLabel>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                }}
              >
                {c.t}
              </div>
              <p style={{ fontSize: 13, color: COLORS.fg2, margin: 0, lineHeight: 1.5 }}>{c.b}</p>
              <span
                style={{
                  marginTop: 'auto',
                  fontSize: 11,
                  color: COLORS.blueHv,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {c.cta}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* MANIFESTO — the Aicher principle row */}
      <div style={{ padding: '32px 56px 56px' }}>
        <div
          style={{
            background: COLORS.fg1,
            color: '#fff',
            border: '2px solid #000',
            padding: '40px 48px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 56,
          }}
        >
          <div>
            <CqLabel color={COLORS.blue}>The promise</CqLabel>
            <h2
              style={{
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                margin: '10px 0 16px',
                textTransform: 'uppercase',
              }}
            >
              Public record,
              <br />
              made legible.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: '#d1d5db', margin: 0 }}>
              CIV.IQ is a public utility, not a media outlet. Every fact is sourced from a primary
              government record, time-stamped, and scored. We never editorialize. We never recommend
              a candidate. We tell you what was filed.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['No ads', 'Zero advertising. Ever.'],
              ['No signups', 'No accounts. No tracking. No email walls.'],
              ['No editorializing', 'Plain language summaries beside the official text.'],
              ['Confidence on every fact', '0.00–1.00 score · as-of timestamp · methodology link.'],
            ].map(([t, b], i) => (
              <div
                key={t}
                style={{
                  padding: '14px 0',
                  display: 'grid',
                  gridTemplateColumns: '20px 1fr',
                  gap: 14,
                  borderTop: i === 0 ? 0 : `1px solid #374151`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: COLORS.blue,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {t}
                  </div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid #000' }}>
          <CqDisclaimer confidence={0.99}>
            {' '}
            Address lookup uses Census TIGER/Line geocoding (2024). Coverage gaps disclosed at
            civ.iq/methodology.
          </CqDisclaimer>
        </div>
      </div>

      <CqFooter width={1280} />
    </div>
  );
}

// ════════════════════════════════════════════════════
// ADDRESS RESULT — "you live at X → here are your reps"
// ════════════════════════════════════════════════════
function AddressResultPage() {
  const reps = [
    {
      level: 'FEDERAL',
      body: 'U.S. Senate',
      name: 'Charles E. Schumer',
      party: 'd',
      sub: 'Senior Senator · Democratic Leader',
      district: 'NY · Class III',
      initials: 'CS',
      stat: 'Next: Nov 2028',
      conf: 0.99,
    },
    {
      level: 'FEDERAL',
      body: 'U.S. Senate',
      name: 'Kirsten E. Gillibrand',
      party: 'd',
      sub: 'Junior Senator',
      district: 'NY · Class I',
      initials: 'KG',
      stat: 'Next: Nov 2030',
      conf: 0.99,
    },
    {
      level: 'FEDERAL',
      body: 'U.S. House',
      name: 'Hakeem S. Jeffries',
      party: 'd',
      sub: 'House Minority Leader',
      district: 'NY-08',
      initials: 'HJ',
      stat: 'Next: Nov 2026',
      conf: 0.99,
    },
    {
      level: 'STATE',
      body: 'NY Senate',
      name: 'Andrew Gounardes',
      party: 'd',
      sub: 'State Senator · Finance Committee',
      district: 'SD-26',
      initials: 'AG',
      stat: 'Next: Nov 2026',
      conf: 0.96,
    },
    {
      level: 'STATE',
      body: 'NY Assembly',
      name: 'Jo Anne Simon',
      party: 'd',
      sub: 'Assemblymember · Codes Chair',
      district: 'AD-52',
      initials: 'JS',
      stat: 'Next: Nov 2026',
      conf: 0.96,
    },
    {
      level: 'LOCAL',
      body: 'NYC Council',
      name: 'Lincoln Restler',
      party: 'd',
      sub: 'Councilmember · District 33',
      district: 'CD-33',
      initials: 'LR',
      stat: 'Next: Nov 2027',
      conf: 0.88,
    },
    {
      level: 'LOCAL',
      body: 'NYC Mayor',
      name: 'Eric L. Adams',
      party: 'd',
      sub: 'Mayor of New York City',
      district: 'Citywide',
      initials: 'EA',
      stat: 'Next: Nov 2025',
      conf: 0.99,
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Find officials', 'Address result', '7 representatives']}
      crumbRight={[
        <span key="g">Geocoded · 2024 TIGER/Line</span>,
        <span key="t">Apr 26, 2026 · 0.42s</span>,
      ]}
    >
      {/* HERO — what we found */}
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
          <CqLabel>You entered</CqLabel>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              margin: '6px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            55 Hanson Pl, Brooklyn, NY 11217
          </h1>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              Geocoded · confidence 0.99
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              7 representatives found
            </CqChip>
            <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              Federal · State · Local{' '}
              <a href="#" style={asideLinkA}>
                · Change address
              </a>
            </span>
          </div>
        </div>
        <aside style={{ border: '2px solid #000', padding: 18 }}>
          <CqLabel>Your districts</CqLabel>
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
              ['U.S. House', 'NY-08'],
              ['NY State Senate', 'SD-26'],
              ['NY State Assembly', 'AD-52'],
              ['NYC Council', 'CD-33'],
              ['Community Board', 'CB-2'],
              ['Census tract', '36-047-001501'],
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

      {/* GROUPED RESULTS */}
      {['FEDERAL', 'STATE', 'LOCAL'].map(level => (
        <div key={level} style={{ marginTop: 32 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingBottom: 8,
              borderBottom: '2px solid #000',
            }}
          >
            <CqLabel>
              {level} · {reps.filter(r => r.level === level).length}{' '}
              {reps.filter(r => r.level === level).length === 1
                ? 'representative'
                : 'representatives'}
            </CqLabel>
            {level === 'LOCAL' && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: COLORS.amber,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Local coverage · expanding incrementally
              </span>
            )}
          </div>
          {reps
            .filter(r => r.level === level)
            .map((r, i) => (
              <a
                key={r.name}
                href="#"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px 1fr 180px 160px 30px',
                  gap: 18,
                  padding: '18px 0',
                  borderBottom: `1px solid ${COLORS.line}`,
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: COLORS.fg1,
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
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
                      width: 5,
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
                      fontSize: 20,
                    }}
                  >
                    {r.initials}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                    <CqChip variant={r.party} size="sm">
                      {r.party === 'd' ? 'D' : 'R'} · {r.district}
                    </CqChip>
                    <CqLabel>{r.body}</CqLabel>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.fg2, marginTop: 3 }}>{r.sub}</div>
                </div>
                <div>
                  <CqLabel>Election</CqLabel>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      marginTop: 4,
                    }}
                  >
                    {r.stat}
                  </div>
                </div>
                <div>
                  <CqLabel>Confidence</CqLabel>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: r.conf >= 0.95 ? COLORS.green : COLORS.amber,
                      marginTop: 4,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {r.conf.toFixed(2)}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
              </a>
            ))}
        </div>
      ))}

      {/* COVERAGE NOTE */}
      <div
        style={{
          marginTop: 32,
          borderLeft: `6px solid ${COLORS.amber}`,
          background: COLORS.bg2,
          padding: '16px 20px',
        }}
      >
        <CqLabel color={COLORS.amber}>Coverage note</CqLabel>
        <p
          style={{
            fontSize: 13,
            color: COLORS.fg1,
            margin: '8px 0 0',
            lineHeight: 1.55,
            maxWidth: 820,
          }}
        >
          Local coverage (NYC Council, Community Board) is in pilot. Voting records and
          contributions for these positions are partial. Federal and state-level data are complete
          back to 2013.
        </p>
      </div>

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid #000' }}>
        <CqDisclaimer confidence={0.99}>
          {' '}
          Geocoding by Census TIGER/Line 2024. Officials sourced from Congress.gov, OpenStates, and
          NYC Open Data.
        </CqDisclaimer>
      </div>
    </CqPage>
  );
}

const asideLinkA = { color: COLORS.blueHv, textDecoration: 'underline', textUnderlineOffset: 3 };

Object.assign(window, { LandingPage, AddressResultPage });
