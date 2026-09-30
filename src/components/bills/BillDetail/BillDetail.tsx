import Link from 'next/link';
import type { Bill } from '@/types/bill';
import { getBillVoteHref } from '@/types/bill';
import { RepLink } from '@/components/shared/links/EntityLinks';
import { CqButton, CqChip, CqDisclaimer, CqLabel, CqSourceTag, CqStat } from '@/components/cq';
import {
  computeBipartisanShare,
  daysBetween,
  findFinalPassageVote,
  formatDate,
  getStatusBadge,
} from './helpers';
import { SummaryPanel } from './SummaryPanel';
import { TimelinePanel } from './TimelinePanel';
import { VotePanel } from './VotePanel';
import { TextPanel } from './TextPanel';
import { RelatedPanel } from './RelatedPanel';
import { CosponsorsPanel } from './CosponsorsPanel';

interface BillDetailProps {
  bill: Bill;
}

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'Congress.gov', id: 'API v3' },
  { name: 'House Clerk', id: 'roll calls' },
  { name: 'GovInfo', id: 'text' },
];

export function BillDetail({ bill }: BillDetailProps) {
  const status = getStatusBadge(bill.status.current);
  const finalVote = findFinalPassageVote(bill.votes ?? []);
  const days = daysBetween(bill.introducedDate, bill.status.lastAction.date);
  const bipartisan = computeBipartisanShare(bill);
  const subjectsCount = bill.subjects?.length ?? 0;
  const cosponsorsCount = bill.cosponsors?.length ?? 0;
  const amendmentsCount = bill.amendments?.count ?? 0;
  const publicLaw = bill.laws?.[0];
  const finalVoteHref = finalVote ? getBillVoteHref(finalVote, bill.congress) : null;
  const committeesCount = bill.committees?.length ?? 0;
  // No amendment pages of our own yet — Congress.gov lists them per bill.
  const amendmentsHref = amendmentsCount > 0 && bill.url ? `${bill.url}/amendments` : null;

  const dataAsOf = formatDate(bill.lastUpdated || new Date().toISOString());

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <CqLabel>
          <Link href="/legislation" style={{ color: 'var(--civiq-blue-active)' }}>
            ← Legislation
          </Link>{' '}
          · {bill.chamber} · {bill.congress} Congress
        </CqLabel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px minmax(0, 1fr) 240px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <BillMark number={bill.number} congress={bill.congress} />

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}
          >
            <CqChip variant="info" filled={false} size="sm">
              {bill.chamber} · {bill.type.toUpperCase()}
            </CqChip>
            <CqChip variant={status.variant} filled={status.filled} size="sm">
              {status.label}
            </CqChip>
            {publicLaw && (
              <CqChip variant="info" filled={false} size="sm">
                Public law · {publicLaw.type}-{publicLaw.number}
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.05,
              margin: '0 0 10px',
              textTransform: 'uppercase',
              wordBreak: 'break-word',
            }}
          >
            {bill.title}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg2)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Introduced {formatDate(bill.introducedDate)} · Sponsor{' '}
            <RepLink
              bioguideId={bill.sponsor.representative.bioguideId}
              name={bill.sponsor.representative.name}
            />{' '}
            ·{' '}
            <a href="#cosponsors" style={{ color: 'var(--civiq-blue-active)' }}>
              {cosponsorsCount} co-sponsor{cosponsorsCount === 1 ? '' : 's'}
            </a>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            alignItems: 'flex-end',
          }}
        >
          {bill.url ? (
            <a
              href={bill.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="primary" size="sm">
                View on Congress.gov →
              </CqButton>
            </a>
          ) : (
            <CqButton variant="primary" size="sm" disabled>
              Source unavailable
            </CqButton>
          )}
          {bill.textUrl && (
            <a
              href={bill.textUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="secondary" size="sm">
                View full text →
              </CqButton>
            </a>
          )}
          <span
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {amendmentsCount} amendment{amendmentsCount === 1 ? '' : 's'}
            {committeesCount > 0 && (
              <>
                {' · '}
                <a href="#committees" style={{ color: 'var(--civiq-blue-active)' }}>
                  {committeesCount} committee{committeesCount === 1 ? '' : 's'}
                </a>
              </>
            )}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <StatCell index={0} href={finalVoteHref}>
          <CqStat
            label={finalVoteHref ? 'Final vote →' : 'Final vote'}
            value={finalVote?.votes ? `${finalVote.votes.yea}–${finalVote.votes.nay}` : '—'}
            caption={finalVote ? `${finalVote.chamber} · ${finalVote.result}` : 'No floor vote yet'}
            color={finalVote?.result === 'Passed' ? 'green' : 'ink'}
            size={32}
          />
        </StatCell>
        <StatCell index={1} href={cosponsorsCount > 0 ? '#cosponsors' : null}>
          <CqStat
            label={cosponsorsCount > 0 ? 'Co-sponsors →' : 'Co-sponsors'}
            value={cosponsorsCount}
            caption={
              bipartisan !== null && cosponsorsCount > 0
                ? `${bipartisan}% across the aisle`
                : 'Awaiting co-sponsors'
            }
            size={32}
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="Days in Congress"
            value={days !== null ? days : '—'}
            caption={`Introduced ${formatDate(bill.introducedDate)}`}
            size={32}
          />
        </StatCell>
        <StatCell index={3} href={subjectsCount > 0 ? '#subjects' : null}>
          <CqStat
            label={subjectsCount > 0 ? 'Subjects →' : 'Subjects'}
            value={subjectsCount > 0 ? subjectsCount : '—'}
            caption={subjectsCount > 0 ? bill.subjects.slice(0, 2).join(', ') : 'Subjects pending'}
            size={32}
          />
        </StatCell>
        <StatCell index={4} href={amendmentsHref}>
          <CqStat
            label={amendmentsHref ? 'Amendments ↗' : 'Amendments'}
            value={amendmentsCount}
            caption={amendmentsCount === 0 ? 'None recorded' : 'Filed amendments'}
            size={32}
          />
        </StatCell>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          borderBottom: '2px solid var(--ink)',
          background: 'var(--bg2)',
        }}
      >
        <PartyAlignmentRow
          index={0}
          label="D yeas"
          color="var(--civiq-green)"
          breakdown={
            finalVote?.breakdown
              ? {
                  yea: finalVote.breakdown.democratic.yea,
                  nay: finalVote.breakdown.democratic.nay,
                }
              : undefined
          }
        />
        <PartyAlignmentRow
          index={1}
          label="R yeas"
          color="var(--civiq-red)"
          breakdown={
            finalVote?.breakdown
              ? {
                  yea: finalVote.breakdown.republican.yea,
                  nay: finalVote.breakdown.republican.nay,
                }
              : undefined
          }
        />
        <PartyAlignmentRow
          index={2}
          label="I yeas"
          color="var(--data-vlau)"
          breakdown={
            finalVote?.breakdown
              ? {
                  yea: finalVote.breakdown.independent.yea,
                  nay: finalVote.breakdown.independent.nay,
                }
              : undefined
          }
        />
      </div>

      <SummaryPanel bill={bill} />
      <CosponsorsPanel bill={bill} />
      <TimelinePanel bill={bill} />
      <VotePanel bill={bill} />
      <TextPanel bill={bill} />
      <RelatedPanel bill={bill} />

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.97}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov + House Clerk + GovInfo"
        >
          {' '}
          See{' '}
          <Link href="/methodology" style={{ color: 'var(--civiq-blue-active)' }}>
            methodology
          </Link>
          .
        </CqDisclaimer>
      </div>
    </div>
  );
}

function StatCell({
  index,
  href,
  children,
}: {
  index: number;
  /** Where the number drills to: an in-page anchor, a vote page, or an external source. */
  href?: string | null;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties = {
    display: 'block',
    padding: '20px 18px',
    borderLeft: index === 0 ? 0 : '1px solid var(--line)',
    minWidth: 0,
    color: 'inherit',
    textDecoration: 'none',
  };
  if (!href) return <div style={style}>{children}</div>;
  if (href.startsWith('http')) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        className="hover:bg-[var(--bg2)]"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} style={style} className="hover:bg-[var(--bg2)]">
      {children}
    </Link>
  );
}

function PartyAlignmentRow({
  index,
  label,
  color,
  breakdown,
}: {
  index: number;
  label: string;
  color: string;
  breakdown?: { yea: number; nay: number };
}) {
  const total = breakdown ? breakdown.yea + breakdown.nay : 0;
  const display = breakdown && total > 0 ? `${breakdown.yea} of ${total}` : '—';
  return (
    <div
      style={{
        padding: '10px 18px',
        borderLeft: index === 0 ? 0 : '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: breakdown && total > 0 ? color : 'var(--fg4)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </span>
    </div>
  );
}

function BillMark({ number, congress }: { number: string; congress: string }) {
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
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: 'var(--civiq-blue)',
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
          fontWeight: 700,
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          BILL
        </div>
        <div
          style={{
            fontSize: 22,
            color: 'var(--fg1)',
            marginTop: 2,
            letterSpacing: '-0.01em',
          }}
        >
          {number}
        </div>
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
      </div>
    </div>
  );
}
