import { CqLogoMark } from './CqLogoMark';

interface FooterColumn {
  title: string;
  lines: ReadonlyArray<string>;
}

const COLUMNS: ReadonlyArray<FooterColumn> = [
  {
    title: 'CIV.IQ',
    lines: [
      'Public record, made legible.',
      'Independent · Nonpartisan',
      'Open source · Apache-2.0',
    ],
  },
  {
    title: 'Data sources',
    lines: [
      'Congress.gov · House + Senate',
      'FEC.gov · Campaign finance',
      'Senate LDA · Lobbying',
      'USASpending · Federal contracts',
      'OpenSecrets · Industry codes',
    ],
  },
  {
    title: 'Methodology',
    lines: [
      'Direct ingestion · No inference',
      'Confidence + as-of timestamp on every fact',
      'Plain language · 8th-grade reading level',
      'Correlation does not imply causation',
    ],
  },
  {
    title: 'For builders',
    lines: [
      'API · 60 req/min · No key',
      'MCP · 16 tools',
      'Bulk download · CSV + JSON',
      'GitHub · civdotiq/civ.iq',
    ],
  },
];

interface CqFooterProps {
  compiledOn?: string;
}

export function CqFooter({ compiledOn }: CqFooterProps = {}) {
  return (
    <footer
      style={{
        background: 'var(--fg1)',
        color: '#fff',
        borderTop: '2px solid var(--ink)',
        padding: '40px 36px 28px',
        fontFamily: 'var(--font-primary)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 32,
          paddingBottom: 28,
          borderBottom: '1px solid #374151',
        }}
      >
        {COLUMNS.map(c => (
          <div key={c.title}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--civiq-blue)',
                marginBottom: 12,
              }}
            >
              {c.title}
            </div>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {c.lines.map(l => (
                <li key={l} style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CqLogoMark size={20} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#9ca3af',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            CIV.IQ{compiledOn ? ` · Compiled ${compiledOn}` : ''}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#6b7280',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          No ads · No signups · No editorializing
        </span>
      </div>
    </footer>
  );
}
