/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bridging helpers between the roster corpus and the shapes the app already
 * serves. Kept separate from the reader so the rule below lives in one place
 * rather than being restated at each call site.
 */

import type { CorpusPerson } from './people-corpus';

/**
 * Unicameral bodies whose members hold the title Senator.
 *
 * Nebraska's 49 members are senators; DC's 13 are councilmembers. The v3 API
 * exposed this as `current_role.title`, which the old code read to keep
 * Nebraska's members out of a lower house that does not exist. The upstream
 * YAML has no title field, so the distinction is recorded here — two
 * jurisdictions, and no others are unicameral — to keep the corpus path
 * bucketing members exactly as the API path did.
 */
const UNICAMERAL_SENATE = new Set(['NE']);

/**
 * Which of the two buckets the rest of the app sorts a member into.
 *
 * Consumers model chambers as upper/lower. A unicameral member is neither, so
 * they are placed in the bucket matching their title; the state-legislature
 * route reads `isUnicameral` from the curated NCSL data and presents the single
 * chamber regardless, so this only decides which one a `?chamber=` filter
 * matches.
 */
export function chamberBucket(person: CorpusPerson): 'upper' | 'lower' {
  if (person.chamber === 'upper') return 'upper';
  if (person.chamber === 'legislature' && UNICAMERAL_SENATE.has(person.jurisdiction)) {
    return 'upper';
  }
  return 'lower';
}
