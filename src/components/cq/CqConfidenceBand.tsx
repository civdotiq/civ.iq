import { CqLabel } from './CqLabel';

type ConfidenceBandLabel = 'High' | 'Medium' | 'Low';

interface CqConfidenceBandProps {
  /** 0–1 confidence score. */
  score: number;
  /** Optional band label override. When omitted, derived from `score`. */
  interpretation?: ConfidenceBandLabel;
  /** Plain-language basis for the score (1 sentence). */
  basis?: string;
}

const CELLS = 12;

function bandFor(score: number): ConfidenceBandLabel {
  if (score >= 0.85) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}

export function CqConfidenceBand({ score, interpretation, basis }: CqConfidenceBandProps) {
  const clamped = Math.max(0, Math.min(1, score));
  const filled = Math.round(clamped * CELLS);
  const label = interpretation ?? bandFor(clamped);

  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        padding: '14px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <CqLabel>Confidence</CqLabel>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 22,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            color: 'var(--fg1)',
          }}
        >
          {clamped.toFixed(2)}
        </span>
      </div>
      <div
        role="img"
        aria-label={`Confidence ${label}, ${clamped.toFixed(2)} of 1.00`}
        style={{ display: 'flex', gap: 2, marginBottom: 8 }}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              aria-hidden="true"
              style={{
                flex: 1,
                height: 14,
                background: isFilled ? 'var(--civiq-blue)' : 'var(--bg3)',
                border: `1px solid ${isFilled ? 'var(--civiq-blue)' : 'var(--line)'}`,
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--fg1)', marginRight: 4 }}>{label}.</strong>
        {basis}
      </div>
    </div>
  );
}
