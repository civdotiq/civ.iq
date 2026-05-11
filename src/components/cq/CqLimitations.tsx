import { CqLabel } from './CqLabel';

interface CqLimitationsProps {
  items: ReadonlyArray<string>;
  /** Optional override for the heading copy. */
  heading?: string;
}

export function CqLimitations({
  items,
  heading = 'What this answer cannot tell you',
}: CqLimitationsProps) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        borderLeft: '3px solid var(--color-warning)',
        padding: '12px 18px',
        background: 'var(--bg2)',
      }}
    >
      <CqLabel color="amber">{heading}</CqLabel>
      <ul
        style={{
          margin: '8px 0 0',
          padding: '0 0 0 18px',
          fontSize: 12,
          color: 'var(--fg2)',
          lineHeight: 1.55,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
