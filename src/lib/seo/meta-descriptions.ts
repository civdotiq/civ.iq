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
  'Nonpartisan data on Congress (535 voting members and 6 non-voting delegates) and 50 state legislatures, from 29 government sources and 11 open datasets.';

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

/**
 * Federal profile: "Democratic Representative Debbie Dingell (MI-6): voting
 * record, campaign finance and bills in the 119th Congress. Serves on 7
 * committees." Drops the committee count, then the Congress, until it fits.
 */
export function memberProfileMetaDescription(opts: {
  /** "Democratic", "Republican", "Independent" */
  party: string;
  /** "Senator", "Representative", "Delegate", "Resident Commissioner" */
  title: string;
  name: string;
  state: string;
  /** House district number; absent, "0" or "AL" for at-large seats and senators */
  district?: string | null;
  committeeCount?: number;
}): string {
  const atLarge =
    !opts.district || opts.district === '0' || /^at-?large$|^al$/i.test(opts.district);
  const seat = atLarge ? opts.state : `${opts.state}-${opts.district}`;
  const who = `${opts.party} ${opts.title} ${opts.name} (${seat})`.replace(/^\s+/, '');
  const n = opts.committeeCount ?? 0;
  const committees = n > 0 ? ` Serves on ${n} committee${n === 1 ? '' : 's'}.` : '';
  return firstThatFits([
    `${who}: voting record, campaign finance and bills in the 119th Congress.${committees}`,
    `${who}: voting record, campaign finance and bills in the 119th Congress.`,
    `${who}: voting record, campaign finance and bills.`,
  ]);
}
