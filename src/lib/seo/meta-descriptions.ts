/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/** Google truncates meta descriptions past about 155 characters. */
export const META_DESCRIPTION_MAX = 155;

/** The first candidate that fits, most complete first; the last one otherwise. */
function firstThatFits(candidates: string[]): string {
  return (
    candidates.find(c => c.length <= META_DESCRIPTION_MAX) ?? candidates[candidates.length - 1]!
  );
}

export const ABOUT_META_DESCRIPTION =
  'Nonpartisan data on 535 members of Congress and 50 state legislatures, from 29 government sources and 11 open datasets.';

/** "Elissa Slotkin's record: bills, votes, campaign money and district federal funding, …" */
export function recordCardMetaDescription(name: string): string {
  return firstThatFits([
    `${name}'s record: bills, votes, campaign money and district federal funding, every number cited to Congress.gov, the FEC and USASpending.`,
    `${name}'s record: bills, votes, campaign money and district funding, cited to Congress.gov, the FEC and USASpending.`,
    `${name}'s record: bills, votes, campaign money and district funding, cited to government sources.`,
  ]);
}

/**
 * "Jason Hoskins is the Michigan State Representative for District 18
 * (Democratic). Phone …, email …." Contact first: it is what people searching
 * a legislator's name came for. Drops the closing summary, then the email,
 * then the phone, until it fits.
 */
export function stateLegislatorMetaDescription(opts: {
  name: string;
  stateName: string;
  role: string;
  district: string;
  party?: string | null;
  phone?: string | null;
  email?: string | null;
}): string {
  const identity =
    `${opts.name} is the ${opts.stateName} ${opts.role} for ${opts.district}` +
    (opts.party ? ` (${opts.party}).` : '.');
  const phone = opts.phone ? `Phone ${opts.phone}` : '';
  const email = opts.email ? `email ${opts.email}` : '';
  const joined = [phone, email].filter(Boolean).join(', ');
  const contact = joined.charAt(0).toUpperCase() + joined.slice(1);
  const withContact = contact ? `${identity} ${contact}.` : identity;
  return firstThatFits([
    `${withContact} Office address, committees, sponsored bills and votes.`,
    `${withContact} Committees, bills and votes.`,
    withContact,
    phone ? `${identity} ${phone}.` : identity,
    identity,
  ]);
}
