// Shared primitives for CIV.IQ web UI kit

function Logo({ size = 32, href = '#' }) {
  return (
    <a
      href={href}
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: '#111827',
      }}
    >
      <img src="../../assets/civiq-logo.png" alt="CIV.IQ" style={{ height: size, width: 'auto' }} />
    </a>
  );
}

function Button({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  type = 'button',
  style = {},
  disabled = false,
}) {
  const palette = {
    primary: { bg: '#3ea2d4', fg: '#fff', bc: '#3ea2d4' },
    secondary: { bg: '#fff', fg: '#000', bc: '#000' },
    ghost: { bg: 'transparent', fg: '#111827', bc: 'transparent' },
    danger: { bg: '#e11d07', fg: '#fff', bc: '#e11d07' },
  }[variant];
  const dims =
    size === 'sm' ? { padding: '8px 14px', fontSize: 11 } : { padding: '12px 20px', fontSize: 13 };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-primary)',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: palette.bg,
        color: palette.fg,
        border: `2px solid ${palette.bc}`,
        borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 150ms cubic-bezier(0.25,0.1,0.25,1)',
        ...dims,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Eyebrow({ children, color = 'var(--fg3)', style = {} }) {
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

function Chip({ variant = 'd', outlined = false, children, size = 'md' }) {
  const map = {
    d: { fg: '#0a9338' },
    r: { fg: '#e11d07' },
    i: { fg: '#6b7280' },
    status: { fg: '#b45309' },
    info: { fg: '#2a7aa3' },
  };
  const c = map[variant] || map.d;
  const outStyle = outlined
    ? { background: '#fff', color: c.fg, border: `1px solid ${c.fg}` }
    : { background: c.fg, color: '#fff', border: `1px solid ${c.fg}` };
  const sm =
    size === 'sm'
      ? { fontSize: 10, padding: '2px 6px', letterSpacing: '0.06em' }
      : { fontSize: 11, padding: '4px 10px', letterSpacing: '0.08em' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        ...sm,
        ...outStyle,
      }}
    >
      {children}
    </span>
  );
}

function SourceTag({ source, id, time = 'Updated weekly' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 3,
        padding: '6px 10px',
        border: '1px solid #e5e7eb',
        background: '#fff',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#3ea2d4',
            marginRight: 6,
            verticalAlign: 'middle',
          }}
        />
        {source}
      </span>
      {id && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6b7280' }}>{id}</span>
      )}
      <span
        style={{
          fontSize: 9,
          color: '#9ca3af',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop: 2,
        }}
      >
        {time}
      </span>
    </div>
  );
}

function Input({ value, onChange, placeholder, style = {}, ...rest }) {
  return (
    <input
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        fontFamily: 'var(--font-primary)',
        fontSize: 15,
        padding: '14px 16px',
        border: '2px solid #000',
        background: '#fff',
        borderRadius: 3,
        outline: 'none',
        width: '100%',
        ...style,
      }}
      {...rest}
    />
  );
}

Object.assign(window, { Logo, Button, Eyebrow, Chip, SourceTag, Input });
