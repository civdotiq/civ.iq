/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * EmbedBillCard — mast-less render chassis for /embed/bill/[billId]?v=new.
 * Receives a fully-resolved `Bill` object from the page; the data layer is
 * untouched. Width-responsive via CSS @container queries (see embed-print.css):
 *   ≤ 360 → single column stack
 *   ≥ 360 → sponsor + final-vote side-by-side
 *   ≥ 600 → adds compact vote-breakdown bar
 */

import type { Bill, BillStatus, BillVote } from '@/types/bill';
import { CqLabel, CqChip, CqPlainReading } from '@/components/cq';
import { EmbedFooter } from '../EmbedFooter';
import '../embed-print.css';

interface EmbedBillCardProps {
  bill: Bill;
}

const STATUS_LABELS: Record<BillStatus, string> = {
  introduced: 'Introduced',
  referred: 'In Committee',
  reported: 'Reported',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed_both: 'Passed Both',
  enacted: 'Enacted',
  failed: 'Failed',
  vetoed: 'Vetoed',
  pocket_vetoed: 'Pocket Vetoed',
};

// Chip color encodes outcome (enacted = passed, failed/vetoed = failed,
// everything else = in-flight info). Not party — see design-system.md.
function statusVariant(status: BillStatus): 'd' | 'r' | 'info' {
  if (status === 'enacted' || status === 'passed_both') return 'd';
  if (status === 'failed' || status === 'vetoed' || status === 'pocket_vetoed') return 'r';
  return 'info';
}

function partyToken(party: string): 'd' | 'r' | 'i' {
  if (party === 'Democratic' || party === 'Democrat' || party === 'D') return 'd';
  if (party === 'Republican' || party === 'R') return 'r';
  return 'i';
}

function formatDate(date: string | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function findFinalVote(votes: BillVote[]): BillVote | null {
  if (!votes.length) return null;
  const passing = votes.filter(
    v => v.result === 'Passed' || v.result === 'Agreed to' || v.result === 'Failed'
  );
  const candidates = passing.length > 0 ? passing : votes;
  return (
    candidates.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ??
    null
  );
}

export function EmbedBillCard({ bill }: EmbedBillCardProps) {
  const status = bill.status.current;
  const statusLabel = STATUS_LABELS[status] || status;
  const finalVote = findFinalVote(bill.votes);
  const canonicalUrl = `https://civdotiq.org/bill/${bill.id}`;
  const sponsor = bill.sponsor?.representative;
  const lastAction = bill.status.lastAction;

  return (
    <main className="civiq-embed-shell">
      <div className="civiq-embed-body">
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: 'var(--fg1)',
              }}
            >
              {bill.number}
            </span>
            <CqChip variant={statusVariant(status)} size="sm">
              {statusLabel}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {bill.chamber}
            </CqChip>
          </div>
          <h1
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              margin: 0,
              color: 'var(--fg1)',
            }}
          >
            {bill.title}
          </h1>
        </div>

        <div className="civiq-embed-grid-2" style={{ marginBottom: 14 }}>
          <div
            style={{
              padding: '10px 12px',
              border: '1px solid var(--line)',
              background: 'var(--bg2)',
            }}
          >
            <CqLabel>Sponsor</CqLabel>
            {sponsor ? (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{sponsor.name}</div>
                <div style={{ marginTop: 4 }}>
                  <CqChip variant={partyToken(sponsor.party)} size="sm">
                    {sponsor.party.charAt(0)} ·{' '}
                    {sponsor.chamber === 'Senate'
                      ? sponsor.state
                      : `${sponsor.state}-${sponsor.district ?? ''}`}
                  </CqChip>
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 6,
                }}
              >
                Sponsor data unavailable
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 12px',
              border: '1px solid var(--line)',
              background: 'var(--bg2)',
            }}
          >
            <CqLabel>Final {bill.chamber.toLowerCase()} vote</CqLabel>
            {finalVote?.votes && !finalVote.votesUnavailable ? (
              <>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color:
                      finalVote.result === 'Failed' ? 'var(--civiq-red)' : 'var(--civiq-green)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    marginTop: 4,
                    lineHeight: 1.0,
                  }}
                >
                  {finalVote.votes.yea}–{finalVote.votes.nay}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 4,
                  }}
                >
                  {formatDate(finalVote.date)}
                </div>
              </>
            ) : (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 6,
                }}
              >
                No floor vote yet
              </div>
            )}
          </div>
        </div>

        {finalVote?.breakdown && !finalVote.votesUnavailable && (
          <div
            className="civiq-embed-only-wide"
            style={{
              marginBottom: 14,
              padding: '10px 12px',
              border: '1px solid var(--line)',
              background: 'var(--bg2)',
            }}
          >
            <CqLabel>Party breakdown</CqLabel>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <div>
                <span style={{ color: 'var(--civiq-green)', fontWeight: 700 }}>D</span>{' '}
                <span style={{ color: 'var(--fg2)' }}>
                  {finalVote.breakdown.democratic.yea} yea · {finalVote.breakdown.democratic.nay}{' '}
                  nay
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--civiq-red)', fontWeight: 700 }}>R</span>{' '}
                <span style={{ color: 'var(--fg2)' }}>
                  {finalVote.breakdown.republican.yea} yea · {finalVote.breakdown.republican.nay}{' '}
                  nay
                </span>
              </div>
            </div>
          </div>
        )}

        {lastAction?.description && (
          <CqPlainReading label="LATEST ACTION.">
            {lastAction.description}
            {lastAction.date && (
              <span
                style={{
                  marginLeft: 6,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}
              >
                ({formatDate(lastAction.date)})
              </span>
            )}
          </CqPlainReading>
        )}
      </div>

      <EmbedFooter
        canonicalUrl={canonicalUrl}
        timestamp={formatDate(bill.lastUpdated) || formatDate(new Date().toISOString())}
      />
    </main>
  );
}
