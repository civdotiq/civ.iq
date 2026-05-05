// SEARCH RESULTS — high-traffic entry point.
// Mixed-result page: officials, bills, committees, states. Faceted left rail.
// Visual vocabulary matches profile redesign: black masthead crumb, source rail,
// 5-col stat strip via grouped result cards, square 2px borders.

function SearchResults({ query }) {
  const [filter, setFilter] = React.useState('all');
  const facets = [
    ['all', 'All results', 24],
    ['officials', 'Officials', 8],
    ['bills', 'Bills', 11],
    ['committees', 'Committees', 2],
    ['states', 'State pages', 1],
    ['filings', 'Filings', 2],
  ];
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Search', `"${query}"`, '24 results']}
      crumbRight={[
        <span key="t">Search · 0.18s</span>,
        <span key="i">Indexed Apr 26, 2026 · 19 sources</span>,
      ]}
    >
      {/* QUERY HEADLINE */}
      <div style={{ paddingBottom: 20, borderBottom: '2px solid #000', marginBottom: 24 }}>
        <CqLabel>You searched for</CqLabel>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 12px',
            textTransform: 'uppercase',
          }}
        >
          "{query}"
        </h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <CqChip variant="info" filled={false} size="sm">
            Address parser · No match
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Name match · 1
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            Bill match · 11
          </CqChip>
          <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
            Try a full address for representative lookup →{' '}
            <a href="#" style={asideLink}>
              Use advanced search
            </a>
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        {/* FACET RAIL */}
        <aside>
          <div style={{ border: '2px solid #000', background: '#fff' }}>
            <div
              style={{
                background: COLORS.fg1,
                color: '#fff',
                padding: '10px 14px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Result type
            </div>
            {facets.map((f, i) => {
              const [k, label, n] = f;
              const active = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 14px',
                    background: active ? COLORS.bg2 : '#fff',
                    borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                    borderLeft: active ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-primary)',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: COLORS.fg1,
                    textAlign: 'left',
                  }}
                >
                  <span>{label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 14, border: '2px solid #000', padding: '14px' }}>
            <CqLabel>Filters</CqLabel>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FacetGroup
                title="Chamber"
                options={[
                  ['House', 14],
                  ['Senate', 7],
                  ['Joint', 3],
                ]}
              />
              <FacetGroup
                title="Party"
                options={[
                  ['Democrat', 12],
                  ['Republican', 9],
                  ['Independent', 1],
                ]}
              />
              <FacetGroup
                title="Status"
                options={[
                  ['Became law', 4],
                  ['Active', 5],
                  ['Stalled', 2],
                ]}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              borderLeft: `6px solid ${COLORS.blue}`,
              background: COLORS.bg2,
              padding: '14px 16px',
            }}
          >
            <CqLabel>Did you mean?</CqLabel>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Infrastructure Investment and Jobs Act',
                'Infrastructure Reduction Act',
                'IIJA · H.R. 3684',
              ].map(s => (
                <a
                  key={s}
                  href="#"
                  style={{
                    fontSize: 12,
                    color: COLORS.blueHv,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </aside>

        {/* RESULTS COLUMN */}
        <div>
          {/* Top result — official, bill-style hero card */}
          <SectionHead
            label="Top match · Bill"
            right={
              <a href="#" style={asideLink}>
                3 related results →
              </a>
            }
          />
          <div
            style={{
              border: '2px solid #000',
              display: 'grid',
              gridTemplateColumns: '110px 1fr 220px',
              marginBottom: 28,
            }}
          >
            <div
              style={{
                background: COLORS.bg2,
                borderRight: '2px solid #000',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
                position: 'relative',
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
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: COLORS.fg3,
                  letterSpacing: '0.08em',
                }}
              >
                BILL
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 18,
                  fontWeight: 700,
                  marginTop: 4,
                }}
              >
                H.R. 3684
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: COLORS.fg3,
                  marginTop: 6,
                }}
              >
                117th
              </div>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <CqChip variant="d" size="sm">
                  Became law · 117-58
                </CqChip>
                <CqChip variant="ink" filled={false} size="sm">
                  House
                </CqChip>
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.01em',
                }}
              >
                Infrastructure Investment and Jobs Act
              </div>
              <p style={{ fontSize: 13, color: COLORS.fg2, margin: '8px 0 0', lineHeight: 1.5 }}>
                Funds roads, bridges, rail, broadband, water, and the electric grid. $1.2T over 5
                years. Sponsored by DeFazio (D-OR-04). Final House vote 228–206.
              </p>
            </div>
            <div
              style={{
                padding: '20px 18px',
                borderLeft: `1px solid ${COLORS.line}`,
                background: COLORS.bg2,
              }}
            >
              <CqLabel>Final vote</CqLabel>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: COLORS.green,
                  lineHeight: 1.05,
                  marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                228–206
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: COLORS.fg3,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 4,
                }}
              >
                Nov 5, 2021
              </div>
              <a href="#" style={{ ...asideLink, marginTop: 10 }}>
                View bill →
              </a>
            </div>
          </div>

          {/* Officials */}
          <SectionHead
            label="Officials · 1"
            right={
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: COLORS.fg3,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Sorted by relevance
              </span>
            }
          />
          {[
            {
              id: 'jeffries',
              name: 'Hakeem S. Jeffries',
              role: 'U.S. Representative',
              district: 'NY-08',
              party: 'd',
              since: 2013,
              vote: 'Yea on H.R. 3684',
              funding: '$3.42M',
              match: 'Voted on bill',
            },
          ].map((o, i) => (
            <ResultRow key={o.id} kind="official" o={o} first={i === 0} />
          ))}

          {/* Bills */}
          <div style={{ height: 24 }} />
          <SectionHead
            label="Bills · 11"
            right={
              <a href="#" style={asideLink}>
                View all bills →
              </a>
            }
          />
          {[
            {
              n: 'H.R. 3684',
              t: 'Infrastructure Investment and Jobs Act',
              st: 'Became law',
              d: 'Jun 4, 2021',
              variant: 'd',
              match: 'Title match · "infrastructure"',
            },
            {
              n: 'S. 2377',
              t: 'Surface Transportation Investment Act of 2021',
              st: 'Incorporated',
              d: 'Jul 21, 2021',
              variant: 'info',
              match: 'Companion bill',
            },
            {
              n: 'H.R. 4521',
              t: 'America COMPETES Act',
              st: 'Became law',
              d: 'Jul 19, 2021',
              variant: 'd',
              match: 'Subject · Infrastructure',
            },
            {
              n: 'H.R. 1216',
              t: 'Federal Permitting Reform Act',
              st: 'Failed',
              d: 'Mar 22, 2024',
              variant: 'r',
              match: 'Subject · Infrastructure',
            },
            {
              n: 'H.R. 7024',
              t: 'Tax Relief for American Families Act',
              st: 'Stalled',
              d: 'Jan 31, 2024',
              variant: 'warn',
              match: 'Subject · Infrastructure tax credits',
            },
          ].map((b, i) => (
            <BillResultRow key={b.n} b={b} first={i === 0} />
          ))}

          {/* Committees */}
          <div style={{ height: 24 }} />
          <SectionHead label="Committees · 2" />
          {[
            {
              name: 'House Transportation & Infrastructure',
              members: 67,
              chair: 'Sam Graves (R-MO-06)',
              match: 'Reported H.R. 3684',
            },
            {
              name: 'Senate Environment & Public Works',
              members: 19,
              chair: 'Shelley Moore Capito (R-WV)',
              match: 'Subject jurisdiction',
            },
          ].map((c, i) => (
            <CommitteeResultRow key={c.name} c={c} first={i === 0} />
          ))}

          {/* State */}
          <div style={{ height: 24 }} />
          <SectionHead label="State pages · 1" />
          <a
            href="#"
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 160px',
              border: '2px solid #000',
              textDecoration: 'none',
              color: COLORS.fg1,
              background: '#fff',
            }}
          >
            <div
              style={{
                background: COLORS.bg2,
                padding: '20px 16px',
                borderRight: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
              }}
            >
              NY
            </div>
            <div style={{ padding: '18px 22px' }}>
              <CqLabel>State overview</CqLabel>
              <div
                style={{ fontSize: 22, fontWeight: 700, marginTop: 4, textTransform: 'uppercase' }}
              >
                New York
              </div>
              <p style={{ fontSize: 12, color: COLORS.fg2, margin: '6px 0 0' }}>
                26 House districts · 2 Senate seats · 213 state legislators · IIJA recipients
                tracked under USASpending.
              </p>
            </div>
            <div
              style={{
                padding: '18px 18px',
                borderLeft: `1px solid ${COLORS.line}`,
                background: COLORS.bg2,
              }}
            >
              <CqLabel>IIJA spending</CqLabel>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.blue,
                  marginTop: 4,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}
              >
                $23.8B
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.fg3,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                USASpending · 2021–26
              </div>
            </div>
          </a>

          {/* Pagination */}
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 0',
              borderTop: '2px solid #000',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: COLORS.fg3,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Showing 1–9 of 24
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <CqButton variant="secondary" size="sm">
                ← Prev
              </CqButton>
              <CqButton variant="secondary" size="sm">
                Next →
              </CqButton>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.95}>
              {' '}
              Search index built from Congress.gov + FEC + Senate LDA. Ranking by exact match →
              subject overlap → recency.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

// ── Helpers ──────────────────────────────────────────

function SectionHead({ label, right }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 8,
        marginBottom: 0,
        borderBottom: '2px solid #000',
      }}
    >
      <CqLabel>{label}</CqLabel>
      {right}
    </div>
  );
}

function FacetGroup({ title, options }) {
  return (
    <div>
      <CqLabel color={COLORS.fg2}>{title}</CqLabel>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' }}>
        {options.map(([l, n]) => (
          <label
            key={l}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 12,
              padding: '5px 0',
              cursor: 'pointer',
              color: COLORS.fg1,
            }}
          >
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{ width: 12, height: 12, border: '2px solid #000', display: 'inline-block' }}
              />
              {l}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.fg3 }}>
              {n}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ResultRow({ o, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr 120px 120px 80px',
        gap: 16,
        padding: '18px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
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
            background: COLORS.green,
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
            fontSize: 18,
          }}
        >
          HJ
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <CqChip variant={o.party} size="sm">
            D · {o.district}
          </CqChip>
          <CqLabel>{o.role}</CqLabel>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{o.name}</div>
        <div
          style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          In office since {o.since} · Match: {o.match}
        </div>
      </div>
      <div>
        <CqLabel>This bill</CqLabel>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.green, marginTop: 4 }}>
          {o.vote}
        </div>
      </div>
      <div>
        <CqLabel>Raised 2024</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: COLORS.blue,
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {o.funding}
        </div>
      </div>
      <div style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</div>
    </a>
  );
}

function BillResultRow({ b, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 130px 110px 30px',
        gap: 16,
        padding: '14px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>{b.n}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{b.t}</div>
        <div
          style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          {b.match}
        </div>
      </div>
      <CqChip variant={b.variant} filled={b.variant === 'd' || b.variant === 'r'} size="sm">
        {b.st}
      </CqChip>
      <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>{b.d}</span>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

function CommitteeResultRow({ c, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px 60px 30px',
        gap: 16,
        padding: '14px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</div>
        <div
          style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          {c.match} · Chair: {c.chair}
        </div>
      </div>
      <span style={{ fontSize: 12, color: COLORS.fg2 }}>Chair: {c.chair}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700 }}>
        {c.members}
      </span>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

Object.assign(window, { SearchResults });
