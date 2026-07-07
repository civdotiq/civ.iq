/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Incumbent Record Card — the label (mockup 1a, strict FDA variant)
 *
 * A nutrition label for an incumbent: one continuous document, sections
 * divided by full-width black bars (8px header/footer, 3px between
 * sections), border hierarchy 3/2/1px, 0px radius, tabular numerals.
 *
 * Trust rules enforced here:
 * - Every headline number gets a ProvenancePopover (source, as-of, record link).
 * - Empty ≠ zero: a missing section renders a designed sentence, never "0".
 * - Baselines beside every stat that could mislead alone.
 * - Party color appears ONLY on the party chip.
 * - First-term members: the career column is removed (mockup 1g).
 */

import Image from 'next/image';
import Link from 'next/link';
import {
  BillLink,
  CommitteeLink,
  SectorLink,
  VoteLink,
} from '@/components/shared/links/EntityLinks';
import { getStateName } from '@/lib/data/us-states';
import type { RecordCardData } from '../record-card-data';
import { termOrdinal } from '../record-card-data';
import { ProvenancePopover } from './ProvenancePopover';

// ── Formatting ───────────────────────────────────────────────────────

const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtMoney = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const fmtMoneyCompact = (n: number) =>
  n >= 1_000_000_000
    ? `$${(n / 1_000_000_000).toFixed(2)}B`
    : n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${Math.round(n / 1_000)}K`;
const fmtPct = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}%`;
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** Congress.gov public bill URL from an enacted-bill example. */
const CONGRESS_GOV_TYPE_SLUGS: Record<string, string> = {
  HR: 'house-bill',
  S: 'senate-bill',
  HJRES: 'house-joint-resolution',
  SJRES: 'senate-joint-resolution',
  HCONRES: 'house-concurrent-resolution',
  SCONRES: 'senate-concurrent-resolution',
  HRES: 'house-resolution',
  SRES: 'senate-resolution',
};
function congressGovBillUrl(congress: number, type: string, number: string): string | undefined {
  const slug = CONGRESS_GOV_TYPE_SLUGS[type.toUpperCase().replace(/[.\s]/g, '')];
  if (!slug) return undefined;
  return `https://www.congress.gov/bill/${congress}th-congress/${slug}/${number}`;
}

// ── Layout primitives (the label grammar) ────────────────────────────

const Bar8 = () => <div className="h-[8px] bg-black" aria-hidden="true" />;
const Bar3 = () => <div className="h-[3px] bg-black" aria-hidden="true" />;

function SectionTitle({ title, source }: { title: string; source: string }) {
  return (
    <div className="text-lg font-bold tracking-[0.02em]">
      {title}{' '}
      <span className="ml-grid-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">
        {source}
      </span>
    </div>
  );
}

/** Right-aligned numeric cell. */
function Num({ children, dim, big }: { children: React.ReactNode; dim?: boolean; big?: boolean }) {
  return (
    <div
      className={`text-right tabular-nums ${
        dim
          ? 'text-base font-normal text-gray-600'
          : big
            ? 'text-2xl font-bold'
            : 'text-lg font-bold'
      }`}
    >
      {children}
    </div>
  );
}

function EmptyCell({ children }: { children: React.ReactNode }) {
  return <div className="text-right text-sm tracking-[0.025em] text-gray-500">{children}</div>;
}

function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-300 py-grid-1 text-xs tracking-[0.025em] text-status-warning">
      {children}
    </div>
  );
}

const GRID3 = 'grid grid-cols-[1fr_128px_128px] items-baseline gap-x-grid-2';
const GRID2 = 'grid grid-cols-[1fr_160px] items-baseline gap-x-grid-2';
const ROW = 'border-t border-gray-300 py-grid-1';
const HERO_ROW = 'border-t-2 border-black py-grid-1';
const SUB_LBL = 'pl-grid-3 text-sm text-gray-600';
const COL_H =
  'pb-[4px] pt-grid-1 text-right text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500';

// ── Header ───────────────────────────────────────────────────────────

function CardHeader({ data }: { data: RecordCardData }) {
  const { member } = data;
  const isDem = member.party.toUpperCase().startsWith('D');
  const isRep = member.party.toUpperCase().startsWith('R');
  const seatLabel =
    member.chamber === 'House'
      ? `${member.state}-${(member.district ?? '').padStart(2, '0')} · U.S. House`
      : `${getStateName(member.state) ?? member.state} — U.S. Senate`;

  return (
    <div className="p-grid-3">
      <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.08em]">
        <span>Incumbent Record</span>
        <span>{member.currentCongress}th Congress</span>
      </div>
      <div className="mt-grid-2 flex gap-grid-3">
        {member.imageUrl ? (
          <Image
            src={member.imageUrl}
            alt={member.name}
            width={120}
            height={120}
            className="h-[120px] w-[120px] border-2 border-black bg-gray-100 object-cover"
          />
        ) : (
          <div className="flex h-[120px] w-[120px] items-center justify-center border-2 border-black bg-gray-100 text-center text-[11px] uppercase tracking-[0.08em] text-gray-500">
            No official
            <br />
            photo
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-[32px] font-bold uppercase leading-[1.1] tracking-[0.02em]">
            {member.name}
          </h1>
          <div className="mt-grid-1 flex items-center gap-grid-1">
            <span
              className={`inline-block rounded-[2px] px-grid-1 py-[2px] text-xs font-bold uppercase tracking-[0.08em] text-white ${
                isDem ? 'bg-party-dem' : isRep ? 'bg-party-rep' : 'bg-party-ind'
              }`}
            >
              {member.party}
            </span>
            <span className="text-sm font-medium tracking-[0.025em]">{seatLabel}</span>
          </div>
          <div className="mt-grid-1 text-sm leading-normal tracking-[0.025em] text-gray-600">
            {member.inOfficeSince && (
              <>
                In office since {member.inOfficeSince} ·{' '}
                <b className="font-medium text-gray-900">{termOrdinal(member.termNumber)}</b>
                {member.chamber === 'Senate' && member.senateClass && (
                  <>
                    {' '}
                    · Class {['I', 'II', 'III'][member.senateClass - 1] ?? member.senateClass},
                    6-year term
                  </>
                )}
                {member.onNextBallot && member.electionDayLabel && (
                  <> · On the {member.electionDayLabel} ballot</>
                )}
                {!member.onNextBallot && member.nextElectionYear && (
                  <> · Next election {member.nextElectionYear}</>
                )}
                <br />
              </>
            )}
            {member.committees.length > 0 && (
              <>
                Serving on:{' '}
                {member.committees.map((c, i) => (
                  <span key={c.name}>
                    {i > 0 && ', '}
                    <CommitteeLink
                      code={c.id}
                      name={c.name.replace(/^House Committee on |^Senate Committee on /, '')}
                    />
                  </span>
                ))}
                {member.subcommitteeCount > 0 && (
                  <>
                    {' '}
                    · {member.subcommitteeCount} subcommittee
                    {member.subcommitteeCount === 1 ? '' : 's'}
                  </>
                )}
              </>
            )}
          </div>
          {member.status === 'retired' && (
            <div className="mt-grid-1 text-xs font-bold uppercase tracking-[0.08em] text-status-warning">
              {member.statusDetail || 'Not seeking re-election'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Section A: Legislation ───────────────────────────────────────────

function LegislationSection({ data }: { data: RecordCardData }) {
  const leg = data.legislation;
  const congress = data.member.currentCongress;

  if (!leg) {
    return (
      <div className="px-grid-3 py-grid-1">
        <SectionTitle title="Legislation" source="Congress.gov" />
        <div className={ROW}>
          <div className="text-sm tracking-[0.025em] text-gray-500">
            Legislation data is unavailable right now — Congress.gov did not respond. The record is
            unchanged; try again shortly.
          </div>
        </div>
      </div>
    );
  }

  const single = leg.firstTerm;
  const grid = single ? GRID2 : GRID3;
  const enactedHref = leg.enactedExample
    ? congressGovBillUrl(
        leg.enactedExample.congress,
        leg.enactedExample.type,
        leg.enactedExample.number
      )
    : undefined;

  return (
    <div className="px-grid-3 py-grid-1">
      <div className={`${grid} items-baseline`}>
        <SectionTitle title="Legislation" source="Congress.gov" />
        {single ? (
          <div className={COL_H}>{congress}th Congress = career (first term)</div>
        ) : (
          <>
            <div className={COL_H}>This Congress ({congress}th)</div>
            <div className={COL_H}>Career</div>
          </>
        )}
      </div>

      <div className={`${ROW} ${grid}`}>
        <div className="text-[15px] tracking-[0.025em]">Bills introduced</div>
        <Num>{fmtInt(leg.current.introduced)}</Num>
        {!single && <Num dim>{fmtInt(leg.career.introduced)}</Num>}
      </div>
      <div className={`${ROW} ${grid}`}>
        <div className="text-[15px] tracking-[0.025em]">Bills cosponsored</div>
        <Num>{fmtInt(leg.current.cosponsored)}</Num>
        {!single && <Num dim>{fmtInt(leg.career.cosponsored)}</Num>}
      </div>

      <div className={`${HERO_ROW} ${grid}`}>
        <div className="text-base font-bold tracking-[0.025em]">Enacted into law</div>
        <Num big>
          <ProvenancePopover
            info={{
              source: 'Congress.gov',
              asOf: `Bill status as of ${fmtDate(leg.dataAsOf)}`,
              href: enactedHref,
              linkLabel: leg.enactedExample
                ? `View bill: ${leg.enactedExample.type} ${leg.enactedExample.number} — ${leg.enactedExample.latestAction.replace(/\.$/, '')}`
                : undefined,
            }}
          >
            {fmtInt(leg.current.enacted)}
          </ProvenancePopover>
        </Num>
        {!single && <Num dim>{fmtInt(leg.career.enacted)}</Num>}
      </div>
      <div className={`${grid} py-grid-1`}>
        <div className={SUB_LBL}>from bills sponsored</div>
        <Num dim>{fmtInt(leg.current.enactedFromSponsored)}</Num>
        {!single && <Num dim>{fmtInt(leg.career.enactedFromSponsored)}</Num>}
      </div>
      <div className={`${ROW} ${grid}`}>
        <div className={SUB_LBL}>from bills cosponsored</div>
        <Num dim>{fmtInt(leg.current.enactedFromCosponsored)}</Num>
        {!single && <Num dim>{fmtInt(leg.career.enactedFromCosponsored)}</Num>}
      </div>

      <Caveat>
        {leg.current.enacted === 0 && leg.firstTerm
          ? 'First-term members rarely have enacted laws yet — committee progress is the meaningful early signal. '
          : 'Most laws pass by being folded into larger bills, so raw "enacted" counts run low. '}
        <Link href="/methodology" className="text-civiq-blue hover:underline">
          Methodology →
        </Link>
      </Caveat>

      <div className={`${ROW} ${grid}`}>
        <div className="text-[15px] tracking-[0.025em]">
          Advanced past committee
          <small className="block text-xs tracking-[0.025em] text-gray-500">
            Reported out or further — the step between introduced and enacted
          </small>
        </div>
        <Num>{fmtInt(leg.current.advancedPastCommittee)}</Num>
        {!single && <Num dim>{fmtInt(leg.career.advancedPastCommittee)}</Num>}
      </div>

      {leg.cosponsoredSample.truncated && (
        <Caveat>
          Cosponsored status detail is based on the {fmtInt(leg.cosponsoredSample.fetched)} most
          recent of {fmtInt(leg.cosponsoredSample.apiTotal)} career cosponsorships.
        </Caveat>
      )}
    </div>
  );
}

// ── Section B: Voting ────────────────────────────────────────────────

function VotingSectionBlock({ data }: { data: RecordCardData }) {
  const v = data.voting;
  const source =
    data.member.chamber === 'House' ? 'House Clerk roll calls' : 'Senate.gov roll calls';

  if (!v) {
    return (
      <div className="px-grid-3 py-grid-1">
        <SectionTitle title="Voting" source={source} />
        <div className={ROW}>
          <div className="text-sm tracking-[0.025em] text-gray-500">
            Chamber-wide voting baselines haven&apos;t been computed yet, so this member&apos;s
            record can&apos;t be shown with the peer comparison it needs. Check back shortly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-grid-3 py-grid-1">
      <SectionTitle title="Voting" source={source} />
      <div className={`${ROW} ${GRID2}`}>
        <div className="text-[15px] tracking-[0.025em]">Votes cast</div>
        <div>
          <Num>
            <ProvenancePopover
              info={{
                source: data.member.chamber === 'House' ? 'House Clerk' : 'Senate.gov',
                asOf: `${v.coverageLabel ? `Roll calls, ${v.coverageLabel}` : `Roll calls`} through ${fmtDate(v.dataAsOf)}`,
                href: `/representative/${data.member.bioguideId}/votes`,
                linkLabel: 'Full voting record',
              }}
            >
              {fmtInt(v.stats.cast)} of {fmtInt(v.stats.appearances)}
            </ProvenancePopover>
          </Num>
          <div className="text-right text-xs tracking-[0.025em] text-gray-500">
            {fmtPct(v.stats.missedPct)} missed
            {v.medianMissedPct !== null && <> · chamber median {fmtPct(v.medianMissedPct)}</>}
          </div>
        </div>
      </div>
      {v.stats.partyAlignmentPct !== null && v.partyLabel && (
        <div className={`${ROW} ${GRID2}`}>
          <div className="text-[15px] tracking-[0.025em]">Votes with party majority</div>
          <div>
            <Num>{fmtPct(v.stats.partyAlignmentPct)}</Num>
            {v.medianPartyAlignmentPct !== null && (
              <div className="text-right text-xs tracking-[0.025em] text-gray-500">
                {data.member.chamber} {v.partyLabel} median {fmtPct(v.medianPartyAlignmentPct)}
              </div>
            )}
          </div>
        </div>
      )}
      {!v.fullCoverage && (
        <Caveat>
          Based on the {fmtInt(v.rollCallsAnalyzed)} most recent roll calls, not the full Congress.
        </Caveat>
      )}
    </div>
  );
}

// ── Section C: Campaign money ────────────────────────────────────────

function MoneySection({ data }: { data: RecordCardData }) {
  const m = data.money;
  const cycleLabel = m ? `FEC · ${m.cycle - 1}–${String(m.cycle).slice(2)} cycle` : 'FEC';

  if (!m) {
    return (
      <div className="px-grid-3 py-grid-1">
        <SectionTitle title="Campaign money" source="FEC" />
        <div className={`${HERO_ROW} ${GRID2}`}>
          <div className="text-base font-bold tracking-[0.025em]">Total raised this cycle</div>
          <EmptyCell>No campaign finance filings found for this cycle</EmptyCell>
        </div>
        <div className={`${ROW} ${GRID2}`}>
          <div className="text-[15px] tracking-[0.025em]">Donor mix</div>
          <EmptyCell>Unavailable until a filing exists</EmptyCell>
        </div>
        <div className={`${ROW} ${GRID2}`}>
          <div className="text-[15px] tracking-[0.025em]">Top contributing sectors</div>
          <EmptyCell>Unavailable until a filing exists</EmptyCell>
        </div>
        <Caveat>
          Candidates who raise or spend under $5,000 are not required to file with the FEC.
        </Caveat>
      </div>
    );
  }

  return (
    <div className="px-grid-3 py-grid-1">
      <SectionTitle title="Campaign money" source={cycleLabel} />
      <div className={`${HERO_ROW} ${GRID2}`}>
        <div className="text-base font-bold tracking-[0.025em]">Total raised this cycle</div>
        <Num big>
          <ProvenancePopover
            info={{
              source: 'FEC',
              asOf: `Filings as of ${fmtDate(m.dataAsOf)}`,
              href: `https://www.fec.gov/data/candidate/${m.fecCandidateId}/`,
              linkLabel: 'View filings at FEC.gov',
            }}
          >
            {fmtMoney(m.totalRaised)}
          </ProvenancePopover>
        </Num>
      </div>
      <div className={`${GRID2} py-grid-1`}>
        <div className={SUB_LBL}>Small-donor share (&lt;$200)</div>
        {m.smallDonorPct !== null ? (
          <Num dim>{fmtPct(m.smallDonorPct)}</Num>
        ) : (
          <EmptyCell>Not itemized yet</EmptyCell>
        )}
      </div>
      <div className={`${ROW} ${GRID2}`}>
        <div className={SUB_LBL}>PAC share</div>
        {m.pacPct !== null ? (
          <Num dim>{fmtPct(m.pacPct)}</Num>
        ) : (
          <EmptyCell>Not itemized yet</EmptyCell>
        )}
      </div>
      <div className={`${ROW} ${GRID2}`}>
        <div className={SUB_LBL}>Large-individual share</div>
        {m.largeIndividualPct !== null ? (
          <Num dim>{fmtPct(m.largeIndividualPct)}</Num>
        ) : (
          <EmptyCell>Not itemized yet</EmptyCell>
        )}
      </div>
      <div className={`${ROW} ${GRID2}`}>
        <div className="text-[15px] tracking-[0.025em]">In-state vs out-of-state</div>
        {m.inStatePct !== null && m.outOfStatePct !== null ? (
          <Num>
            {fmtPct(m.inStatePct)}{' '}
            <span className="text-base font-normal text-gray-600">/ {fmtPct(m.outOfStatePct)}</span>
          </Num>
        ) : (
          <EmptyCell>State data not yet reported</EmptyCell>
        )}
      </div>
      {m.topSectors.map((s, i) => (
        <div key={s.sector} className={`${ROW} ${GRID2}`}>
          <div className={i === 0 ? 'text-[15px] tracking-[0.025em]' : SUB_LBL}>
            {i === 0 && 'Top sector: '}
            <SectorLink sector={s.sector} />
          </div>
          <Num dim={i > 0}>{fmtMoney(s.amount)}</Num>
        </div>
      ))}
    </div>
  );
}

// ── Section D: Their office, your money ──────────────────────────────

function DistrictMoneySection({ data }: { data: RecordCardData }) {
  const d = data.districtMoney;
  const isSenate = data.member.chamber === 'Senate';

  return (
    <div className="px-grid-3 py-grid-1">
      <SectionTitle title="Their office, your money" source="USASpending.gov" />
      {d ? (
        <>
          <div className={`${ROW} ${GRID2}`}>
            <div className="text-[15px] tracking-[0.025em]">
              {d.scope === 'state'
                ? `${getStateName(d.areaId) ?? d.areaId} federal spending, FY ${d.fiscalYear}`
                : `District federal grants + contracts, FY ${d.fiscalYear}`}
            </div>
            <Num big>
              <ProvenancePopover
                info={{
                  source: 'USASpending.gov',
                  asOf: `Fiscal year ${d.fiscalYear} to date`,
                  href: d.scope === 'state' ? `/states/${d.areaId}` : `/districts/${d.areaId}`,
                  linkLabel: d.scope === 'state' ? 'State detail' : 'District spending detail',
                }}
              >
                {fmtMoneyCompact(d.totalSpending)}
              </ProvenancePopover>
            </Num>
          </div>
          {d.approximate && (
            <Caveat>
              Exact district aggregate was unavailable; this is the sum of the top-10 contracts and
              grants only.
            </Caveat>
          )}
        </>
      ) : (
        <div className={ROW}>
          <div className="text-sm tracking-[0.025em] text-gray-500">
            {isSenate
              ? 'Statewide federal spending data is unavailable right now — USASpending.gov did not respond.'
              : 'District federal spending data is unavailable right now — USASpending.gov did not respond.'}
          </div>
        </div>
      )}
      <div className="border-t border-dashed border-gray-400 py-grid-1 text-xs uppercase tracking-[0.08em] text-gray-400">
        Reserved — office spending (MRA) · staff count
      </div>
    </div>
  );
}

// ── Section E: Key votes ─────────────────────────────────────────────

function KeyVotesSection({ data }: { data: RecordCardData }) {
  if (data.keyVotes.length === 0 && !data.ptr) return null;

  return (
    <div className="px-grid-3 py-grid-1">
      <SectionTitle title="Recent votes" source="Rule-based selection" />
      {data.keyVotes.map(kv => (
        <div key={kv.voteId} className="border-t border-gray-300 py-grid-2 first:border-t-0">
          <div className="flex justify-between gap-grid-2">
            <b className="text-[15px]">
              {kv.billId && kv.billTitle ? (
                <BillLink billId={kv.billId} title={`${kv.billTitle} (${kv.billNumber})`} />
              ) : (
                (kv.billTitle ?? kv.question)
              )}
            </b>
            <span className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.08em]">
              Voted {kv.position === 'Yea' ? 'yes' : 'no'}
            </span>
          </div>
          <p className="mt-[4px] text-sm leading-normal tracking-[0.025em] text-gray-600">
            {kv.question} · {kv.result} · {fmtDate(kv.date)} ·{' '}
            <VoteLink voteId={kv.voteId} label="Vote record →" />
          </p>
        </div>
      ))}
      {data.ptr && (
        <div className="border-t border-gray-300 py-grid-2 text-[13px] tracking-[0.025em] text-gray-600">
          Stock trades:{' '}
          {data.ptr.transactions > 0 ? (
            <>
              {fmtInt(data.ptr.transactions)} transaction{data.ptr.transactions === 1 ? '' : 's'}{' '}
              reported in STOCK Act filings, last {data.ptr.coverageYears} years
            </>
          ) : (
            <>no transactions in STOCK Act filings, last {data.ptr.coverageYears} years</>
          )}
          {data.ptr.paperFilings > 0 && (
            <>
              {' '}
              (+{fmtInt(data.ptr.paperFilings)} paper filing
              {data.ptr.paperFilings === 1 ? '' : 's'} not machine-readable)
            </>
          )}
          .{' '}
          <Link
            href={`/representative/${data.member.bioguideId}?tab=finance`}
            className="text-civiq-blue hover:underline"
          >
            Filings →
          </Link>{' '}
          ·{' '}
          <Link href="/methodology" className="text-civiq-blue hover:underline">
            Methodology →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────

function CardFooter({ data }: { data: RecordCardData }) {
  const asOfParts: string[] = [];
  if (data.legislation) asOfParts.push(`Bills as of ${fmtDate(data.legislation.dataAsOf)}`);
  if (data.voting) asOfParts.push(`Votes as of ${fmtDate(data.voting.dataAsOf)}`);
  if (data.money) asOfParts.push(`FEC as of ${fmtDate(data.money.dataAsOf)}`);
  if (data.districtMoney)
    asOfParts.push(`Spending: FY${String(data.districtMoney.fiscalYear).slice(2)}`);

  return (
    <div className="px-grid-3 py-grid-2 text-xs leading-[1.7] tracking-[0.025em] text-gray-600">
      <b className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-900">Sources</b> ·
      Congress.gov · FEC · USASpending ·{' '}
      {data.member.chamber === 'House' ? 'House Clerk' : 'Senate.gov'}
      <br />
      {asOfParts.join(' · ')}
      <br />
      <span className="text-gray-900">
        civdotiq.org/representative/{data.member.bioguideId}/record
      </span>{' '}
      ·{' '}
      <Link href="/methodology" className="text-civiq-blue hover:underline">
        Methodology
      </Link>{' '}
      ·{' '}
      <Link href="/corrections" className="text-civiq-blue hover:underline">
        Report an error
      </Link>{' '}
      ·{' '}
      <Link
        href={`/representative/${data.member.bioguideId}/record/print`}
        className="text-civiq-blue hover:underline"
      >
        Print
      </Link>
    </div>
  );
}

// ── The card ─────────────────────────────────────────────────────────

export function RecordCardLabel({ data }: { data: RecordCardData }) {
  return (
    <article className="border-[3px] border-black bg-white text-gray-900 tabular-nums">
      <CardHeader data={data} />
      <Bar8 />
      <LegislationSection data={data} />
      <Bar3 />
      <VotingSectionBlock data={data} />
      <Bar3 />
      <MoneySection data={data} />
      <Bar3 />
      <DistrictMoneySection data={data} />
      <Bar3 />
      <KeyVotesSection data={data} />
      <Bar8 />
      <CardFooter data={data} />
    </article>
  );
}
