import type { ReactNode } from 'react';

type ConfidenceBand = 'high' | 'medium' | 'low';

interface CqDisclaimerProps {
  confidence: number;
  asof: string;
  method?: string;
  children?: ReactNode;
}

function bandFor(confidence: number): ConfidenceBand {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function CqDisclaimer({
  confidence,
  asof,
  method = 'Direct ingestion · no inference',
  children,
}: CqDisclaimerProps) {
  const band = BAND_LABEL[bandFor(confidence)];
  return (
    <div
      style={{
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        color: 'var(--fg3)',
        letterSpacing: '0.04em',
        lineHeight: 1.5,
        paddingTop: 6,
      }}
    >
      Confidence {band} · As of {asof} · {method} · Correlation does not imply causation.
      {children}
    </div>
  );
}
