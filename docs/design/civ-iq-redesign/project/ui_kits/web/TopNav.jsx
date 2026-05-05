// Top navigation bar

function TopNav({ onLogo, currentScreen }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#fff',
        borderBottom: '2px solid #000',
        padding: '14px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}
    >
      <div onClick={onLogo} style={{ cursor: 'pointer' }}>
        <Logo size={28} />
      </div>
      <nav style={{ display: 'flex', gap: 24, marginLeft: 24 }}>
        {['Find officials', 'How it works', 'Sources', 'About'].map(item => (
          <a
            key={item}
            href="#"
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#111827',
              textDecoration: 'none',
            }}
          >
            {item}
          </a>
        ))}
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
        <Eyebrow color="#6b7280">No ads · No signups</Eyebrow>
        <Button variant="secondary" size="sm">
          Look up address
        </Button>
      </div>
    </header>
  );
}

Object.assign(window, { TopNav });
