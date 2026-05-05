import Link from 'next/link';
import type { Bill } from '@/types/bill';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { formatDate, pickCboHeadline } from './helpers';

interface SummaryPanelProps {
  bill: Bill;
}

const ASIDE_LINK_STYLE: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--civiq-blue-active)',
  fontFamily: 'var(--font-mono)',
  textDecoration: 'underline',
  textDecorationThickness: 1,
  textUnderlineOffset: 3,
  display: 'inline-block',
  marginTop: 4,
};

export function SummaryPanel({ bill }: SummaryPanelProps) {
  const summaryText = bill.summary?.text;
  const sponsorParty = bill.sponsor.representative.party?.toUpperCase().charAt(0) ?? '';
  const cboHeadline = pickCboHeadline(bill);
  const subjects = bill.subjects ?? [];

  return (
    <section style={{ marginTop: 32 }}>
      <PanelHeader
        eyebrow="Plain summary · 8th-grade reading level"
        title="What this bill does"
        source={{ name: 'Congress.gov', id: 'API v3' }}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          alignItems: 'flex-start',
        }}
      >
        <div>
          {summaryText ? (
            <SummaryBody text={summaryText} />
          ) : (
            <CqPlainReading label="DATA UNAVAILABLE.">
              Congress.gov has not yet published an official summary for this bill. Plain-language
              summaries appear after the Congressional Research Service files one.
            </CqPlainReading>
          )}

          {subjects.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <CqLabel>Subjects</CqLabel>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {subjects.slice(0, 12).map(s => (
                  <CqChip key={s} variant="ink" filled={false} size="sm">
                    {s}
                  </CqChip>
                ))}
                {subjects.length > 12 && (
                  <CqChip variant="ink" filled={false} size="sm">
                    +{subjects.length - 12} more
                  </CqChip>
                )}
              </div>
            </div>
          )}
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ border: '2px solid var(--ink)', padding: '18px' }}>
            <CqLabel>Sponsor</CqLabel>
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: '48px 1fr',
                gap: 10,
              }}
            >
              <SponsorMark name={bill.sponsor.representative.name} partyCode={sponsorParty} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {bill.sponsor.representative.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {partyLabel(sponsorParty)} · {bill.sponsor.representative.state}
                  {bill.sponsor.representative.district
                    ? `-${String(bill.sponsor.representative.district).padStart(2, '0')}`
                    : ''}
                </div>
                {bill.sponsor.representative.bioguideId && (
                  <Link
                    href={`/representative/${bill.sponsor.representative.bioguideId}`}
                    style={ASIDE_LINK_STYLE}
                  >
                    View profile →
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              borderLeft: '6px solid var(--civiq-blue)',
              background: 'var(--bg2)',
              padding: '14px 16px',
            }}
          >
            <CqLabel>Most recent action</CqLabel>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                marginTop: 6,
                lineHeight: 1.3,
              }}
            >
              {bill.status.lastAction.description || 'Action unavailable'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatDate(bill.status.lastAction.date)}
              {bill.status.lastAction.chamber ? ` · ${bill.status.lastAction.chamber}` : ''}
            </div>
          </div>

          <div style={{ border: '2px solid var(--ink)', padding: '16px' }}>
            <CqLabel>Cost estimate</CqLabel>
            {cboHeadline ? (
              <>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 8,
                    color: 'var(--fg1)',
                    lineHeight: 1.35,
                  }}
                >
                  {cboHeadline}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--fg3)',
                    marginTop: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  CBO · official estimate filed
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--fg3)',
                  marginTop: 8,
                  lineHeight: 1.45,
                }}
              >
                CBO has not filed a cost estimate for this bill.
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

function SummaryBody({ text }: { text: string }) {
  // Congress.gov summaries arrive as HTML — render only the first paragraph
  // visibly, the rest is collapsed for readability. Sanitization is the
  // service's responsibility (see bill.service.ts).
  return (
    <div
      style={{
        fontSize: 15,
        lineHeight: 1.6,
        color: 'var(--fg1)',
      }}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

function SponsorMark({ name, partyCode }: { name: string; partyCode: string }) {
  const initials =
    name
      .split(' ')
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '·';
  const stripeColor =
    partyCode === 'D'
      ? 'var(--civiq-green)'
      : partyCode === 'R'
        ? 'var(--civiq-red)'
        : 'var(--data-vlau)';
  return (
    <div
      style={{
        width: 48,
        height: 48,
        border: '2px solid var(--ink)',
        background: 'var(--bg1)',
        position: 'relative',
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: stripeColor,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--fg1)',
        }}
      >
        {initials}
      </div>
    </div>
  );
}

function partyLabel(code: string): string {
  if (code === 'D') return 'Democrat';
  if (code === 'R') return 'Republican';
  if (code === 'I') return 'Independent';
  return 'Unaffiliated';
}
