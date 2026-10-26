/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Links to the same person on other sites, built only from identifiers in
 * our own records: congress-legislators (keyed by Bioguide ID) for members of
 * Congress, the Open States people corpus for state legislators. Nothing is
 * matched by name.
 */

export function bioguideUrl(bioguideId: string): string {
  return `https://bioguide.congress.gov/search/bio/${bioguideId}`;
}

/** English Wikipedia article for a congress-legislators `wikipedia` title. */
export function wikipediaUrl(title: string | null | undefined): string | null {
  const t = title?.trim();
  return t ? `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}` : null;
}

/** Wikidata entity page for a QID such as "Q22250". */
export function wikidataUrl(qid: string | null | undefined): string | null {
  const q = qid?.trim();
  return q && /^Q\d+$/.test(q) ? `https://www.wikidata.org/wiki/${q}` : null;
}

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Open States profile for an `ocd-person/<uuid>` ID. Open States person URLs
 * carry the UUID in base62 (openstates.org now forwards them to Plural, which
 * runs Open States); the name part is only cosmetic.
 */
export function openStatesUrl(personId: string, name: string): string | null {
  const uuid = personId.replace(/^ocd-person\//, '').replace(/-/g, '');
  if (!/^[0-9a-f]{32}$/i.test(uuid)) return null;
  // Long division of the 128-bit value (as hex digits) by 62, without BigInt.
  let digits = uuid.split('').map(h => parseInt(h, 16));
  let code = '';
  while (digits.some(d => d > 0)) {
    const quotient: number[] = [];
    let remainder = 0;
    for (const d of digits) {
      const value = remainder * 16 + d;
      const q = Math.floor(value / 62);
      remainder = value % 62;
      if (quotient.length > 0 || q > 0) quotient.push(q);
    }
    code = BASE62[remainder] + code;
    digits = quotient;
  }
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `https://openstates.org/person/${slug}-${code}/`;
}

/** The full `ocd-person/<uuid>` form of an Open States person ID. */
export function openStatesId(personId: string): string {
  return personId.startsWith('ocd-person/') ? personId : `ocd-person/${personId}`;
}

/**
 * Legislatures whose own site is on neither .gov nor .us. Minnesota's Senate
 * lives at senate.mn; its member list (senate.mn/api/members) gives the same
 * member_bio.html?mem_id= pages Open States records.
 */
const LEGISLATURE_HOSTS = new Set(['www.senate.mn', 'senate.mn']);

/**
 * The legislator's page on the legislature's own site: the first link on a
 * government domain (.gov, a state.xx.us address, or a host in
 * LEGISLATURE_HOSTS) that belongs to this legislator alone. Links several legislators share (a chamber's email
 * directory) and party caucus sites are skipped; null when none qualifies.
 */
export function officialLegislatureUrl(
  links: ReadonlyArray<string>,
  sharedLinks: ReadonlySet<string>
): string | null {
  for (const link of links) {
    let host: string;
    try {
      host = new URL(link).hostname;
    } catch {
      continue;
    }
    if (!/\.gov$|\.us$/i.test(host) && !LEGISLATURE_HOSTS.has(host.toLowerCase())) continue;
    if (sharedLinks.has(link)) continue;
    return link;
  }
  return null;
}
