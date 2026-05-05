// Shared primitives for the redesign artboards.
// Names are scoped (cqLabel, cqChip, cqCard) so they can't clash with the original kit.

const COLORS = {
  red: '#e11d07',
  green: '#0a9338',
  blue: '#3ea2d4',
  blueHv: '#2a7aa3',
  amber: '#b45309',
  ink: '#000000',
  fg1: '#111827',
  fg2: '#4b5563',
  fg3: '#6b7280',
  fg4: '#9ca3af',
  bg1: '#ffffff',
  bg2: '#f9fafb',
  bg3: '#f3f4f6',
  line: '#e5e7eb',
  vlau: '#6b6b83',
  greige: '#b8b5a9',
};

function partyColor(p) {
  return p === 'd' ? COLORS.green : p === 'r' ? COLORS.red : COLORS.fg3;
}

function CqLabel({ children, color = COLORS.fg3, style = {} }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function CqChip({ variant = 'd', filled = true, children, size = 'md' }) {
  const map = {
    d: { fg: COLORS.green },
    r: { fg: COLORS.red },
    i: { fg: COLORS.fg3 },
    info: { fg: COLORS.blueHv },
    warn: { fg: COLORS.amber },
    ink: { fg: COLORS.ink },
  };
  const c = map[variant] || map.ink;
  const dims =
    size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : { fontSize: 11, padding: '4px 10px' };
  const style = filled
    ? { background: c.fg, color: '#fff', border: `1px solid ${c.fg}` }
    : { background: '#fff', color: c.fg, border: `1px solid ${c.fg}` };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        borderRadius: 3,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...dims,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function CqSourceTag({ source, id, time = 'Updated weekly', compact = false }) {
  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: COLORS.fg3,
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span style={{ width: 5, height: 5, background: COLORS.blue, display: 'inline-block' }} />
        {source}
        {id ? ' · ' + id : ''}
      </span>
    );
  }
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        padding: '6px 10px',
        border: `1px solid ${COLORS.line}`,
        background: '#fff',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.fg1 }}>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            background: COLORS.blue,
            marginRight: 6,
            verticalAlign: 'middle',
          }}
        />
        {source}
      </span>
      {id && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: COLORS.fg3 }}>
          {id}
        </span>
      )}
      <span
        style={{
          fontSize: 9,
          color: COLORS.fg4,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {time}
      </span>
    </div>
  );
}

function CqButton({ variant = 'primary', size = 'md', children, onClick, style = {} }) {
  const palette = {
    primary: { bg: COLORS.blue, fg: '#fff', bc: COLORS.blue },
    secondary: { bg: '#fff', fg: COLORS.ink, bc: COLORS.ink },
    ghost: { bg: 'transparent', fg: COLORS.fg1, bc: 'transparent' },
  }[variant];
  const dims =
    size === 'sm' ? { padding: '8px 14px', fontSize: 11 } : { padding: '12px 18px', fontSize: 12 };
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-primary)',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        background: palette.bg,
        color: palette.fg,
        border: `2px solid ${palette.bc}`,
        borderRadius: 3,
        cursor: 'pointer',
        ...dims,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ASCII portrait fallback — strictly placeholder, not a drawn likeness.
// Renders an Aicher-square framed plate with the official's initials in the
// stripe pattern used elsewhere in the system.
function CqPortrait({ name, size = 120, party = 'd' }) {
  const initials = name
    .split(' ')
    .map(s => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  const stripeColor = party === 'd' ? COLORS.green : party === 'r' ? COLORS.red : COLORS.vlau;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        border: '2px solid #000',
        background: '#fff',
        flexShrink: 0,
        backgroundImage: `repeating-linear-gradient(45deg, ${COLORS.bg2} 0 8px, ${COLORS.bg3} 8px 16px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: stripeColor,
        }}
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
          fontSize: size * 0.32,
          letterSpacing: '-0.03em',
          color: COLORS.fg1,
        }}
      >
        {initials}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 6,
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          color: COLORS.fg4,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Photo · placeholder
      </div>
    </div>
  );
}

// Numerical stat with caption, tabular nums, no decoration.
function CqStat({ label, value, caption, color = COLORS.fg1, size = 36, align = 'left' }) {
  return (
    <div style={{ textAlign: align }}>
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: size,
          fontWeight: 700,
          color,
          lineHeight: 1.05,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {caption && (
        <div
          style={{ fontSize: 11, color: COLORS.fg3, marginTop: 4, fontFamily: 'var(--font-mono)' }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

// Horizontal bar with label, percent, and amount — the data-row Aicher pattern.
function CqBar({ label, pct, amount, color = COLORS.blue, sub }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 60px 90px',
        gap: 14,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: `1px solid ${COLORS.line}`,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.fg1 }}>{label}</div>
        {sub && (
          <div
            style={{
              fontSize: 10,
              color: COLORS.fg3,
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div style={{ height: 14, background: COLORS.bg3, position: 'relative' }}>
        <div style={{ height: '100%', background: color, width: `${pct}%` }} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: COLORS.fg3,
          textAlign: 'right',
        }}
      >
        {pct}%
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
        }}
      >
        {amount}
      </span>
    </div>
  );
}

// Plain-reading callout — blue left bar, paper background.
function CqPlainReading({ children }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        background: COLORS.bg2,
        borderLeft: `3px solid ${COLORS.blue}`,
        fontSize: 13,
        color: COLORS.fg2,
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: COLORS.fg1, marginRight: 6 }}>PLAIN READING.</strong>
      {children}
    </div>
  );
}

// Disclaimer microtype — the always-on confidence/methodology line.
function CqDisclaimer({
  confidence = 0.94,
  asof = 'Apr 26, 2026',
  method = 'Direct ingestion · no inference',
  children,
}) {
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: COLORS.fg3,
        letterSpacing: '0.04em',
        lineHeight: 1.5,
        paddingTop: 6,
      }}
    >
      Confidence {confidence.toFixed(2)} · As of {asof} · {method} · Correlation does not imply
      causation.
      {children}
    </div>
  );
}

Object.assign(window, {
  COLORS,
  partyColor,
  CqLabel,
  CqChip,
  CqSourceTag,
  CqButton,
  CqPortrait,
  CqStat,
  CqBar,
  CqPlainReading,
  CqDisclaimer,
});
