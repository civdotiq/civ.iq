import { CqLabel } from './CqLabel';

export interface CqMethodologySource {
  /** Source name (e.g. "House Clerk", "Congress.gov", "FEC"). */
  name: string;
  /** One-line note on what this source contributes. */
  note: string;
}

interface CqMethodologyBlockProps {
  sources: ReadonlyArray<CqMethodologySource>;
  /** One sentence: how the entity was matched / scoped. */
  retrieval: string;
  /** One sentence: how the answer was produced. */
  generation: string;
  /** One sentence: how often the underlying sources refresh. */
  refresh: string;
}

export function CqMethodologyBlock({
  sources,
  retrieval,
  generation,
  refresh,
}: CqMethodologyBlockProps) {
  return (
    <div style={{ border: '2px solid var(--ink)', background: 'var(--bg1)' }}>
      <div
        style={{
          background: 'var(--fg1)',
          color: 'var(--bg1)',
          padding: '10px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        How this answer was built
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <CqLabel>Sources used</CqLabel>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sources.map(s => (
              <div
                key={s.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(140px, max-content) 1fr',
                  gap: 12,
                  fontSize: 12,
                  color: 'var(--fg2)',
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: 'var(--fg1)', fontWeight: 700 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-block',
                      width: 5,
                      height: 5,
                      background: 'var(--civiq-blue)',
                      marginRight: 6,
                      verticalAlign: 'middle',
                    }}
                  />
                  {s.name}
                </span>
                <span>{s.note}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--line)',
          }}
        >
          <div>
            <CqLabel>Retrieval</CqLabel>
            <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginTop: 4 }}>
              {retrieval}
            </div>
          </div>
          <div>
            <CqLabel>Generation</CqLabel>
            <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginTop: 4 }}>
              {generation}
            </div>
          </div>
          <div>
            <CqLabel>Refresh</CqLabel>
            <div style={{ fontSize: 12, color: 'var(--fg2)', lineHeight: 1.5, marginTop: 4 }}>
              {refresh}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
