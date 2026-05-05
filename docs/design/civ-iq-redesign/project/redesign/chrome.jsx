// Shared chrome — Header, Footer, Breadcrumbs.
// Universal across all redesigned screens. Otl Aicher / Ulm system.
// 56px header w/ 2px black bottom border. Footer is dossier-mono.
// Breadcrumb is a single uppercase row that mirrors the masthead crumb in profiles.

function CqHeader({ width = 1280, current = 'find' }) {
  const items = [
    ['find', 'Find officials'],
    ['bills', 'Bills'],
    ['states', 'State overviews'],
    ['method', 'Methodology'],
    ['about', 'About'],
  ];
  return (
    <header
      style={{
        width,
        height: 56,
        background: '#fff',
        borderBottom: '2px solid #000',
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        gap: 32,
        fontFamily: 'var(--font-primary)',
      }}
    >
      {/* Aicher logo lockup — red dot, green stem, four blue dots forming i */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <CqLogoMark size={24} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            textTransform: 'uppercase',
            color: '#000',
          }}
        >
          CIV<span style={{ color: COLORS.red }}>.</span>IQ
        </span>
      </div>

      <nav style={{ display: 'flex', gap: 0, height: '100%' }}>
        {items.map(([k, label]) => {
          const active = current === k;
          return (
            <a
              key={k}
              href="#"
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: active ? '#000' : COLORS.fg2,
                textDecoration: 'none',
                borderBottom: active ? '3px solid #000' : '3px solid transparent',
                marginBottom: -2,
              }}
            >
              {label}
            </a>
          );
        })}
      </nav>

      {/* Search well — always present, the high-traffic entry point */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          border: '2px solid #000',
          height: 36,
          paddingLeft: 12,
          gap: 10,
          background: '#fff',
        }}
      >
        <CqSearchGlyph size={14} />
        <input
          defaultValue=""
          placeholder="Address, name, bill, or ZIP"
          style={{
            border: 0,
            outline: 'none',
            fontFamily: 'var(--font-primary)',
            fontSize: 12,
            width: 280,
            color: COLORS.fg1,
            background: 'transparent',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: COLORS.fg3,
            letterSpacing: '0.04em',
            padding: '0 10px',
            borderLeft: `1px solid ${COLORS.line}`,
            height: 36,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ⌘K
        </span>
      </div>

      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: COLORS.fg3,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        No ads · No signups
      </span>
    </header>
  );
}

// Aicher pictogram lowercase i — red dot, green stem, four blue dots
function CqLogoMark({ size = 24 }) {
  const u = size / 24;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="5" r="2.4" fill={COLORS.red} />
      <rect x="3.6" y="9" width="4.8" height="13" fill={COLORS.green} />
      <rect x="11.5" y="9" width="3.2" height="3.2" fill={COLORS.blue} />
      <rect x="15.7" y="9" width="3.2" height="3.2" fill={COLORS.blue} />
      <rect x="11.5" y="13.2" width="3.2" height="3.2" fill={COLORS.blue} />
      <rect x="15.7" y="13.2" width="3.2" height="3.2" fill={COLORS.blue} />
    </svg>
  );
}

function CqSearchGlyph({ size = 14, color = '#000' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
    >
      <circle cx="10" cy="10" r="6" />
      <line x1="15" y1="15" x2="20" y2="20" />
    </svg>
  );
}

// Breadcrumb — black masthead matching the profile dossier marker.
// Use as the first row in any inner page. crumbs is array of strings;
// last one is current. Right side is sources / file ID, free-form.
function CqBreadcrumb({ crumbs = [], right = null }) {
  return (
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
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span style={{ color: '#6b7280' }}>·</span>}
            <span
              style={{
                color: i === crumbs.length - 1 ? '#fff' : '#9ca3af',
                fontWeight: i === crumbs.length - 1 ? 700 : 600,
              }}
            >
              {c}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 18, color: '#9ca3af' }}>{right}</div>
    </div>
  );
}

// Footer — Aicher dossier strip.
// Three column grid: brand+manifesto, sources, meta. 2px top border, no shadow.
function CqFooter({ width = 1280 }) {
  const cols = [
    {
      title: 'CIV.IQ',
      lines: [
        'Public record, made legible.',
        'Independent · Nonpartisan',
        'Open source · MIT licensed',
      ],
    },
    {
      title: 'Data sources',
      lines: [
        'Congress.gov · House + Senate',
        'FEC.gov · Campaign finance',
        'Senate LDA · Lobbying',
        'USASpending · Federal contracts',
        'OpenSecrets · Industry codes',
      ],
    },
    {
      title: 'Methodology',
      lines: [
        'Direct ingestion · No inference',
        'Confidence + as-of timestamp on every fact',
        'Plain language · 8th-grade reading level',
        'Correlation does not imply causation',
      ],
    },
    {
      title: 'For builders',
      lines: [
        'API · 60 req/min · No key',
        'MCP · 16 tools',
        'Bulk download · CSV + JSON',
        'GitHub · civdotiq/civ.iq',
      ],
    },
  ];
  return (
    <footer
      style={{
        width,
        background: COLORS.fg1,
        color: '#fff',
        borderTop: '2px solid #000',
        padding: '40px 36px 28px',
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          paddingBottom: 28,
          borderBottom: '1px solid #374151',
        }}
      >
        {cols.map(c => (
          <div key={c.title}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: COLORS.blue,
                marginBottom: 12,
              }}
            >
              {c.title}
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {c.lines.map(l => (
                <li key={l} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CqLogoMark size={20} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9ca3af',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            CIV.IQ · 2026 · Vol. III · No. 26 · Compiled Apr 26, 2026
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#6b7280',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          No ads · No signups · No editorializing
        </span>
      </div>
    </footer>
  );
}

// Page chassis — header + breadcrumb + content + footer, all at fixed page width.
function CqPage({
  width = 1280,
  currentNav,
  crumbs,
  crumbRight,
  children,
  contentPad = '32px 36px 56px',
}) {
  return (
    <div
      style={{ width, background: '#fff', color: COLORS.fg1, fontFamily: 'var(--font-primary)' }}
    >
      <CqHeader width={width} current={currentNav} />
      {crumbs && <CqBreadcrumb crumbs={crumbs} right={crumbRight} />}
      <div style={{ padding: contentPad }}>{children}</div>
      <CqFooter width={width} />
    </div>
  );
}

Object.assign(window, { CqHeader, CqFooter, CqBreadcrumb, CqLogoMark, CqSearchGlyph, CqPage });
