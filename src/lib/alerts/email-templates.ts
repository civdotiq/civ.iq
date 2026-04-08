/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Email templates for the alert system.
 * Plain text + simple HTML for maximum deliverability.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
const FROM_NAME = 'CIV.IQ';
// CAN-SPAM requires a physical mailing address
const PHYSICAL_ADDRESS = 'CIV.IQ, PO Box 7775, Arlington, VA 22207';
const METHODOLOGY_DISCLAIMER =
  'CIV.IQ presents public government data. Correlation does not indicate causation.';

interface ConfirmationEmailParams {
  verifyUrl: string;
  entityNames: string[];
}

interface UnsubscribeFooterParams {
  unsubscribeUrl: string;
  manageUrl: string;
}

export interface VoteAlertParams {
  representativeName: string;
  bioguideId: string;
  vote: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  billTitle: string;
  billId: string;
  date: string;
  context?: string;
}

export interface FinanceAlertParams {
  representativeName: string;
  bioguideId: string;
  totalRaised: string;
  period: string;
  topContributor?: string;
}

export interface LegislationAlertParams {
  representativeName: string;
  bioguideId: string;
  action: 'sponsored' | 'cosponsored';
  billTitle: string;
  billId: string;
  date: string;
}

function footer({ unsubscribeUrl, manageUrl }: UnsubscribeFooterParams): {
  text: string;
  html: string;
} {
  return {
    text: [
      '',
      '---',
      METHODOLOGY_DISCLAIMER,
      `Manage preferences: ${manageUrl}`,
      `Unsubscribe: ${unsubscribeUrl}`,
      '',
      `${FROM_NAME} | ${PHYSICAL_ADDRESS}`,
    ].join('\n'),
    html: [
      '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />',
      `<p style="font-size:12px;color:#6b7280;line-height:1.5">${METHODOLOGY_DISCLAIMER}</p>`,
      `<p style="font-size:12px;color:#6b7280">`,
      `<a href="${manageUrl}" style="color:#3ea2d4">Manage preferences</a> · `,
      `<a href="${unsubscribeUrl}" style="color:#3ea2d4">Unsubscribe</a>`,
      `</p>`,
      `<p style="font-size:11px;color:#9ca3af">${FROM_NAME} | ${PHYSICAL_ADDRESS}</p>`,
    ].join('\n'),
  };
}

export function confirmationEmail({ verifyUrl, entityNames }: ConfirmationEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const entityList = entityNames.join(', ');

  return {
    subject: 'Confirm your CIV.IQ alert subscription',
    text: [
      `You requested alerts from CIV.IQ for: ${entityList}.`,
      '',
      'To confirm your subscription, visit this link:',
      verifyUrl,
      '',
      'This link expires in 48 hours.',
      '',
      `If you did not request this, ignore this email.`,
      '',
      `${FROM_NAME} | ${PHYSICAL_ADDRESS}`,
    ].join('\n'),
    html: [
      `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">`,
      `<h2 style="font-size:18px;font-weight:600;margin-bottom:16px">Confirm your alert subscription</h2>`,
      `<p style="font-size:14px;line-height:1.6;color:#374151">You requested alerts from CIV.IQ for: <strong>${entityList}</strong>.</p>`,
      `<p style="margin:24px 0">`,
      `<a href="${verifyUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;font-size:14px;font-weight:600;text-decoration:none;border:2px solid #000">Confirm subscription</a>`,
      `</p>`,
      `<p style="font-size:13px;color:#6b7280">This link expires in 48 hours. If you did not request this, ignore this email.</p>`,
      `<p style="font-size:11px;color:#9ca3af;margin-top:24px">${FROM_NAME} | ${PHYSICAL_ADDRESS}</p>`,
      `</div>`,
    ].join('\n'),
  };
}

export function voteAlertEmail(
  params: VoteAlertParams,
  urls: UnsubscribeFooterParams
): { subject: string; text: string; html: string } {
  const { representativeName, bioguideId, vote, billTitle, billId, date, context } = params;
  const detailUrl = `${SITE_URL}/ask/how-did-vote/${bioguideId}`;
  const profileUrl = `${SITE_URL}/representative/${bioguideId}`;
  const footerContent = footer(urls);

  const contextLine = context ? ` ${context}` : '';

  return {
    subject: `${representativeName} voted ${vote} on ${billTitle}`,
    text: [
      `${representativeName} voted ${vote} on ${billTitle} (${billId}) on ${date}.${contextLine}`,
      '',
      `View details: ${detailUrl}`,
      `Profile: ${profileUrl}`,
      footerContent.text,
    ].join('\n'),
    html: [
      `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">`,
      `<p style="font-size:14px;line-height:1.6"><strong>${representativeName}</strong> voted <strong>${vote}</strong> on <strong>${billTitle}</strong> (${billId}) on ${date}.${contextLine}</p>`,
      `<p style="margin:16px 0">`,
      `<a href="${detailUrl}" style="color:#3ea2d4;font-size:14px;font-weight:500">View details</a>`,
      ` · <a href="${profileUrl}" style="color:#3ea2d4;font-size:14px">Full profile</a>`,
      `</p>`,
      footerContent.html,
      `</div>`,
    ].join('\n'),
  };
}

export function financeAlertEmail(
  params: FinanceAlertParams,
  urls: UnsubscribeFooterParams
): { subject: string; text: string; html: string } {
  const { representativeName, bioguideId, totalRaised, period, topContributor } = params;
  const profileUrl = `${SITE_URL}/representative/${bioguideId}`;
  const financeUrl = `${SITE_URL}/ask/campaign-contributions/${bioguideId}`;
  const footerContent = footer(urls);

  const topLine = topContributor ? ` Top contributor: ${topContributor}.` : '';

  return {
    subject: `New FEC filing for ${representativeName}`,
    text: [
      `New FEC filing: ${representativeName} raised ${totalRaised} in the ${period} cycle.${topLine}`,
      '',
      `View finance details: ${financeUrl}`,
      `Profile: ${profileUrl}`,
      footerContent.text,
    ].join('\n'),
    html: [
      `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">`,
      `<p style="font-size:14px;line-height:1.6">New FEC filing: <strong>${representativeName}</strong> raised <strong>${totalRaised}</strong> in the ${period} cycle.${topLine}</p>`,
      `<p style="margin:16px 0">`,
      `<a href="${financeUrl}" style="color:#3ea2d4;font-size:14px;font-weight:500">View finance details</a>`,
      ` · <a href="${profileUrl}" style="color:#3ea2d4;font-size:14px">Full profile</a>`,
      `</p>`,
      footerContent.html,
      `</div>`,
    ].join('\n'),
  };
}

export function legislationAlertEmail(
  params: LegislationAlertParams,
  urls: UnsubscribeFooterParams
): { subject: string; text: string; html: string } {
  const { representativeName, bioguideId, action, billTitle, billId, date } = params;
  const profileUrl = `${SITE_URL}/representative/${bioguideId}`;
  const billUrl = `${SITE_URL}/bill/${billId}`;
  const footerContent = footer(urls);

  return {
    subject: `${representativeName} ${action} ${billTitle}`,
    text: [
      `${representativeName} ${action} ${billTitle} (${billId}) on ${date}.`,
      '',
      `View bill: ${billUrl}`,
      `Profile: ${profileUrl}`,
      footerContent.text,
    ].join('\n'),
    html: [
      `<div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">`,
      `<p style="font-size:14px;line-height:1.6"><strong>${representativeName}</strong> ${action} <strong>${billTitle}</strong> (${billId}) on ${date}.</p>`,
      `<p style="margin:16px 0">`,
      `<a href="${billUrl}" style="color:#3ea2d4;font-size:14px;font-weight:500">View bill</a>`,
      ` · <a href="${profileUrl}" style="color:#3ea2d4;font-size:14px">Full profile</a>`,
      `</p>`,
      footerContent.html,
      `</div>`,
    ].join('\n'),
  };
}
