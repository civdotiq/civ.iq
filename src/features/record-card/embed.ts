/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Record Card Embed (mockup 1d)
 *
 * Self-contained HTML for a ~600px iframe: one stat per record section with
 * its baseline, sources footer, and a single "Full record →" CTA. Served by
 * /api/mesh/embed/record/[bioguideId] for newsroom embedding.
 *
 * Same trust rules as the page: unavailable sections are omitted or show a
 * designed sentence — never zeros. Party color appears only on the chip.
 */

import type { RecordCardData } from './record-card-data';

const SITE = 'https://civdotiq.org';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

const STYLES = `
  * { box-sizing: border-box; margin: 0; }
  body { background: #fff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
         color: #111827; font-variant-numeric: tabular-nums lining-nums; }
  a { color: #3ea2d4; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .rc { border: 3px solid #000; background: #fff; }
  .head { display: flex; gap: 16px; padding: 16px 24px; align-items: center; }
  .photo { width: 64px; height: 64px; border: 2px solid #000; object-fit: cover; background: #f3f4f6; }
  .name { font-size: 20px; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; }
  .meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; font-size: 13px; }
  .chip { padding: 1px 8px; border-radius: 2px; font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase; color: #fff; }
  .kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
            text-align: right; color: #6b7280; margin-left: auto; }
  .bar8 { height: 8px; background: #000; }
  .bar3 { height: 3px; background: #000; }
  .rows { padding: 8px 24px 16px; }
  .cols { display: grid; grid-template-columns: 1fr 96px 96px; gap: 0 16px; }
  .col-h { padding: 8px 0 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
           text-transform: uppercase; color: #6b7280; text-align: right; }
  .row { display: grid; grid-template-columns: 1fr 192px; gap: 0 16px; align-items: baseline;
         border-top: 1px solid #d1d5db; padding: 8px 0; }
  .row.r3 { grid-template-columns: 1fr 96px 96px; }
  .lbl { font-size: 14px; letter-spacing: 0.025em; }
  .lbl small { display: block; font-size: 11px; color: #6b7280; }
  .num { text-align: right; font-weight: 700; font-size: 16px; color: #000; }
  .num.dim { font-weight: 400; color: #4b5563; font-size: 14px; }
  .empty { text-align: right; font-size: 12px; color: #6b7280; }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 16px;
          padding: 12px 24px; font-size: 11px; line-height: 1.6; color: #4b5563;
          letter-spacing: 0.025em; }
  .cta { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
         white-space: nowrap; }
`;

export function renderRecordEmbed(data: RecordCardData): string {
  const { member, legislation, voting, money, districtMoney } = data;
  const p = member.party.toUpperCase();
  const chipColor = p.startsWith('D') ? '#2563eb' : p.startsWith('R') ? '#e11d07' : '#6b7280';
  const seat =
    member.chamber === 'House'
      ? `${member.state}-${(member.district ?? '').padStart(2, '0')} · U.S. House`
      : `${member.state} · U.S. Senate`;
  const recordPath = `/representative/${member.bioguideId}/record`;

  const rows: string[] = [];

  if (legislation) {
    rows.push(
      `<div class="cols"><div></div><div class="col-h">${legislation.currentCongress}th</div><div class="col-h">${legislation.firstTerm ? '' : 'Career'}</div></div>`
    );
    rows.push(
      `<div class="row r3"><div class="lbl">Enacted into law</div><div class="num">${fmtInt(legislation.current.enacted)}</div><div class="num dim">${legislation.firstTerm ? '' : fmtInt(legislation.career.enacted)}</div></div>`
    );
    rows.push(
      `<div class="row r3"><div class="lbl">Advanced past committee</div><div class="num">${fmtInt(legislation.current.advancedPastCommittee)}</div><div class="num dim">${legislation.firstTerm ? '' : fmtInt(legislation.career.advancedPastCommittee)}</div></div>`
    );
  }

  if (voting) {
    const missedBase =
      voting.medianMissedPct !== null
        ? `chamber median missed: ${fmtPct(voting.medianMissedPct)}`
        : `${fmtPct(voting.stats.missedPct)} missed`;
    rows.push(
      `<div class="row"><div class="lbl">Votes cast<small>${esc(missedBase)}</small></div><div class="num">${fmtInt(voting.stats.cast)} of ${fmtInt(voting.stats.appearances)}</div></div>`
    );
    if (voting.stats.partyAlignmentPct !== null && voting.partyLabel) {
      const alignBase =
        voting.medianPartyAlignmentPct !== null
          ? `${member.chamber} ${voting.partyLabel} median ${fmtPct(voting.medianPartyAlignmentPct)}`
          : 'party-majority votes';
      rows.push(
        `<div class="row"><div class="lbl">With party majority<small>${esc(alignBase)}</small></div><div class="num">${fmtPct(voting.stats.partyAlignmentPct)}</div></div>`
      );
    }
  }

  if (money) {
    const mixBase =
      money.smallDonorPct !== null && money.pacPct !== null
        ? `${fmtPct(money.smallDonorPct)} small-donor · ${fmtPct(money.pacPct)} PAC`
        : `${money.cycle - 1}–${String(money.cycle).slice(2)} cycle`;
    rows.push(
      `<div class="row"><div class="lbl">Raised this cycle<small>${esc(mixBase)}</small></div><div class="num">${fmtMoney(money.totalRaised)}</div></div>`
    );
  } else {
    rows.push(
      `<div class="row"><div class="lbl">Campaign money</div><div class="empty">No FEC filings found this cycle</div></div>`
    );
  }

  if (districtMoney) {
    rows.push(
      `<div class="row"><div class="lbl">${districtMoney.scope === 'state' ? 'State' : 'District'} federal funds, FY ${districtMoney.fiscalYear}</div><div class="num">${fmtMoneyCompact(districtMoney.totalSpending)}</div></div>`
    );
  }

  const asOf = voting ? fmtDate(voting.dataAsOf) : fmtDate(data.generatedAt);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${STYLES}</style>
</head>
<body>
  <div class="rc">
    <div class="head">
      ${member.imageUrl ? `<img class="photo" src="${esc(member.imageUrl)}" alt="${esc(member.name)}">` : ''}
      <div>
        <div class="name">${esc(member.name)}</div>
        <div class="meta">
          <span class="chip" style="background:${chipColor}">${esc(member.party)}</span>
          <span>${esc(seat)}${member.inOfficeSince ? ` · since ${esc(member.inOfficeSince)}` : ''}</span>
        </div>
      </div>
      <div class="kicker">Incumbent<br>Record</div>
    </div>
    <div class="bar8"></div>
    <div class="rows">${rows.join('')}</div>
    <div class="bar3"></div>
    <div class="foot">
      <span>Congress.gov · FEC · USASpending · ${member.chamber === 'House' ? 'House Clerk' : 'Senate.gov'}<br>as of ${esc(asOf)} · <a href="${SITE}/methodology" target="_blank" rel="noopener">Methodology</a></span>
      <a class="cta" href="${SITE}${recordPath}" target="_blank" rel="noopener">Full record →</a>
    </div>
  </div>
</body>
</html>`;
}
