import { CqLabel } from './CqLabel';

interface CqCitationProps {
  /** Citation number rendered in the badge. */
  n: number;
  /** Source name (e.g. "House Clerk", "Congress.gov", "FEC"). */
  source: string;
  /** Entity / ID this citation points to (e.g. "Roll call 421 · 117th"). */
  entity?: string;
  /** Internal route on civdotiq.org. When provided, renders as a link. */
  route?: string;
  /** External URL when the source lives off-site. */
  href?: string;
  /** One-sentence snippet describing what the source contains. */
  snippet?: string;
}

export function CqCitation({ n, source, entity, route, href, snippet }: CqCitationProps) {
  const link = route ?? href;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr',
        gap: 14,
        padding: '12px 0',
        borderTop: '1px solid var(--line)',
        alignItems: 'flex-start',
      }}
    >
      <span
        id={`cite-${n}`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--civiq-blue)',
          border: '2px solid var(--civiq-blue)',
          background: 'var(--bg1)',
          width: 26,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {n}
      </span>
      <div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <CqLabel color="ink">{source}</CqLabel>
          {entity && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--fg3)',
                letterSpacing: '0.04em',
              }}
            >
              {entity}
            </span>
          )}
        </div>
        {snippet && (
          <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginTop: 4 }}>
            {snippet}
          </div>
        )}
        {link && (
          <a
            href={link}
            target={href ? '_blank' : undefined}
            rel={href ? 'noopener noreferrer' : undefined}
            style={{
              display: 'inline-block',
              marginTop: 6,
              fontSize: 10,
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {link} →
          </a>
        )}
      </div>
    </div>
  );
}
