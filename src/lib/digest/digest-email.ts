/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Weekly digest email templates.
 * Plain text + simple HTML, same deliverability-first approach as the
 * alert templates. Facts and links only — the issue page carries detail.
 */

import { formatWeekRange, parseWeekId } from './week';
import { issueHighlights } from './curate';
import type { DigestIssue } from './types';

/** Minimal escaping for model-derived text interpolated into email HTML. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
}

function getPhysicalAddress(): string {
  return process.env.ALERT_PHYSICAL_ADDRESS || 'CIV.IQ';
}

const DISCLAIMER = 'CIV.IQ presents public government data with citations to original sources.';

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function footer(unsubscribeUrl: string): { text: string; html: string } {
  const address = getPhysicalAddress();
  return {
    text: ['', '---', DISCLAIMER, `Unsubscribe: ${unsubscribeUrl}`, '', `CIV.IQ | ${address}`].join(
      '\n'
    ),
    html: [
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
      `<p style="font-size:12px;color:#6b7280;line-height:1.5">${DISCLAIMER}</p>`,
      `<p style="font-size:12px;color:#6b7280"><a href="${unsubscribeUrl}" style="color:#6b7280">Unsubscribe</a></p>`,
      `<p style="font-size:12px;color:#9ca3af">CIV.IQ | ${address}</p>`,
    ].join('\n'),
  };
}

export function digestConfirmationEmail(verifyUrl: string): EmailContent {
  const subject = 'Confirm your CIV.IQ weekly digest subscription';
  const text = [
    'Confirm your subscription to the CIV.IQ weekly digest — votes, bills,',
    'and money filings from public government records, every Monday.',
    '',
    `Confirm: ${verifyUrl}`,
    '',
    'This link expires in 48 hours. If you did not request this, ignore this email.',
    '',
    `CIV.IQ | ${getPhysicalAddress()}`,
  ].join('\n');
  const html = [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">',
    '<h2 style="font-size:18px">Confirm your weekly digest subscription</h2>',
    '<p style="line-height:1.6">Votes, bills, and money filings from public government records, every Monday.</p>',
    `<p><a href="${verifyUrl}" style="display:inline-block;border:2px solid #000;padding:10px 20px;color:#000;text-decoration:none;font-weight:600">Confirm subscription</a></p>`,
    '<p style="font-size:13px;color:#6b7280">This link expires in 48 hours. If you did not request this, ignore this email.</p>',
    `<p style="font-size:12px;color:#9ca3af">CIV.IQ | ${getPhysicalAddress()}</p>`,
    '</div>',
  ].join('\n');
  return { subject, text, html };
}

export function digestIssueEmail(issue: DigestIssue, unsubscribeUrl: string): EmailContent {
  const siteUrl = getSiteUrl();
  const issueUrl = `${siteUrl}/digest/${issue.state.toLowerCase()}/${issue.weekId}`;
  const range = parseWeekId(issue.weekId);
  const rangeLabel = range ? formatWeekRange(range) : issue.weekId;
  const subject = `This week in Congress — ${rangeLabel}`;

  const voteCount = issue.votes.length;
  const houseCount = issue.votes.filter(v => v.chamber === 'House').length;
  const senateCount = voteCount - houseCount;

  const textLines: string[] = [
    `CIV.IQ weekly digest — ${rangeLabel}`,
    `${issue.stateName} delegation focus`,
    '',
    `Roll-call votes: ${voteCount} (${houseCount} House, ${senateCount} Senate)`,
  ];
  const htmlParts: string[] = [
    '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">',
    `<h2 style="font-size:18px;margin-bottom:4px">This week in Congress</h2>`,
    `<p style="color:#6b7280;margin-top:0">${rangeLabel} · ${issue.stateName} delegation focus</p>`,
  ];

  const highlights = issueHighlights(issue.votes, issue.bills);
  if (highlights.closestVote) {
    const cv = highlights.closestVote;
    const line = `Closest vote (${cv.yeas}-${cv.nays}): ${cv.meaning?.decided ?? cv.question}`;
    textLines.push('', line);
    htmlParts.push(
      `<p style="border-left:3px solid #000;padding-left:10px;line-height:1.5"><strong>Closest vote (${cv.yeas}-${cv.nays})</strong> — ${escapeHtml(cv.meaning?.decided ?? cv.question)}</p>`
    );
  }

  const topVotes = issue.votes.slice(0, 5);
  if (topVotes.length > 0) {
    textLines.push('');
    htmlParts.push('<h3 style="font-size:15px">Votes</h3><ul style="padding-left:18px">');
    for (const vote of topVotes) {
      const line = `${vote.chamber}: ${vote.question} — ${vote.result} (${vote.yeas}-${vote.nays})`;
      textLines.push(`- ${line}`);
      htmlParts.push(
        `<li style="margin-bottom:8px;line-height:1.5"><a href="${siteUrl}/vote/${encodeURIComponent(vote.voteId)}" style="color:#111">${line}</a></li>`
      );
    }
    htmlParts.push('</ul>');
    if (voteCount > topVotes.length) {
      textLines.push(`  …and ${voteCount - topVotes.length} more`);
      htmlParts.push(
        `<p style="font-size:13px;color:#6b7280">…and ${voteCount - topVotes.length} more on the issue page.</p>`
      );
    }
  } else {
    textLines.push('No roll-call votes this week.');
    htmlParts.push('<p style="color:#6b7280">No roll-call votes this week.</p>');
  }

  if (issue.bills.length > 0) {
    textLines.push('', `Bills that moved: ${issue.bills.length}`);
    htmlParts.push(
      '<h3 style="font-size:15px">Bills that moved</h3><ul style="padding-left:18px">'
    );
    for (const bill of issue.bills.slice(0, 5)) {
      const label = `${bill.type} ${bill.number}: ${bill.title}`;
      textLines.push(`- ${label}`);
      htmlParts.push(
        `<li style="margin-bottom:8px;line-height:1.5"><a href="${siteUrl}/bill/${bill.billId}" style="color:#111">${label}</a></li>`
      );
    }
    htmlParts.push('</ul>');
  }

  if (issue.filings.length > 0) {
    textLines.push(
      '',
      `New FEC filings from the ${issue.stateName} delegation: ${issue.filings.length}`
    );
    htmlParts.push(
      `<h3 style="font-size:15px">New money filings (${issue.stateName} delegation)</h3><ul style="padding-left:18px">`
    );
    for (const filing of issue.filings.slice(0, 5)) {
      const label = `${filing.memberName} (${filing.party}) — ${filing.reportType ?? filing.formType ?? 'filing'}, received ${filing.receiptDate.slice(0, 10)}`;
      textLines.push(`- ${label}`);
      htmlParts.push(
        `<li style="margin-bottom:8px;line-height:1.5"><a href="${siteUrl}/finance/filings/${filing.fileNumber}" style="color:#111">${label}</a></li>`
      );
    }
    htmlParts.push('</ul>');
  }

  textLines.push('', `Full issue with every ${issue.stateName} position: ${issueUrl}`);
  htmlParts.push(
    `<p style="margin-top:16px"><a href="${issueUrl}" style="display:inline-block;border:2px solid #000;padding:10px 20px;color:#000;text-decoration:none;font-weight:600">Read the full issue</a></p>`
  );

  const foot = footer(unsubscribeUrl);
  textLines.push(foot.text);
  htmlParts.push(foot.html, '</div>');

  return { subject, text: textLines.join('\n'), html: htmlParts.join('\n') };
}
