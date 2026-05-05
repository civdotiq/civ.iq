// EMBED MODE — Templates 30-33.
// 4 embed routes for third-party publishers. The handoff didn't address mast-
// less contexts. This canvas defines the chassis variant for embed mode plus
// 3 example panels at three responsive widths (320 / 480 / 640) and 1 print
// template.
//
// What an embed is: a single CIV.IQ panel rendered inside another site's
// chrome. The host site is the masthead. CIV.IQ contributes data + source
// rails + plain reading + attribution mark.
//
// Constraints (from the brief, locked in):
//   - NO CqHeader, CqFooter, breadcrumbs.
//   - YES: 2px borders, source tags, plain readings, party tokens, tabular
//     numerics, confidence + methodology + correlation disclaimer.
//   - Width-responsive: 320 / 480 / 640. Reflow the panel grid; don't shrink
//     type below the system minimum (12px label, 13px body).
//   - Attribution mark: one tag at the bottom — "Data via CIV.IQ" + link out
//     — is the only branding allowed.
//   - Read-only. Only interactive affordance is the click-through to civiq.
//
// Print template (33) is the inverse: same data as DistrictPage, letter-size,
// 2-column, optimized for paper. No interactive elements. Black/white where
// possible.

// ── Embed chassis variant ─────────────────────────────
// CqEmbed — the embed-mode chassis. 2px black frame. Tiny header strip is the
// only branding (one source tag + a small CIV.IQ mark at top-right, both link
// out). Footer strip is the attribution + CqDisclaimer. Body slot in between.

function CqEmbed({
  width = 480,
  source,
  sourceId,
  lastUpdated,
  children,
  confidence = 0.94,
  asof = 'Apr 26, 2026',
}) {
  return (
    <div
      style={{
        width,
        background: '#fff',
        color: COLORS.fg1,
        border: '2px solid #000',
        fontFamily: 'var(--font-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top strip — source provenance only. No CIV.IQ logo here; that's
          reserved for the bottom attribution mark per brief. */}
      <div
        style={{
          padding: '8px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${COLORS.line}`,
          background: COLORS.bg2,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: COLORS.fg3,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          gap: 12,
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 5, height: 5, background: COLORS.blue, flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{source}</span>
          {sourceId && <span style={{ color: COLORS.fg4 }}>· {sourceId}</span>}
        </span>
        <span style={{ color: COLORS.fg4, flexShrink: 0 }}>{lastUpdated}</span>
      </div>

      {/* Body */}
      <div style={{ padding: width <= 320 ? 14 : 18, flex: 1 }}>{children}</div>

      {/* Attribution + disclaimer strip */}
      <div
        style={{
          borderTop: `2px solid #000`,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <a
            href="#"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: COLORS.fg1,
              textDecoration: 'none',
            }}
          >
            <CqLogoMark size={16} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              Data via CIV<span style={{ color: COLORS.red }}>.</span>IQ
            </span>
            <span style={{ fontSize: 18, color: COLORS.fg3 }}>→</span>
          </a>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: COLORS.fg3,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            civdotiq.org
          </span>
        </div>
        <CqDisclaimer confidence={confidence} asof={asof} />
      </div>
    </div>
  );
}

// ── Template 30 · EmbedBill ─────────────────────────
// Drives /embed/bill/[billId]. Sponsor + status + key vote + 1-paragraph
// plain reading. Compact at 480.

function EmbedBill({ width = 480 }) {
  const compact = width <= 320;
  const wide = width >= 640;

  // Top header — bill number, title, status chip
  const header = (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          H.R. 3684
        </span>
        <CqChip variant="d" size="sm">
          Became law · 117-58
        </CqChip>
        <CqChip variant="ink" filled={false} size="sm">
          House
        </CqChip>
      </div>
      <div
        style={{
          fontSize: compact ? 16 : wide ? 22 : 19,
          fontWeight: 700,
          lineHeight: 1.2,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
        }}
      >
        Infrastructure Investment and Jobs Act
      </div>
    </div>
  );

  // Sponsor + final vote — 1 column at 320, 2 at 480+
  const grid = compact ? '1fr' : '1fr 130px';

  return (
    <CqEmbed
      width={width}
      source="Congress.gov"
      sourceId="H.R. 3684 · 117th"
      lastUpdated="Updated 2 days ago"
      confidence={0.97}
    >
      {header}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: grid,
          gap: compact ? 10 : 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            border: `1px solid ${COLORS.line}`,
            background: COLORS.bg2,
          }}
        >
          <CqLabel>Sponsor</CqLabel>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6 }}>
            <CqMiniPortrait name="Peter DeFazio" party="d" size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Peter DeFazio</div>
              <div
                style={{
                  fontSize: 10,
                  color: COLORS.fg3,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                D · OR-04 · House
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            padding: '10px 12px',
            border: `1px solid ${COLORS.line}`,
            background: COLORS.bg2,
          }}
        >
          <CqLabel>Final house vote</CqLabel>
          <div
            style={{
              fontSize: compact ? 22 : 24,
              fontWeight: 700,
              color: COLORS.green,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              marginTop: 4,
              lineHeight: 1.0,
            }}
          >
            228–206
          </div>
          <div
            style={{
              fontSize: 10,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            Nov 5, 2021
          </div>
        </div>
      </div>

      <CqPlainReading>
        {compact
          ? 'Funds roads, bridges, rail, broadband, water, and the electric grid. $1.2T over 5 years. Signed by President Biden.'
          : 'Funds roads, bridges, rail, broadband, water, and the electric grid. $1.2T over 5 years, paid for through unspent COVID relief and crypto reporting. Signed by President Biden on Nov 15, 2021.'}
      </CqPlainReading>
    </CqEmbed>
  );
}

// ── Template 31 · EmbedDistrict ─────────────────────
// Drives /embed/district/[districtId]. District code + current rep portrait +
// 3-stat strip + outline map.

function EmbedDistrict({ width = 480 }) {
  const compact = width <= 320;
  const wide = width >= 640;

  // Stats — at 320 stack vertically; at 480+ run as 3 columns
  const StatCell = ({ label, value, caption }) => (
    <div>
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: compact ? 18 : 20,
          fontWeight: 700,
          lineHeight: 1.05,
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
          marginTop: 3,
        }}
      >
        {value}
      </div>
      {caption && (
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 2 }}
        >
          {caption}
        </div>
      )}
    </div>
  );

  return (
    <CqEmbed
      width={width}
      source="Census + Cook PVI"
      sourceId="NY-08"
      lastUpdated="ACS 2023 5-yr"
      confidence={0.97}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '88px 1fr',
          gap: compact ? 10 : 14,
          marginBottom: 14,
          alignItems: 'center',
        }}
      >
        <CqOutlineMap
          code="NY-08"
          w={compact ? '100%' : 88}
          h={compact ? 80 : 64}
          accent={COLORS.green}
        />
        <div>
          <CqLabel>District</CqLabel>
          <div
            style={{
              fontSize: compact ? 22 : 26,
              fontWeight: 700,
              lineHeight: 1.0,
              letterSpacing: '-0.02em',
              marginTop: 3,
            }}
          >
            NY-08
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}
          >
            Brooklyn, NY · 119th Congr.
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '10px 12px',
          border: `1px solid ${COLORS.line}`,
          background: COLORS.bg2,
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CqMiniPortrait name="Hakeem S. Jeffries" party="d" size={36} />
          <div style={{ minWidth: 0 }}>
            <CqLabel>Current rep</CqLabel>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>
              Hakeem S. Jeffries
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 4,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <CqChip variant="d" size="sm">
                D · NY-08
              </CqChip>
              <span style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)' }}>
                Since 2013
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: 10,
          padding: '10px 12px',
          border: `1px solid ${COLORS.line}`,
        }}
      >
        <StatCell label="Pop." value="776,971" caption="2020 Census" />
        <StatCell
          label="PVI"
          value={<span style={{ color: COLORS.green }}>D+33</span>}
          caption="Cook 2025"
        />
        <StatCell label="Med. inc." value="$71,840" caption="ACS 2023" />
      </div>

      {wide && (
        <div style={{ marginTop: 14 }}>
          <CqPlainReading>
            Brooklyn's 8th district covers parts of Bedford-Stuyvesant, Crown Heights, Brownsville,
            and East New York. One of the most reliably Democratic seats in the country.
          </CqPlainReading>
        </div>
      )}
    </CqEmbed>
  );
}

// ── Template 32 · EmbedReps ─────────────────────────
// Drives /embed/reps/[districtId]. 3-portrait card (House + 2 Senate) for an
// address-derived district. NY-08 → Jeffries + Schumer + Gillibrand.

function EmbedReps({ width = 480 }) {
  const compact = width <= 320;
  const wide = width >= 640;

  const reps = [
    {
      name: 'Hakeem S. Jeffries',
      role: 'U.S. Representative',
      short: 'House',
      district: 'NY-08',
      party: 'd',
      since: 2013,
    },
    {
      name: 'Chuck Schumer',
      role: 'U.S. Senator',
      short: 'Sen.',
      district: 'NY',
      party: 'd',
      since: 1999,
    },
    {
      name: 'Kirsten Gillibrand',
      role: 'U.S. Senator',
      short: 'Sen.',
      district: 'NY',
      party: 'd',
      since: 2009,
    },
  ];

  // Layout: at 320 stack vertically; at 480 grid 3 cols dense; at 640 grid 3
  // cols spacious with extra "next election" microline.
  const cols = compact ? '1fr' : '1fr 1fr 1fr';

  return (
    <CqEmbed
      width={width}
      source="Congress.gov"
      sourceId="Address → NY-08"
      lastUpdated="Updated 5 hrs ago"
      confidence={0.96}
    >
      <div style={{ marginBottom: 12 }}>
        <CqLabel>Your federal representatives</CqLabel>
        <div
          style={{
            fontSize: compact ? 16 : 18,
            fontWeight: 700,
            marginTop: 3,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
          }}
        >
          905 5th Ave, Brooklyn, NY 11215
        </div>
        <div
          style={{ fontSize: 10, color: COLORS.fg3, fontFamily: 'var(--font-mono)', marginTop: 3 }}
        >
          Address parsed · NY-08 (House) · NY (Senate)
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10 }}>
        {reps.map(r => (
          <div
            key={r.name}
            style={{
              padding: '10px 12px',
              border: `1px solid ${COLORS.line}`,
              background: '#fff',
              display: 'flex',
              flexDirection: compact ? 'row' : 'column',
              gap: compact ? 12 : 8,
              alignItems: compact ? 'center' : 'flex-start',
            }}
          >
            <CqMiniPortrait name={r.name} party={r.party} size={compact ? 40 : 48} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <CqLabel>{r.short}</CqLabel>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25, marginTop: 3 }}>
                {r.name}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  marginTop: 4,
                  flexWrap: 'wrap',
                }}
              >
                <CqChip variant={r.party} size="sm">
                  D · {r.district}
                </CqChip>
              </div>
              {wide && (
                <div
                  style={{
                    fontSize: 10,
                    color: COLORS.fg3,
                    fontFamily: 'var(--font-mono)',
                    marginTop: 5,
                  }}
                >
                  Since {r.since}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </CqEmbed>
  );
}

// ── Embed canvas helper — three-up at the three responsive widths ──
function EmbedTripleWidth({ render, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          padding: '8px 12px',
          background: COLORS.fg1,
          color: '#fff',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <WidthFrame width={320}>{render(320)}</WidthFrame>
        <WidthFrame width={480}>{render(480)}</WidthFrame>
        <WidthFrame width={640}>{render(640)}</WidthFrame>
      </div>
    </div>
  );
}

function WidthFrame({ width, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          color: COLORS.fg3,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {width}px wide
      </span>
      {/* Host site mock — a faint dotted frame to evoke "this is inside
          someone else's chrome". Just two dotted lines top + bottom of the
          embed slot, so the embed's own 2px black frame reads as the panel
          edge. */}
      <div
        style={{
          padding: '24px',
          background: COLORS.bg3,
          backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg3} 0 8px, ${COLORS.bg2} 8px 16px)`,
          border: `1px dashed ${COLORS.fg4}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Embed canvas page — wraps all three embed templates ──
function EmbedCanvasPage() {
  return (
    <div
      style={{
        width: 1280,
        background: '#fff',
        padding: '32px 36px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 36,
      }}
    >
      {/* Page-level intro — the embed brief, since this is a design canvas
          not a real page. */}
      <div style={{ paddingBottom: 20, borderBottom: '2px solid #000' }}>
        <CqLabel>Canvas 6</CqLabel>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 12px',
            textTransform: 'uppercase',
          }}
        >
          Embed mode
        </h1>
        <p style={{ fontSize: 14, color: COLORS.fg2, lineHeight: 1.55, maxWidth: 720, margin: 0 }}>
          Mast-less chassis for third-party publishers. No CIV.IQ header, footer, or breadcrumbs —
          the host site's chrome is the masthead. CIV.IQ contributes data + source rails + plain
          reading + one bottom attribution mark. Width-responsive at{' '}
          <span style={{ fontFamily: 'var(--font-mono)' }}>320 / 480 / 640</span>.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <CqChip variant="ink" filled={false} size="sm">
            Read-only
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            No header
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            No footer
          </CqChip>
          <CqChip variant="info" filled={false} size="sm">
            2px frame · party tokens · plain reading
          </CqChip>
          <CqChip variant="info" filled={false} size="sm">
            "Data via CIV.IQ" attribution
          </CqChip>
        </div>
      </div>

      <EmbedTripleWidth
        label="30 · EmbedBill — /embed/bill/[billId] · H.R. 3684"
        render={w => <EmbedBill width={w} />}
      />
      <EmbedTripleWidth
        label="31 · EmbedDistrict — /embed/district/[districtId] · NY-08"
        render={w => <EmbedDistrict width={w} />}
      />
      <EmbedTripleWidth
        label="32 · EmbedReps — /embed/reps/[districtId] · 905 5th Ave Brooklyn → NY-08"
        render={w => <EmbedReps width={w} />}
      />
    </div>
  );
}

// ── Template 33 · PrintDistrict ─────────────────────
// /districts/[districtId]/print. Letter-size (8.5×11), 2-column. Same data as
// DistrictPage, optimized for paper. No interactive elements; clean B&W where
// possible — accent colors permitted only for party tokens.

function PrintDistrict() {
  // 8.5 × 11 inches @ 96dpi = 816 × 1056. We render at full page size with a
  // 0.75in (72px) margin all around. Two columns inside.
  const PAGE_W = 816;
  const PAGE_H = 1056;
  const MARGIN = 56;

  const PrintLabel = ({ children, color = '#000' }) => (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </span>
  );

  const PrintRule = () => (
    <div style={{ height: 0, borderTop: '1px solid #000', margin: '8px 0' }} />
  );

  const PrintRow = ({ label, value }) => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        borderBottom: '0.5px solid #d4d4d4',
        fontSize: 10.5,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: '#000',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          fontSize: 9,
          fontWeight: 700,
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: '#000',
          fontFamily:
            typeof value === 'string' && /^\$|\d/.test(value)
              ? 'var(--font-mono)'
              : 'var(--font-primary)',
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: PAGE_W,
        height: PAGE_H,
        background: '#fff',
        color: '#000',
        fontFamily: 'var(--font-primary)',
        position: 'relative',
        border: '1px solid #d4d4d4', // page edge — a slightly subtle line to
        // distinguish the sheet from the canvas
        // background; not part of the actual
        // print output
      }}
    >
      {/* Page interior */}
      <div
        style={{
          position: 'absolute',
          inset: MARGIN,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Masthead */}
        <header
          style={{
            paddingBottom: 12,
            borderBottom: '2px solid #000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CqLogoMark size={20} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textTransform: 'uppercase',
              }}
            >
              CIV<span style={{ color: COLORS.red }}>.</span>IQ{' '}
              <span style={{ color: '#666', fontWeight: 500 }}>· Print edition</span>
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <PrintLabel color="#666">Compiled</PrintLabel>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Apr 26, 2026 · Vol. III · No. 26
            </div>
          </div>
        </header>

        {/* Title block */}
        <div style={{ padding: '20px 0 14px', borderBottom: '1px solid #000' }}>
          <PrintLabel color="#666">Federal House district profile</PrintLabel>
          <h1
            style={{
              margin: '6px 0 4px',
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              textTransform: 'uppercase',
            }}
          >
            NY-08
          </h1>
          <div style={{ fontSize: 12, color: '#333' }}>Brooklyn, New York · 119th Congress</div>
        </div>

        {/* Two columns */}
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 24,
            flex: 1,
          }}
        >
          {/* LEFT COLUMN — current rep + at-a-glance + plain reading */}
          <section>
            <PrintLabel>Current representative</PrintLabel>
            <PrintRule />
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  border: '2px solid #000',
                  flexShrink: 0,
                  background: '#fff',
                  backgroundImage: `repeating-linear-gradient(45deg, #f4f4f4 0 6px, #e8e8e8 6px 12px)`,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 5,
                    background: '#000',
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
                    fontSize: 26,
                    letterSpacing: '-0.03em',
                  }}
                >
                  HJ
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Hakeem S. Jeffries
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#444',
                    marginTop: 4,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Democrat · House Minority Leader
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: '#666',
                    marginTop: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  In office since 2013 · Next election Nov 3, 2026
                </div>
              </div>
            </div>

            <PrintLabel>At a glance</PrintLabel>
            <PrintRule />
            <PrintRow label="Population (2020)" value="776,971" />
            <PrintRow
              label="Cook PVI (2025)"
              value={
                <span
                  style={{ color: COLORS.green, fontWeight: 700, fontFamily: 'var(--font-mono)' }}
                >
                  D+33
                </span>
              }
            />
            <PrintRow label="Median income (ACS '23)" value="$71,840" />
            <PrintRow label="Voting-age population" value="612,400" />
            <PrintRow label="Registered voters (Apr '26)" value="488,212" />
            <PrintRow label="Turnout, 2024 general" value="61.2%" />
            <PrintRow label="Land area" value="42.7 sq mi" />
            <PrintRow label="Counties (full / part)" value="Kings (full)" />

            <div
              style={{
                marginTop: 16,
                padding: '10px 14px',
                borderLeft: '3px solid #000',
                background: '#f5f5f5',
                fontSize: 11,
                lineHeight: 1.5,
                color: '#222',
              }}
            >
              <strong style={{ marginRight: 6 }}>PLAIN READING.</strong>
              Brooklyn's 8th district covers parts of Bedford-Stuyvesant, Crown Heights,
              Brownsville, and East New York. One of the most reliably Democratic seats in the
              country (Cook PVI D+33). Median household income is below the New York metro average;
              the seat returns the House Minority Leader.
            </div>

            <div style={{ marginTop: 16 }}>
              <PrintLabel>District boundary</PrintLabel>
              <PrintRule />
              <div
                style={{
                  width: '100%',
                  height: 130,
                  border: '1.5px solid #000',
                  backgroundImage: `repeating-linear-gradient(45deg, #fafafa 0 8px, #ececec 8px 16px)`,
                  position: 'relative',
                }}
              >
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
                    color: '#444',
                  }}
                >
                  NY-08 · outline-map placeholder
                </div>
              </div>
              <div
                style={{ fontSize: 9, color: '#666', fontFamily: 'var(--font-mono)', marginTop: 4 }}
              >
                Census TIGER · 118th Congress reapportionment
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN — committee + finance + recent votes + sources */}
          <section>
            <PrintLabel>Committee assignments</PrintLabel>
            <PrintRule />
            <PrintRow label="Budget" value="Member · 119th" />
            <PrintRow label="Judiciary" value="Member · 119th" />
            <PrintRow label="Caucus" value="Cong. Black Caucus" />

            <div style={{ height: 14 }} />

            <PrintLabel>Campaign finance · 2024 cycle</PrintLabel>
            <PrintRule />
            <PrintRow label="Total raised" value="$3.42M" />
            <PrintRow label="Cash on hand" value="$1.81M" />
            <PrintRow label="Small donors (under $200)" value="41%" />
            <PrintRow label="PACs" value="27%" />
            <PrintRow label="Top industry" value="Securities & Investment" />

            <div style={{ height: 14 }} />

            <PrintLabel>Recent key votes</PrintLabel>
            <PrintRule />
            {[
              ['H.R. 3684', 'Infrastructure Investment and Jobs Act', 'Yea', 'Nov 5, 2021'],
              ['H.R. 5376', 'Inflation Reduction Act', 'Yea', 'Aug 12, 2022'],
              ['H.R. 2670', 'NDAA FY2024', 'Yea', 'Jul 14, 2023'],
              ['H.R. 815', 'Israel-Ukraine Supplemental', 'Yea', 'Apr 20, 2024'],
              ['H.R. 7521', 'TikTok divestiture', 'Yea', 'Mar 13, 2024'],
            ].map((v, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 40px 64px',
                  gap: 8,
                  padding: '5px 0',
                  borderBottom: '0.5px solid #d4d4d4',
                  fontSize: 10,
                  lineHeight: 1.3,
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{v[0]}</span>
                <span>{v[1]}</span>
                <span
                  style={{ fontWeight: 700, color: COLORS.green, fontFamily: 'var(--font-mono)' }}
                >
                  {v[2]}
                </span>
                <span style={{ color: '#666', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {v[3]}
                </span>
              </div>
            ))}

            <div style={{ height: 14 }} />

            <PrintLabel>Contact</PrintLabel>
            <PrintRule />
            <PrintRow label="DC office" value="(202) 225-5936" />
            <PrintRow label="Brooklyn office" value="(718) 237-2211" />
            <PrintRow label="Queens office" value="(347) 305-3490" />
            <PrintRow label="Web" value="jeffries.house.gov" />

            <div style={{ height: 14 }} />

            <PrintLabel>Data sources</PrintLabel>
            <PrintRule />
            <ul
              style={{
                margin: 0,
                padding: '0 0 0 14px',
                fontSize: 9.5,
                color: '#222',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.6,
              }}
            >
              <li>Congress.gov · /member/J000294</li>
              <li>FEC.gov · C00399001 (2024)</li>
              <li>House Clerk · roll-call-2024</li>
              <li>OpenSecrets · N00033640</li>
              <li>US Census · ACS 2023 5-year</li>
              <li>Cook Political Report · PVI 2025</li>
            </ul>
          </section>
        </div>

        {/* Footer rule */}
        <footer
          style={{
            marginTop: 18,
            paddingTop: 8,
            borderTop: '2px solid #000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: '#666',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <span>civdotiq.org/districts/NY-08/print</span>
          <span>Confidence 0.97 · As of Apr 26, 2026 · Direct ingestion · No inference</span>
          <span>Page 1 of 1</span>
        </footer>
      </div>
    </div>
  );
}

function PrintCanvasPage() {
  return (
    <div
      style={{
        width: 1080,
        background: '#fff',
        padding: '32px 36px 48px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div style={{ paddingBottom: 16, borderBottom: '2px solid #000' }}>
        <CqLabel>Template 33</CqLabel>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            margin: '6px 0 8px',
            textTransform: 'uppercase',
          }}
        >
          PrintDistrict — /districts/[id]/print
        </h2>
        <p style={{ fontSize: 13, color: COLORS.fg2, lineHeight: 1.55, margin: 0, maxWidth: 720 }}>
          Letter-size, 2-column. Same data as DistrictPage, optimized for paper. No interactive
          elements. Black/white where possible; party tokens kept for legibility. Renders at 8.5×11
          inches @ 96dpi.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <PrintDistrict />
      </div>
    </div>
  );
}

Object.assign(window, {
  CqEmbed,
  EmbedBill,
  EmbedDistrict,
  EmbedReps,
  EmbedTripleWidth,
  WidthFrame,
  EmbedCanvasPage,
  PrintDistrict,
  PrintCanvasPage,
});
