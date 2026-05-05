import type { Bill } from '@/types/bill';
import { CqButton, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { formatDate } from './helpers';

interface TextPanelProps {
  bill: Bill;
}

export function TextPanel({ bill }: TextPanelProps) {
  const fullText = bill.fullText;
  const versions = bill.textVersions ?? [];
  const amendmentsCount = bill.amendments?.count ?? 0;
  const latestUrl =
    versions[0]?.formats.find(f => f.type === 'Formatted Text' || f.type === 'Formatted HTML')
      ?.url ?? bill.textUrl;

  return (
    <section style={{ marginTop: 32 }}>
      <PanelHeader
        eyebrow={`${versions.length || 0} version${versions.length === 1 ? '' : 's'} · ${amendmentsCount} amendment${amendmentsCount === 1 ? '' : 's'}`}
        title="Bill text"
        source={{ name: 'GovInfo · Congress.gov', id: 'text versions' }}
        right={
          latestUrl && (
            <a
              href={latestUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="secondary" size="sm">
                Open full text →
              </CqButton>
            </a>
          )
        }
      />

      {!fullText && versions.length === 0 ? (
        <CqPlainReading label="DATA UNAVAILABLE.">
          GovInfo has not yet posted the official text for this bill. Bill text appears here once
          the chamber clerk publishes the engrossed or enrolled version.
        </CqPlainReading>
      ) : (
        <div
          style={{
            border: '2px solid var(--ink)',
            display: 'grid',
            gridTemplateColumns: '220px minmax(0, 1fr)',
          }}
        >
          <div
            style={{
              background: 'var(--bg2)',
              borderRight: '2px solid var(--ink)',
              padding: '20px 18px',
            }}
          >
            <CqLabel>Versions</CqLabel>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {versions.length === 0 ? (
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    padding: '8px 0',
                  }}
                >
                  Single version
                </span>
              ) : (
                versions.slice(0, 8).map((v, i) => {
                  const url =
                    v.formats.find(f => f.type === 'Formatted Text' || f.type === 'Formatted HTML')
                      ?.url ?? v.formats[0]?.url;
                  const isLast = i === Math.min(versions.length, 8) - 1;
                  return (
                    <a
                      key={`${v.type}-${v.date}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 12,
                        color: i === 0 ? 'var(--fg1)' : 'var(--fg2)',
                        fontFamily: 'var(--font-mono)',
                        padding: '8px 0',
                        borderBottom: isLast ? 0 : '1px solid var(--line)',
                        fontWeight: i === 0 ? 700 : 500,
                        textDecoration: 'none',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span style={{ color: 'var(--fg3)', marginRight: 8 }}>§{i + 1}</span>
                      {v.type}
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--fg3)',
                          fontWeight: 400,
                          marginTop: 2,
                        }}
                      >
                        {formatDate(v.date)}
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>
          <div
            style={{
              padding: '24px 28px',
              fontSize: 13,
              color: 'var(--fg2)',
              lineHeight: 1.7,
              fontFamily: 'var(--font-mono)',
              maxHeight: 480,
              overflow: 'auto',
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              {fullText?.version ?? versions[0]?.type ?? 'Latest version'}
              {fullText?.date ? ` · ${formatDate(fullText.date)}` : ''}
            </div>
            {fullText ? (
              <div
                style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: fullText.content }}
              />
            ) : (
              <p style={{ margin: 0 }}>
                Open the full text on GovInfo using the link above. The text body is hosted on the
                official source so revisions remain authoritative.
              </p>
            )}
            {latestUrl && (
              <a
                href={latestUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: 16,
                  color: 'var(--civiq-blue-active)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontSize: 13,
                }}
              >
                Read full bill text on GovInfo →
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
