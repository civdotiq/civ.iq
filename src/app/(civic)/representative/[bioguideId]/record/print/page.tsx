/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Record Card print one-pager (mockup 1e)
 *
 * 8.5×11 handout for libraries / LWV candidate forums. Survives a B/W
 * photocopier: party is a bordered text label (never color alone), the
 * photo prints grayscale, and a QR code + human-readable URL point back to
 * the live record. Browser print → PDF; no client JS except the QR SVG and
 * the print button (hidden when printing).
 */

import { cache } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getRecordCardData, termOrdinal } from '@/features/record-card/record-card-data';
import { PrintQRCode } from '@/features/record-card/components/PrintQRCode';
import { PrintButton } from '@/features/record-card/components/PrintButton';
import { fmtDate, fmtInt, fmtMoney, fmtMoneyCompact, fmtPct } from '@/features/record-card/format';
import { getStateName } from '@/lib/data/us-states';

export const runtime = 'nodejs';
export const revalidate = 3600;

const getData = cache(async (bioguideId: string) => {
  if (!bioguideId || !/^[A-Za-z]\d{6}$/.test(bioguideId)) notFound();
  const data = await getRecordCardData(bioguideId);
  if (!data) notFound();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}): Promise<Metadata> {
  const { bioguideId } = await params;
  const data = await getData(bioguideId);
  return {
    title: `${data.member.name} — Incumbent Record Card (print)`,
    robots: { index: false, follow: true },
    alternates: { canonical: `https://civdotiq.org/representative/${bioguideId}/record` },
  };
}

const ROW = 'flex items-baseline justify-between border-t border-gray-400 py-[6px]';
const SEC = 'mt-grid-1 border-t-[3px] border-black pt-grid-1';
const SEC_TITLE = 'text-base font-bold tracking-[0.02em]';
const SRC = 'ml-grid-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600';
const LBL = 'text-[13px] tracking-[0.025em]';
const NUM = 'text-right text-[15px] font-bold tabular-nums';
const SMALL = 'text-[11px] text-gray-600 tracking-[0.025em]';

export default async function RecordCardPrintPage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;
  const data = await getData(bioguideId);
  const { member, legislation, voting, money, districtMoney, keyVotes } = data;

  const seatLabel =
    member.chamber === 'House'
      ? `${member.state}-${(member.district ?? '').padStart(2, '0')} · U.S. House`
      : `${getStateName(member.state) ?? member.state} — U.S. Senate`;
  const recordUrl = `https://civdotiq.org/representative/${member.bioguideId}/record`;

  const asOfParts: string[] = [];
  if (legislation) asOfParts.push(`Bills as of ${fmtDate(legislation.dataAsOf)}`);
  if (voting) asOfParts.push(`Votes as of ${fmtDate(voting.dataAsOf)}`);
  if (money) asOfParts.push(`FEC as of ${fmtDate(money.dataAsOf)}`);
  if (districtMoney) asOfParts.push(`Spending: FY${String(districtMoney.fiscalYear).slice(2)}`);

  return (
    <div className="min-h-screen bg-white text-black">
      <style>{`@page { size: letter; margin: 0.4in; } @media print { .no-print { display: none; } }`}</style>

      <div className="no-print mx-auto flex max-w-[816px] justify-end px-grid-2 py-grid-2">
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[816px] border-[3px] border-black">
        {/* Header */}
        <div className="px-grid-5 pb-grid-2 pt-grid-4">
          <div className="flex items-baseline justify-between text-xs font-bold uppercase tracking-[0.08em]">
            <span>CIV.IQ · Incumbent Record</span>
            <span>{member.currentCongress}th Congress</span>
          </div>
          <div className="mt-grid-2 flex gap-grid-3">
            {member.imageUrl && (
              <Image
                src={member.imageUrl}
                alt={member.name}
                width={120}
                height={120}
                unoptimized
                className="h-[120px] w-[120px] border-2 border-black object-cover grayscale"
              />
            )}
            <div className="flex-1">
              <h1 className="text-[32px] font-bold uppercase leading-[1.1] tracking-[0.02em]">
                {member.name}
              </h1>
              <div className="mt-grid-1 flex items-center gap-grid-1">
                <span className="border-2 border-black px-grid-1 py-[1px] text-xs font-bold uppercase tracking-[0.08em]">
                  {member.party}
                </span>
                <span className="text-sm font-medium tracking-[0.025em]">{seatLabel}</span>
              </div>
              <div className="mt-grid-1 text-sm tracking-[0.025em] text-gray-800">
                {member.inOfficeSince && (
                  <>
                    In office since {member.inOfficeSince} · {termOrdinal(member.termNumber)}
                    {member.onNextBallot && member.electionDayLabel && (
                      <> · On the {member.electionDayLabel} ballot</>
                    )}
                  </>
                )}
                {member.committees.length > 0 && (
                  <>
                    <br />
                    Serving on:{' '}
                    {member.committees
                      .map(c => c.name.replace(/^House Committee on |^Senate Committee on /, ''))
                      .join(', ')}
                    {member.subcommitteeCount > 0 && (
                      <> · {member.subcommitteeCount} subcommittees</>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="h-[8px] bg-black" />

        <div className="px-grid-5 py-grid-2">
          {/* Legislation */}
          <div>
            <div className={SEC_TITLE}>
              Legislation<span className={SRC}>Congress.gov</span>
            </div>
            {legislation ? (
              <>
                <div className={ROW}>
                  <span className={LBL}>
                    Bills introduced / cosponsored{' '}
                    {!legislation.firstTerm && (
                      <span className={SMALL}>(this Congress · career)</span>
                    )}
                  </span>
                  <span className={NUM}>
                    {fmtInt(legislation.current.introduced)} ·{' '}
                    {fmtInt(legislation.current.cosponsored)}
                    {!legislation.firstTerm && (
                      <span className="font-normal text-gray-700">
                        {'  '}({fmtInt(legislation.career.introduced)} ·{' '}
                        {fmtInt(legislation.career.cosponsored)})
                      </span>
                    )}
                  </span>
                </div>
                <div className={`${ROW} border-t-2 border-black`}>
                  <span className={`${LBL} font-bold`}>Enacted into law</span>
                  <span className={NUM}>
                    {fmtInt(legislation.current.enacted)}
                    {!legislation.firstTerm && (
                      <span className="font-normal text-gray-700">
                        {'  '}(career {fmtInt(legislation.career.enacted)})
                      </span>
                    )}
                  </span>
                </div>
                <div className={ROW}>
                  <span className={LBL}>Advanced past committee (reported out or further)</span>
                  <span className={NUM}>
                    {fmtInt(legislation.current.advancedPastCommittee)}
                    {!legislation.firstTerm && (
                      <span className="font-normal text-gray-700">
                        {'  '}(career {fmtInt(legislation.career.advancedPastCommittee)})
                      </span>
                    )}
                  </span>
                </div>
              </>
            ) : (
              <div className={`${ROW} ${SMALL}`}>Legislation data unavailable at print time.</div>
            )}
          </div>

          {/* Voting */}
          <div className={SEC}>
            <div className={SEC_TITLE}>
              Voting
              <span className={SRC}>
                {member.chamber === 'House' ? 'House Clerk' : 'Senate.gov'}
              </span>
            </div>
            {voting ? (
              <>
                <div className={ROW}>
                  <span className={LBL}>
                    Votes cast{' '}
                    <span className={SMALL}>
                      {fmtPct(voting.stats.missedPct)} missed
                      {voting.medianMissedPct !== null &&
                        ` · chamber median ${fmtPct(voting.medianMissedPct)}`}
                    </span>
                  </span>
                  <span className={NUM}>
                    {fmtInt(voting.stats.cast)} of {fmtInt(voting.stats.appearances)}
                  </span>
                </div>
                {voting.stats.partyAlignmentPct !== null && voting.partyLabel && (
                  <div className={ROW}>
                    <span className={LBL}>
                      With party majority{' '}
                      {voting.medianPartyAlignmentPct !== null && (
                        <span className={SMALL}>
                          {member.chamber} {voting.partyLabel} median{' '}
                          {fmtPct(voting.medianPartyAlignmentPct)}
                        </span>
                      )}
                    </span>
                    <span className={NUM}>{fmtPct(voting.stats.partyAlignmentPct)}</span>
                  </div>
                )}
              </>
            ) : (
              <div className={`${ROW} ${SMALL}`}>
                Chamber voting baselines unavailable at print time.
              </div>
            )}
          </div>

          {/* Campaign money */}
          <div className={SEC}>
            <div className={SEC_TITLE}>
              Campaign money
              <span className={SRC}>
                {money ? `FEC · ${money.cycle - 1}–${String(money.cycle).slice(2)}` : 'FEC'}
              </span>
            </div>
            {money ? (
              <>
                <div className={ROW}>
                  <span className={LBL}>
                    Total raised{' '}
                    <span className={SMALL}>
                      {money.smallDonorPct !== null && `${fmtPct(money.smallDonorPct)} small-donor`}
                      {money.pacPct !== null && ` · ${fmtPct(money.pacPct)} PAC`}
                      {money.largeIndividualPct !== null &&
                        ` · ${fmtPct(money.largeIndividualPct)} large-individual`}
                    </span>
                  </span>
                  <span className={NUM}>{fmtMoney(money.totalRaised)}</span>
                </div>
                {money.inStatePct !== null && money.outOfStatePct !== null && (
                  <div className={ROW}>
                    <span className={LBL}>In-state vs out-of-state</span>
                    <span className={NUM}>
                      {fmtPct(money.inStatePct)} / {fmtPct(money.outOfStatePct)}
                    </span>
                  </div>
                )}
                {money.topSectors.length > 0 && (
                  <div className={ROW}>
                    <span className={LBL}>
                      Top sectors: {money.topSectors.map(s => s.sector).join(' · ')}
                    </span>
                    <span className={`${NUM} font-normal text-gray-700`}>
                      {money.topSectors.map(s => fmtMoneyCompact(s.amount)).join(' · ')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className={`${ROW} ${SMALL}`}>
                No campaign finance filings found for this cycle.
              </div>
            )}
          </div>

          {/* Federal money */}
          <div className={SEC}>
            <div className={SEC_TITLE}>
              Their office, your money<span className={SRC}>USASpending</span>
            </div>
            {districtMoney ? (
              <div className={ROW}>
                <span className={LBL}>
                  {districtMoney.scope === 'state'
                    ? `${getStateName(districtMoney.areaId) ?? districtMoney.areaId} federal spending, FY ${districtMoney.fiscalYear}`
                    : `District federal grants + contracts, FY ${districtMoney.fiscalYear}`}
                </span>
                <span className={NUM}>{fmtMoneyCompact(districtMoney.totalSpending)}</span>
              </div>
            ) : (
              <div className={`${ROW} ${SMALL}`}>
                Federal spending data unavailable at print time.
              </div>
            )}
          </div>

          {/* Key votes */}
          {keyVotes.length > 0 && (
            <div className={SEC}>
              <div className={SEC_TITLE}>Recent votes</div>
              {keyVotes.map(kv => (
                <div
                  key={kv.voteId}
                  className="border-t border-gray-400 py-[6px] text-[12px] leading-normal tracking-[0.025em]"
                >
                  <b>
                    {kv.billTitle ?? kv.question}
                    {kv.billNumber && ` (${kv.billNumber})`} — voted{' '}
                    {kv.position === 'Yea' ? 'YES' : 'NO'}.
                  </b>{' '}
                  {kv.question} · {kv.result}, {fmtDate(kv.date)}.
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-[8px] bg-black" />

        {/* Footer: QR + sources */}
        <div className="flex items-center gap-grid-3 px-grid-5 py-grid-3">
          <div className="border-2 border-black p-[4px]">
            <PrintQRCode url={recordUrl} size={88} />
          </div>
          <div className="text-[11px] leading-[1.7] tracking-[0.025em] text-gray-800">
            <b className="text-[10px] font-bold uppercase tracking-[0.08em] text-black">Sources</b>{' '}
            · Congress.gov · FEC · USASpending ·{' '}
            {member.chamber === 'House' ? 'House Clerk' : 'Senate.gov'}
            <br />
            {asOfParts.join(' · ')}
            <br />
            Live page: {recordUrl.replace('https://', '')} · Found an error?
            civdotiq.org/corrections
          </div>
        </div>
      </div>

      <div className="h-grid-4" />
    </div>
  );
}
