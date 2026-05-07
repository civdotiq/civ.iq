interface CommitteeMarkProps {
  abbr: string;
  congress?: string;
}

export function CommitteeMark({ abbr, congress }: CommitteeMarkProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 120,
        height: 120,
        position: 'relative',
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        backgroundImage: 'repeating-linear-gradient(45deg, var(--bg2) 0 8px, var(--bg3) 8px 16px)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'var(--fg1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: '0 0 0 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: 'var(--fg3)',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          CMTE
        </div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 700,
            marginTop: 2,
            color: 'var(--fg1)',
            letterSpacing: '-0.01em',
          }}
        >
          {abbr}
        </div>
        {congress && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              marginTop: 6,
              letterSpacing: '0.04em',
            }}
          >
            {congress}
          </div>
        )}
      </div>
    </div>
  );
}
