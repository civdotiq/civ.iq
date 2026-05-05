// SEARCH ROW VARIANTS — Templates 25-29.
// Five new row variants for the listing routes that the original SearchResults
// didn't cover. Each variant ships inside the existing SearchResults chassis
// (same FacetGroup sidebar, same CqPage, same row pattern) — only the row
// component changes per route.
//
// Row-height rule (from IndustrySectorPage): row body ~36px tall, padding
// 14-18px, top divider 1px between rows, no divider on the first row. Numerics
// tabular. At most one CqSourceTag per row — these are records, not analysis.
//
// All five share a common <VariantPage> wrapper that swaps in the right
// header copy, facets, and row component for the route. That keeps the chassis
// identical to the original Search page and makes it obvious that what's new
// here is the row vocabulary, not the page architecture.

// ── Shared helpers ───────────────────────────────────

function VariantHeader({ kind, label, query, count, sub, hint }) {
  return (
    <div style={{ paddingBottom: 20, borderBottom: '2px solid #000', marginBottom: 24 }}>
      <CqLabel>{label}</CqLabel>
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
        {query}
      </h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <CqChip variant="ink" filled={false} size="sm">
          {count} {kind}
        </CqChip>
        {sub && (
          <CqChip variant="info" filled={false} size="sm">
            {sub}
          </CqChip>
        )}
        {hint && (
          <span style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

function VariantSidebar({ facets, selected = 0 }) {
  return (
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
          Filter by
        </div>
        {facets.map((f, i) => {
          const active = i === selected;
          return (
            <div
              key={f[0]}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 14px',
                background: active ? COLORS.bg2 : '#fff',
                borderTop: i === 0 ? 0 : `1px solid ${COLORS.line}`,
                borderLeft: active ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                fontFamily: 'var(--font-primary)',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: COLORS.fg1,
              }}
            >
              <span>{f[1]}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: COLORS.fg3 }}>
                {f[2]}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function VariantFacetCard({ groups }) {
  return (
    <div style={{ marginTop: 14, border: '2px solid #000', padding: '14px' }}>
      <CqLabel>Refine</CqLabel>
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(g => (
          <div key={g.title}>
            <CqLabel color={COLORS.fg2}>{g.title}</CqLabel>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column' }}>
              {g.options.map(([l, n]) => (
                <div
                  key={l}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    padding: '5px 0',
                    color: COLORS.fg1,
                  }}
                >
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        border: '2px solid #000',
                        display: 'inline-block',
                      }}
                    />
                    {l}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.fg3 }}>
                    {n}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VariantPagination({ start, end, total }) {
  return (
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
        Showing {start}–{end} of {total}
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
  );
}

// ── Outline-map placeholder — used by district + state rows ──
// Strict Aicher: stripe-fill placeholder, 2px frame, monospace caption. We
// don't draw the real district outlines (would require shapefile geometry);
// we mark the slot.
function CqOutlineMap({ code, w = 64, h = 48, accent = COLORS.blue }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        position: 'relative',
        border: '2px solid #000',
        background: '#fff',
        backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 6px, ${COLORS.bg3} 6px 12px)`,
        flexShrink: 0,
      }}
    >
      <div
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: COLORS.fg2,
          letterSpacing: '-0.01em',
        }}
      >
        {code}
      </div>
    </div>
  );
}

// Tiny inline portrait — 32 or 40px, used inside row stacks (state senators).
function CqMiniPortrait({ name, party = 'd', size = 32 }) {
  const initials = name
    .split(' ')
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  const stripe = party === 'd' ? COLORS.green : party === 'r' ? COLORS.red : COLORS.vlau;
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        position: 'relative',
        border: '1.5px solid #000',
        background: '#fff',
        flexShrink: 0,
        backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 4px, ${COLORS.bg3} 4px 8px)`,
      }}
    >
      <div
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: stripe }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-primary)',
          fontWeight: 700,
          fontSize: size * 0.34,
          color: COLORS.fg1,
        }}
      >
        {initials}
      </div>
    </div>
  );
}

// House-seat split bar — used in the StateResultRow.
function CqHouseSplit({ d, r, i = 0 }) {
  const total = d + r + i;
  const dPct = (d / total) * 100;
  const rPct = (r / total) * 100;
  const iPct = (i / total) * 100;
  return (
    <div>
      <div style={{ height: 10, display: 'flex', border: '1px solid #000' }}>
        <div style={{ width: `${dPct}%`, background: COLORS.green }} />
        <div style={{ width: `${rPct}%`, background: COLORS.red }} />
        {i > 0 && <div style={{ width: `${iPct}%`, background: COLORS.vlau }} />}
      </div>
      <div
        style={{
          marginTop: 4,
          display: 'flex',
          gap: 10,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: COLORS.fg3,
        }}
      >
        <span>
          <span style={{ color: COLORS.green, fontWeight: 700 }}>D {d}</span>
        </span>
        <span>
          <span style={{ color: COLORS.red, fontWeight: 700 }}>R {r}</span>
        </span>
        {i > 0 && (
          <span>
            <span style={{ color: COLORS.vlau, fontWeight: 700 }}>I {i}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ── Template 25 · DistrictResultRow ─────────────────
// Drives /districts, /state-districts. Per-row metadata grid:
// district code + state, current rep portrait + name + party + chamber,
// population, PVI, median income, outline-map thumbnail.

function DistrictResultRow({ d, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 220px 1fr 90px 90px 100px 24px',
        gap: 14,
        padding: '14px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {d.code}
        </span>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          {d.state}
        </div>
      </div>
      <CqOutlineMap
        code={d.code}
        w={80}
        h={48}
        accent={d.party === 'd' ? COLORS.green : d.party === 'r' ? COLORS.red : COLORS.vlau}
      />
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <CqMiniPortrait name={d.rep} party={d.party} size={36} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{d.rep}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
            <CqChip variant={d.party} size="sm">
              {d.party === 'd' ? 'D' : 'R'} · House
            </CqChip>
            <span style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
              Since {d.since}
            </span>
          </div>
        </div>
      </div>
      <div>
        <CqLabel>Pop.</CqLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {d.pop}
        </div>
      </div>
      <div>
        <CqLabel>PVI</CqLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: d.pvi.startsWith('D')
              ? COLORS.green
              : d.pvi.startsWith('R')
                ? COLORS.red
                : COLORS.fg2,
            fontFamily: 'var(--font-mono)',
            marginTop: 3,
          }}
        >
          {d.pvi}
        </div>
      </div>
      <div>
        <CqLabel>Med. inc.</CqLabel>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {d.income}
        </div>
      </div>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

// ── Template 26 · StateResultRow ────────────────────
// Drives /states. State name + abbrev, capital, governor portrait + party,
// US Senators (2 portraits), House seats by party split, population.

function StateResultRow({ s, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '74px 200px 200px 110px 1fr 80px 24px',
        gap: 14,
        padding: '16px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div
        style={{
          width: 74,
          height: 56,
          border: '2px solid #000',
          background: COLORS.bg2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        {s.abbr}
      </div>
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          {s.name}
        </div>
        <div
          style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 3 }}
        >
          Capital: {s.capital}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <CqMiniPortrait name={s.gov} party={s.govParty} size={36} />
        <div>
          <CqLabel>Governor</CqLabel>
          <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>{s.gov}</div>
          <CqChip variant={s.govParty} size="sm">
            {s.govParty === 'd' ? 'D' : 'R'}
          </CqChip>
        </div>
      </div>
      <div>
        <CqLabel>Senators</CqLabel>
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {s.senators.map((sen, i) => (
            <CqMiniPortrait key={i} name={sen.name} party={sen.party} size={32} />
          ))}
        </div>
      </div>
      <div>
        <CqLabel>House delegation</CqLabel>
        <div style={{ marginTop: 4 }}>
          <CqHouseSplit d={s.house.d} r={s.house.r} i={s.house.i || 0} />
        </div>
      </div>
      <div>
        <CqLabel>Pop.</CqLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {s.pop}
        </div>
      </div>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

// ── Template 27 · SectorResultRow ───────────────────
// Drives /industry. Sector name, NAICS code, $ total contributions this cycle,
// top 3 PACs, top 3 recipients, # lobbying registrants.

function SectorResultRow({ s, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 110px 1fr 100px 24px',
        gap: 16,
        padding: '16px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'flex-start',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <CqLabel>Sector</CqLabel>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: COLORS.fg3,
              border: `1px solid ${COLORS.line}`,
              padding: '1px 5px',
            }}
          >
            NAICS {s.naics}
          </span>
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            marginTop: 2,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          {s.name}
        </div>
        <div
          style={{ fontSize: 11, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 4 }}
        >
          {s.lobbyists} lobbying registrants · 2025–26 cycle
        </div>
      </div>
      <div>
        <CqLabel>2025–26</CqLabel>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLORS.blue,
            lineHeight: 1.05,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            marginTop: 3,
          }}
        >
          {s.total}
        </div>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          Contributions
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <CqLabel>Top PACs</CqLabel>
          <ol
            style={{
              margin: '4px 0 0',
              padding: 0,
              listStyle: 'none',
              fontSize: 11,
              color: COLORS.fg2,
              lineHeight: 1.5,
            }}
          >
            {s.topPacs.map((p, i) => (
              <li key={p} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: COLORS.fg4, fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <CqLabel>Top recipients</CqLabel>
          <ol
            style={{
              margin: '4px 0 0',
              padding: 0,
              listStyle: 'none',
              fontSize: 11,
              color: COLORS.fg2,
              lineHeight: 1.5,
            }}
          >
            {s.topRecipients.map((r, i) => (
              <li key={r.name} style={{ display: 'flex', gap: 6 }}>
                <span style={{ color: COLORS.fg4, fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>
                <span>
                  {r.name}{' '}
                  <span
                    style={{ color: r.party === 'd' ? COLORS.green : COLORS.red, fontWeight: 700 }}
                  >
                    · {r.party === 'd' ? 'D' : 'R'}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div>
        <CqLabel>Registrants</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {s.lobbyists}
        </div>
      </div>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

// ── Template 28 · RegulationResultRow ───────────────
// Drives /regulations. Agency, title, document number, comment status (open/
// closed) + close date, # comments, stage (proposed/final).

function RegulationResultRow({ r, first }) {
  const isOpen = r.commentStatus === 'open';
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '110px 1fr 130px 110px 100px 24px',
        gap: 14,
        padding: '14px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div>
        <CqLabel>Agency</CqLabel>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            marginTop: 3,
          }}
        >
          {r.agency}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.title}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: COLORS.fg3,
              border: `1px solid ${COLORS.line}`,
              padding: '1px 5px',
            }}
          >
            {r.docNumber}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.fg3 }}>
            {r.cfr}
          </span>
        </div>
      </div>
      <CqChip variant={r.stage === 'final' ? 'd' : 'info'} filled={r.stage === 'final'} size="sm">
        {r.stage === 'final' ? 'Final rule' : r.stage === 'proposed' ? 'Proposed' : 'Notice'}
      </CqChip>
      <div>
        <CqLabel>Comments</CqLabel>
        <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginTop: 3 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              color: isOpen ? COLORS.blue : COLORS.fg2,
            }}
          >
            {r.commentCount}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: isOpen ? COLORS.blue : COLORS.fg3,
              fontWeight: 700,
            }}
          >
            {isOpen ? '· OPEN' : '· CLOSED'}
          </span>
        </div>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          {isOpen ? 'Closes ' : 'Closed '}
          {r.closeDate}
        </div>
      </div>
      <div>
        <CqLabel>Posted</CqLabel>
        <div
          style={{ fontSize: 12, color: COLORS.fg2, fontFamily: 'var(--font-mono)', marginTop: 3 }}
        >
          {r.posted}
        </div>
      </div>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

// ── Template 29 · TopicResultRow ────────────────────
// Drives /topics (the index above the 13 IssueTopicPage children).
// Topic name, 1-line plain reading, # bills this congress, # regulations,
// top 3 sponsoring reps, total spend in topic.

function TopicResultRow({ t, first }) {
  return (
    <a
      href="#"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 80px 220px 110px 24px',
        gap: 16,
        padding: '18px 0',
        borderTop: first ? 0 : `1px solid ${COLORS.line}`,
        alignItems: 'center',
        textDecoration: 'none',
        color: COLORS.fg1,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          {t.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: COLORS.fg2,
            lineHeight: 1.45,
            marginTop: 4,
            maxWidth: 540,
          }}
        >
          {t.reading}
        </div>
      </div>
      <div>
        <CqLabel>Bills</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {t.bills}
        </div>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          119th Congr.
        </div>
      </div>
      <div>
        <CqLabel>Regs.</CqLabel>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
          }}
        >
          {t.regs}
        </div>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          Active
        </div>
      </div>
      <div>
        <CqLabel>Top sponsors</CqLabel>
        <div style={{ display: 'flex', gap: 6, marginTop: 5, alignItems: 'center' }}>
          {t.sponsors.map((s, i) => (
            <CqMiniPortrait key={i} name={s.name} party={s.party} size={30} />
          ))}
          <span
            style={{
              fontSize: 10,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginLeft: 4,
              lineHeight: 1.3,
            }}
          >
            {t.sponsors.map(s => s.short).join(' · ')}
          </span>
        </div>
      </div>
      <div>
        <CqLabel>Topic spend</CqLabel>
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: COLORS.blue,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: 3,
            letterSpacing: '-0.01em',
          }}
        >
          {t.spend}
        </div>
      </div>
      <span style={{ fontSize: 18, color: COLORS.fg3, textAlign: 'right' }}>→</span>
    </a>
  );
}

// ── Empty states (per variant — designed) ───────────

function VariantEmptyState({ kind, message, hint }) {
  return (
    <div
      style={{
        border: '2px solid #000',
        padding: '36px 28px',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      <CqLabel>No results</CqLabel>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
        }}
      >
        {message}
      </div>
      {hint && (
        <div
          style={{ fontSize: 12, color: COLORS.fg2, lineHeight: 1.5, maxWidth: 480, marginTop: 4 }}
        >
          {hint}
        </div>
      )}
      <a
        href="#"
        style={{
          marginTop: 8,
          fontSize: 11,
          color: COLORS.blueHv,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        Reset filters →
      </a>
    </div>
  );
}

// ── Page wrappers — one per variant ─────────────────

function DistrictListingPage() {
  const districts = [
    {
      code: 'NY-08',
      state: 'New York',
      rep: 'Hakeem S. Jeffries',
      party: 'd',
      since: 2013,
      pop: '776,971',
      pvi: 'D+33',
      income: '$71,840',
    },
    {
      code: 'OH-09',
      state: 'Ohio',
      rep: 'Marcy Kaptur',
      party: 'd',
      since: 1983,
      pop: '781,422',
      pvi: 'R+3',
      income: '$58,210',
    },
    {
      code: 'CA-12',
      state: 'California',
      rep: 'Nancy Pelosi',
      party: 'd',
      since: 1987,
      pop: '770,406',
      pvi: 'D+37',
      income: '$133,260',
    },
    {
      code: 'TX-23',
      state: 'Texas',
      rep: 'Tony Gonzales',
      party: 'r',
      since: 2021,
      pop: '794,116',
      pvi: 'R+3',
      income: '$60,470',
    },
    {
      code: 'FL-26',
      state: 'Florida',
      rep: 'Mario Diaz-Balart',
      party: 'r',
      since: 2003,
      pop: '772,838',
      pvi: 'R+8',
      income: '$62,950',
    },
    {
      code: 'PA-07',
      state: 'Pennsylvania',
      rep: 'Susan Wild',
      party: 'd',
      since: 2019,
      pop: '764,865',
      pvi: 'EVEN',
      income: '$67,490',
    },
    {
      code: 'WI-03',
      state: 'Wisconsin',
      rep: 'Derrick Van Orden',
      party: 'r',
      since: 2023,
      pop: '736,715',
      pvi: 'R+4',
      income: '$58,910',
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Districts', 'Federal house', '435 districts']}
      crumbRight={[
        <span key="t">Listing · 0.09s</span>,
        <span key="i">Indexed Apr 26, 2026 · Census + Cook PVI</span>,
      ]}
    >
      <VariantHeader
        kind="results"
        label="Browse"
        query="Federal House districts"
        count="435"
        sub="119th Congress"
        hint="Census 2020 reapportionment · Cook PVI as of Apr 2025"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <VariantSidebar
            facets={[
              ['all', 'All districts', 435],
              ['safe-d', 'Safe D (D+15+)', 122],
              ['safe-r', 'Safe R (R+15+)', 138],
              ['comp', 'Competitive', 27],
              ['vacant', 'Vacant', 0],
            ]}
            selected={0}
          />
          <VariantFacetCard
            groups={[
              {
                title: 'State',
                options: [
                  ['New York', 26],
                  ['California', 52],
                  ['Texas', 38],
                  ['Florida', 28],
                ],
              },
              {
                title: 'Party',
                options: [
                  ['Democrat', 213],
                  ['Republican', 220],
                  ['Vacant', 2],
                ],
              },
              {
                title: 'Incumbent tenure',
                options: [
                  ['First term', 47],
                  ['10+ years', 184],
                ],
              },
            ]}
          />
        </div>

        <div>
          <SectionHead
            label={`Districts · ${districts.length} of 435 shown`}
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
                Sort: District code ▾
              </span>
            }
          />
          {districts.map((d, i) => (
            <DistrictResultRow key={d.code} d={d} first={i === 0} />
          ))}

          <VariantPagination start={1} end={districts.length} total={435} />

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.97}>
              {' '}
              District boundaries from 2022 redistricting. PVI from Cook Political Report. Median
              income from ACS 5-year estimates.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

function StateListingPage() {
  const states = [
    {
      abbr: 'NY',
      name: 'New York',
      capital: 'Albany',
      gov: 'Kathy Hochul',
      govParty: 'd',
      senators: [
        { name: 'Chuck Schumer', party: 'd' },
        { name: 'Kirsten Gillibrand', party: 'd' },
      ],
      house: { d: 19, r: 7 },
      pop: '19.57M',
    },
    {
      abbr: 'TX',
      name: 'Texas',
      capital: 'Austin',
      gov: 'Greg Abbott',
      govParty: 'r',
      senators: [
        { name: 'John Cornyn', party: 'r' },
        { name: 'Ted Cruz', party: 'r' },
      ],
      house: { d: 13, r: 25 },
      pop: '30.50M',
    },
    {
      abbr: 'WI',
      name: 'Wisconsin',
      capital: 'Madison',
      gov: 'Tony Evers',
      govParty: 'd',
      senators: [
        { name: 'Tammy Baldwin', party: 'd' },
        { name: 'Ron Johnson', party: 'r' },
      ],
      house: { d: 2, r: 6 },
      pop: '5.91M',
    },
    {
      abbr: 'CA',
      name: 'California',
      capital: 'Sacramento',
      gov: 'Gavin Newsom',
      govParty: 'd',
      senators: [
        { name: 'Alex Padilla', party: 'd' },
        { name: 'Adam Schiff', party: 'd' },
      ],
      house: { d: 43, r: 9 },
      pop: '38.97M',
    },
    {
      abbr: 'AK',
      name: 'Alaska',
      capital: 'Juneau',
      gov: 'Mike Dunleavy',
      govParty: 'r',
      senators: [
        { name: 'Lisa Murkowski', party: 'r' },
        { name: 'Dan Sullivan', party: 'r' },
      ],
      house: { d: 0, r: 1 },
      pop: '0.73M',
    },
    {
      abbr: 'PA',
      name: 'Pennsylvania',
      capital: 'Harrisburg',
      gov: 'Josh Shapiro',
      govParty: 'd',
      senators: [
        { name: 'Bob Casey', party: 'd' },
        { name: 'John Fetterman', party: 'd' },
      ],
      house: { d: 8, r: 9 },
      pop: '12.97M',
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="states"
      crumbs={['States', 'All 50 + DC', '51 entities']}
      crumbRight={[
        <span key="t">Listing · 0.07s</span>,
        <span key="i">Census + Congress.gov + state portals</span>,
      ]}
    >
      <VariantHeader
        kind="results"
        label="Browse"
        query="States and territories"
        count="51"
        sub="50 states + DC"
        hint="Federal delegation + governor + capital, drawn from Census ACS + Congress.gov"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <VariantSidebar
            facets={[
              ['all', 'All states', 51],
              ['trifecta-d', 'D trifecta', 17],
              ['trifecta-r', 'R trifecta', 23],
              ['split', 'Split control', 10],
              ['territory', 'Territories', 1],
            ]}
            selected={0}
          />
          <VariantFacetCard
            groups={[
              {
                title: 'Region',
                options: [
                  ['Northeast', 9],
                  ['Midwest', 12],
                  ['South', 16],
                  ['West', 13],
                ],
              },
              {
                title: 'Population',
                options: [
                  ['10M+', 9],
                  ['1-10M', 30],
                  ['<1M', 11],
                ],
              },
              {
                title: 'Senate split',
                options: [
                  ['Both D', 17],
                  ['Both R', 22],
                  ['Split', 11],
                ],
              },
            ]}
          />
        </div>

        <div>
          <SectionHead
            label={`States · ${states.length} of 51 shown`}
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
                Sort: Population ▾
              </span>
            }
          />
          {states.map((s, i) => (
            <StateResultRow key={s.abbr} s={s} first={i === 0} />
          ))}

          <VariantPagination start={1} end={states.length} total={51} />

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.98}>
              {' '}
              Population from US Census 2024 estimates. House delegations as of 119th Congress,
              post-2024 election.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

function SectorListingPage() {
  const sectors = [
    {
      name: 'Real Estate',
      naics: '531',
      total: '$184.2M',
      lobbyists: 412,
      topPacs: ['NAR PAC', 'NMHC PAC', 'Realogy PAC'],
      topRecipients: [
        { name: 'Schumer (NY)', party: 'd' },
        { name: 'Tillis (NC)', party: 'r' },
        { name: 'Cortez Masto (NV)', party: 'd' },
      ],
    },
    {
      name: 'Energy & Natural Resources',
      naics: '211',
      total: '$226.9M',
      lobbyists: 678,
      topPacs: ['ExxonMobil PAC', 'Koch Industries PAC', 'API'],
      topRecipients: [
        { name: 'Manchin III (WV)', party: 'd' },
        { name: 'Cruz (TX)', party: 'r' },
        { name: 'Murkowski (AK)', party: 'r' },
      ],
    },
    {
      name: 'Tech / Communications',
      naics: '517',
      total: '$308.4M',
      lobbyists: 891,
      topPacs: ['Alphabet NetPAC', 'Meta PAC', 'Microsoft PAC'],
      topRecipients: [
        { name: 'Padilla (CA)', party: 'd' },
        { name: 'Warner (VA)', party: 'd' },
        { name: 'Cruz (TX)', party: 'r' },
      ],
    },
    {
      name: 'Health / Pharma',
      naics: '325',
      total: '$372.1M',
      lobbyists: 1422,
      topPacs: ['PhRMA', 'AHA PAC', 'AdvaMed'],
      topRecipients: [
        { name: 'Cassidy (LA)', party: 'r' },
        { name: 'Bennet (CO)', party: 'd' },
        { name: 'Tillis (NC)', party: 'r' },
      ],
    },
    {
      name: 'Finance / Insurance',
      naics: '521',
      total: '$294.7M',
      lobbyists: 1108,
      topPacs: ['ICBA PAC', 'ABA PAC', 'NAIFA'],
      topRecipients: [
        { name: 'Schumer (NY)', party: 'd' },
        { name: 'Scott (SC)', party: 'r' },
        { name: 'Warner (VA)', party: 'd' },
      ],
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="find"
      crumbs={['Industries', '23 sectors', '$2.1B tracked']}
      crumbRight={[
        <span key="t">Listing · 0.11s</span>,
        <span key="i">FEC + Senate LDA + OpenSecrets · 2025–26 cycle</span>,
      ]}
    >
      <VariantHeader
        kind="sectors"
        label="Browse"
        query="Industries and sectors"
        count="23"
        sub="2025–26 cycle"
        hint="NAICS-coded sectors, joining FEC contributions to Senate LDA registrants"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <VariantSidebar
            facets={[
              ['all', 'All sectors', 23],
              ['fin', 'Finance', 3],
              ['health', 'Healthcare', 4],
              ['energy', 'Energy', 3],
              ['tech', 'Tech + media', 3],
              ['real', 'Real estate', 2],
            ]}
            selected={0}
          />
          <VariantFacetCard
            groups={[
              {
                title: 'Spend tier',
                options: [
                  ['$300M+', 4],
                  ['$100–300M', 9],
                  ['Under $100M', 10],
                ],
              },
              {
                title: 'Registrant count',
                options: [
                  ['1000+', 6],
                  ['250–1000', 11],
                ],
              },
              {
                title: 'Cycle',
                options: [
                  ['2025–26', 23],
                  ['2023–24', 23],
                ],
              },
            ]}
          />
        </div>

        <div>
          <SectionHead
            label={`Sectors · ${sectors.length} of 23 shown`}
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
                Sort: Total contributions ▾
              </span>
            }
          />
          {sectors.map((s, i) => (
            <SectorResultRow key={s.name} s={s} first={i === 0} />
          ))}

          <VariantPagination start={1} end={sectors.length} total={23} />

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.91}>
              {' '}
              Sector totals aggregate FEC committee filings on the NAICS code. Recipient lists are
              top-of-cycle to date and shift between filings.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

function RegulationListingPage() {
  const regs = [
    {
      agency: 'EPA',
      title: 'Clean water act section 404 nationwide permits',
      docNumber: 'EPA-HQ-OW-2025-0312',
      cfr: '40 CFR 232',
      stage: 'proposed',
      commentStatus: 'open',
      commentCount: '4,217',
      closeDate: 'Jun 14, 2026',
      posted: 'Mar 31, 2026',
    },
    {
      agency: 'SEC',
      title: 'Climate-related disclosures for investors',
      docNumber: 'S7-10-22',
      cfr: '17 CFR 229',
      stage: 'final',
      commentStatus: 'closed',
      commentCount: '24,883',
      closeDate: 'Apr 17, 2024',
      posted: 'Mar 6, 2024',
    },
    {
      agency: 'CFPB',
      title: 'Overdraft lending; very large financial institutions',
      docNumber: 'CFPB-2024-0002',
      cfr: '12 CFR 1026',
      stage: 'final',
      commentStatus: 'closed',
      commentCount: '45,201',
      closeDate: 'Apr 1, 2024',
      posted: 'Jan 17, 2024',
    },
    {
      agency: 'EPA',
      title: 'Methane emissions from oil and gas sector',
      docNumber: 'EPA-HQ-OAR-2021-0317',
      cfr: '40 CFR 60',
      stage: 'final',
      commentStatus: 'closed',
      commentCount: '517,890',
      closeDate: 'Feb 13, 2024',
      posted: 'Dec 2, 2023',
    },
    {
      agency: 'FTC',
      title: 'Non-compete clause rule',
      docNumber: 'FTC-2023-0007',
      cfr: '16 CFR 910',
      stage: 'proposed',
      commentStatus: 'open',
      commentCount: '26,810',
      closeDate: 'May 22, 2026',
      posted: 'Apr 12, 2026',
    },
    {
      agency: 'DOL',
      title:
        'Defining and delimiting the exemptions for executive, administrative, professional employees',
      docNumber: 'RIN 1235-AA39',
      cfr: '29 CFR 541',
      stage: 'final',
      commentStatus: 'closed',
      commentCount: '33,207',
      closeDate: 'Nov 7, 2023',
      posted: 'Sep 8, 2023',
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Regulations', 'Federal Register', '23,402 active dockets']}
      crumbRight={[
        <span key="t">Listing · 0.13s</span>,
        <span key="i">Federal Register · regulations.gov · 4 hrs ago</span>,
      ]}
    >
      <VariantHeader
        kind="results"
        label="Browse"
        query="Regulations and rulemaking"
        count="23,402"
        sub="Open + recent"
        hint="Public-comment dockets across 19 agencies; status from regulations.gov"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <VariantSidebar
            facets={[
              ['all', 'All regulations', 23402],
              ['open', 'Open for comment', 812],
              ['final', 'Final rule', 14207],
              ['prop', 'Proposed', 3491],
              ['notice', 'Notice', 4892],
            ]}
            selected={1}
          />
          <VariantFacetCard
            groups={[
              {
                title: 'Agency',
                options: [
                  ['EPA', 1842],
                  ['SEC', 612],
                  ['CFPB', 247],
                  ['DOL', 988],
                ],
              },
              {
                title: 'Stage',
                options: [
                  ['Proposed', 3491],
                  ['Final', 14207],
                ],
              },
              {
                title: 'Comments',
                options: [
                  ['10k+', 412],
                  ['1-10k', 2104],
                ],
              },
            ]}
          />
        </div>

        <div>
          <SectionHead
            label={`Regulations · ${regs.length} of 23,402 shown`}
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
                Sort: Recent activity ▾
              </span>
            }
          />
          {regs.map((r, i) => (
            <RegulationResultRow key={r.docNumber} r={r} first={i === 0} />
          ))}

          <VariantPagination start={1} end={regs.length} total={23402} />

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.96}>
              {' '}
              Docket metadata mirrored from regulations.gov; comment counts may lag the source by up
              to 4 hours.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

function TopicListingPage() {
  const topics = [
    {
      name: 'Housing',
      reading:
        'Federal housing programs, mortgage policy, and tenant protections — what gets built, who can buy, and who pays.',
      bills: 47,
      regs: 12,
      sponsors: [
        { name: 'Maxine Waters', short: 'Waters', party: 'd' },
        { name: 'Patrick McHenry', short: 'McHenry', party: 'r' },
        { name: 'Sherrod Brown', short: 'Brown', party: 'd' },
      ],
      spend: '$48.8B',
    },
    {
      name: 'Healthcare',
      reading:
        'Medicare, Medicaid, ACA marketplaces, drug pricing, and federal research. Coverage, cost, and what it pays for.',
      bills: 184,
      regs: 41,
      sponsors: [
        { name: 'Bernie Sanders', short: 'Sanders', party: 'd' },
        { name: 'Bill Cassidy', short: 'Cassidy', party: 'r' },
        { name: 'Kim Schrier', short: 'Schrier', party: 'd' },
      ],
      spend: '$1.71T',
    },
    {
      name: 'Climate',
      reading:
        'Greenhouse gas regulation, clean-energy investment, and adaptation funding. From IRA tax credits to Clean Air Act enforcement.',
      bills: 92,
      regs: 28,
      sponsors: [
        { name: 'Sheldon Whitehouse', short: 'Whitehouse', party: 'd' },
        { name: 'Lisa Murkowski', short: 'Murkowski', party: 'r' },
        { name: 'Frank Pallone', short: 'Pallone', party: 'd' },
      ],
      spend: '$369B',
    },
    {
      name: 'Immigration',
      reading:
        'Visas, asylum, border enforcement, and pathways to status. The most politically saturated topic; least incrementalist.',
      bills: 138,
      regs: 19,
      sponsors: [
        { name: 'Jim Jordan', short: 'Jordan', party: 'r' },
        { name: 'Pramila Jayapal', short: 'Jayapal', party: 'd' },
        { name: 'Ted Cruz', short: 'Cruz', party: 'r' },
      ],
      spend: '$28.4B',
    },
    {
      name: 'Defense',
      reading:
        'NDAA, foreign military aid, base realignment, and procurement. The largest discretionary line in the federal budget.',
      bills: 67,
      regs: 9,
      sponsors: [
        { name: 'Adam Smith', short: 'Smith', party: 'd' },
        { name: 'Mike Rogers', short: 'Rogers', party: 'r' },
        { name: 'Roger Wicker', short: 'Wicker', party: 'r' },
      ],
      spend: '$886B',
    },
  ];
  return (
    <CqPage
      width={1280}
      currentNav="bills"
      crumbs={['Topics', 'Issue index', '13 topics']}
      crumbRight={[
        <span key="t">Listing · 0.06s</span>,
        <span key="i">Bills + regulations + USASpending · cross-cut</span>,
      ]}
    >
      <VariantHeader
        kind="topics"
        label="Browse"
        query="Issues and topics"
        count="13"
        sub="Cross-cut by policy area"
        hint="Each topic joins bills + regulations + federal spending under a single subject heading"
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          <VariantSidebar
            facets={[
              ['all', 'All topics', 13],
              ['economy', 'Economy + work', 4],
              ['social', 'Social + civil', 3],
              ['env', 'Environment', 2],
              ['security', 'Security + foreign', 4],
            ]}
            selected={0}
          />
          <VariantFacetCard
            groups={[
              {
                title: 'Bill volume',
                options: [
                  ['100+', 4],
                  ['25–100', 6],
                  ['Under 25', 3],
                ],
              },
              {
                title: 'Spend tier',
                options: [
                  ['$500B+', 2],
                  ['$50–500B', 5],
                  ['Under $50B', 6],
                ],
              },
            ]}
          />
        </div>

        <div>
          <SectionHead
            label={`Topics · ${topics.length} of 13 shown`}
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
                Sort: Topic spend ▾
              </span>
            }
          />
          {topics.map((t, i) => (
            <TopicResultRow key={t.name} t={t} first={i === 0} />
          ))}

          {/* Empty state preview — what shows when filters return zero */}
          <div style={{ marginTop: 24 }}>
            <CqLabel>Empty state preview</CqLabel>
            <div style={{ marginTop: 6 }}>
              <VariantEmptyState
                kind="topics"
                message="No topics match these filters"
                hint="Try removing the spend-tier filter or expanding bill volume. The 13 topics are the system's full taxonomy — there is no deeper hierarchy."
              />
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <CqDisclaimer confidence={0.89}>
              {' '}
              Topics are editorial groupings; a single bill can sit in multiple topics. Spend totals
              join USASpending program codes to topic taxonomies.
            </CqDisclaimer>
          </div>
        </div>
      </div>
    </CqPage>
  );
}

// SectionHead is reused from SearchResults — but that's defined in
// SearchResults.jsx scope. Re-define locally so this file is self-contained.
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

Object.assign(window, {
  DistrictResultRow,
  StateResultRow,
  SectorResultRow,
  RegulationResultRow,
  TopicResultRow,
  DistrictListingPage,
  StateListingPage,
  SectorListingPage,
  RegulationListingPage,
  TopicListingPage,
  VariantEmptyState,
  CqOutlineMap,
  CqMiniPortrait,
  CqHouseSplit,
});
