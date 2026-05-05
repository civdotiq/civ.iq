interface CqSourceTagProps {
  source: string;
  id?: string;
  time?: string;
  compact?: boolean;
}

export function CqSourceTag({
  source,
  id,
  time = 'Updated weekly',
  compact = false,
}: CqSourceTagProps) {
  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 5,
            background: 'var(--civiq-blue)',
            display: 'inline-block',
          }}
        />
        {source}
        {id ? ` · ${id}` : ''}
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
        border: '1px solid var(--line)',
        background: 'var(--bg1)',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg1)' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            background: 'var(--civiq-blue)',
            marginRight: 6,
            verticalAlign: 'middle',
          }}
        />
        {source}
      </span>
      {id && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg3)' }}>
          {id}
        </span>
      )}
      <span
        style={{
          fontSize: 9,
          color: 'var(--fg4)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        {time}
      </span>
    </div>
  );
}
