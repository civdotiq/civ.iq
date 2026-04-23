/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CURRENT_CONGRESS } from './congressional-constants';

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
 * Canonical form is `<congress>-<type>-<number>` (lowercase), e.g. `119-hr-7682`.
 * Recoverable inputs (redirected to canonical) are the shapes a user might
 * plausibly paste from an email, a share link, or a search result:
 *   - `<type>-<number>`         (e.g. `hr-7682`)   → assumes current Congress
 *   - `<type><number>`          (e.g. `HR7682`)    → assumes current Congress
 *   - `<type><number>-<congress>` (e.g. `hr7682-119`) → Congress explicit
 *
 * Anything else returns `{ kind: 'invalid' }` so the route can 404.
 */
export function parseBillSlug(slug: string): BillSlugResult {
  if (!slug) return { kind: 'invalid' };
  const normalized = slug.toLowerCase();

  const canonical = normalized.match(/^(\d{1,3})-([a-z]+)-(\d+)$/);
  if (canonical) {
    const [, congress, type, number] = canonical;
    if (isBillType(type!) && /^\d{1,3}$/.test(congress!) && Number(number) > 0) {
      return { kind: 'canonical', canonical: `${congress}-${type}-${number}` };
    }
    return { kind: 'invalid' };
  }

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
    if (isBillType(type!) && Number(number) > 0) {
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
