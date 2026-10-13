/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CURRENT_CONGRESS, isServedCongress } from './congressional-constants';

const BILL_TYPES = ['hr', 's', 'hres', 'sres', 'hjres', 'sjres', 'hconres', 'sconres'] as const;

type BillType = (typeof BILL_TYPES)[number];

function isBillType(value: string): value is BillType {
  return (BILL_TYPES as readonly string[]).includes(value);
}

export type BillSlugResult =
  | { kind: 'canonical'; canonical: string }
  | { kind: 'recoverable'; canonical: string }
  | { kind: 'invalid' };

/**
 * Validate and normalize a bill URL slug.
 *
 * Canonical form is `<congress>-<type>-<number>` all lowercase, e.g.
 * `119-hr-7682`. Exactly that form is treated as canonical. Uppercase
 * variants, shapes without all three segments, and shapes without dashes
 * are recoverable (308 to canonical). Anything else returns
 * `{ kind: 'invalid' }` so the route can 404. So does any Congress outside
 * the served range (see isServedCongress): older bills have no page here.
 *
 * Recoverable inputs:
 *   - `119-HR-7682`                    (canonical shape, wrong case)
 *   - `<type>-<number>`   `hr-7682`    → current-Congress canonical
 *   - `<type><number>`    `HR7682`     → current-Congress canonical
 *   - `<type><number>-<congress>` `hr7682-119` → Congress explicit
 */
export function parseBillSlug(slug: string): BillSlugResult {
  if (!slug) return { kind: 'invalid' };

  const canonicalMatch = slug.match(/^(\d{1,3})-([A-Za-z]+)-(\d+)$/);
  if (canonicalMatch) {
    const [, congress, rawType, number] = canonicalMatch;
    const type = rawType!.toLowerCase();
    if (!isBillType(type) || Number(number) <= 0) return { kind: 'invalid' };
    if (!isServedCongress(Number(congress))) return { kind: 'invalid' };
    const canonical = `${congress}-${type}-${number}`;
    return slug === canonical
      ? { kind: 'canonical', canonical }
      : { kind: 'recoverable', canonical };
  }

  const normalized = slug.toLowerCase();

  const typeDashNumber = normalized.match(/^([a-z]+)-(\d+)$/);
  if (typeDashNumber) {
    const [, type, number] = typeDashNumber;
    if (isBillType(type!) && Number(number) > 0) {
      return {
        kind: 'recoverable',
        canonical: `${CURRENT_CONGRESS.number}-${type}-${number}`,
      };
    }
    return { kind: 'invalid' };
  }

  const typeNumberDashCongress = normalized.match(/^([a-z]+)(\d+)-(\d{1,3})$/);
  if (typeNumberDashCongress) {
    const [, type, number, congress] = typeNumberDashCongress;
    if (isBillType(type!) && Number(number) > 0 && isServedCongress(Number(congress))) {
      return { kind: 'recoverable', canonical: `${congress}-${type}-${number}` };
    }
    return { kind: 'invalid' };
  }

  const typeNumber = normalized.match(/^([a-z]+)(\d+)$/);
  if (typeNumber) {
    const [, type, number] = typeNumber;
    if (isBillType(type!) && Number(number) > 0) {
      return {
        kind: 'recoverable',
        canonical: `${CURRENT_CONGRESS.number}-${type}-${number}`,
      };
    }
    return { kind: 'invalid' };
  }

  return { kind: 'invalid' };
}

const CONGRESS_GOV_TYPE_SLUGS: Record<BillType, string> = {
  hr: 'house-bill',
  s: 'senate-bill',
  hres: 'house-resolution',
  sres: 'senate-resolution',
  hjres: 'house-joint-resolution',
  sjres: 'senate-joint-resolution',
  hconres: 'house-concurrent-resolution',
  sconres: 'senate-concurrent-resolution',
};

function congressOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/**
 * Where a reference to a bill (`<congress>-<type>-<number>`) should link.
 * Bills in a served Congress get their CIV.IQ page. Bills from other
 * Congresses (e.g. an earlier version listed under "related bills") have no
 * page here, so they link out to Congress.gov instead of to a 404.
 * Null when the id doesn't name a bill.
 */
export function billLinkTarget(slug: string): { href: string; external: boolean } | null {
  const parsed = parseBillSlug(slug);
  if (parsed.kind !== 'invalid') return { href: `/bill/${parsed.canonical}`, external: false };

  const match = slug.toLowerCase().match(/^(\d{1,3})-([a-z]+)-(\d+)$/);
  if (!match) return null;
  const [, congress, type = '', number] = match;
  if (!isBillType(type) || Number(number) <= 0 || Number(congress) <= 0) return null;
  return {
    href: `https://www.congress.gov/bill/${congressOrdinal(Number(congress))}-congress/${CONGRESS_GOV_TYPE_SLUGS[type]}/${number}`,
    external: true,
  };
}

// ── Federal Register document numbers ───────────────────────────────────

/** Federal Register document numbers are `YYYY-NNNNN(N)`. */
const FR_DOCUMENT_NUMBER = /^\d{4}-\d{5,6}$/;

export function isValidFederalRegisterDocumentNumber(documentNumber: string): boolean {
  return FR_DOCUMENT_NUMBER.test(documentNumber);
}

// ── FEC committee IDs ───────────────────────────────────────────────────

/** FEC committee IDs are `C` followed by exactly 8 digits, e.g. `C00401224`. */
const FEC_COMMITTEE_ID = /^C\d{8}$/;

export function isValidFecCommitteeId(committeeId: string): boolean {
  return FEC_COMMITTEE_ID.test(committeeId);
}

// ── Congressional committee systemCodes ─────────────────────────────────

/**
 * Congressional committee systemCodes (Congress.gov / THOMAS): 4 uppercase
 * letters starting with H (House), S (Senate), or J (Joint), optionally
 * followed by a 2-digit subcommittee suffix. Examples: `HSBA`, `SSJU`,
 * `JSEC`, `SSJU05`. Disjoint from FEC IDs, which start with `C`.
 */
const CONGRESSIONAL_SYSTEM_CODE = /^[HSJ][A-Z]{3}(?:\d{2})?$/;

export function isCongressionalSystemCode(slug: string): boolean {
  return CONGRESSIONAL_SYSTEM_CODE.test(slug);
}
