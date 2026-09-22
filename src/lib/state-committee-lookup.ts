/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State committee detail lookup.
 *
 * The detail page used to collapse every failure into `null` and then
 * `notFound()`, so an OpenStates quota 429 or outage was served as HTTP 404 —
 * telling crawlers and citizens the committee does not exist. This keeps the
 * two cases apart: `not_found` only when the id is malformed or upstream
 * answered without it, `unavailable` when upstream could not answer.
 */

import { openStatesAPI, type OpenStatesCommittee } from '@/lib/openstates-api';
import { decodeBase64Url } from '@/lib/url-encoding';
import logger from '@/lib/logging/simple-logger';
import type { StateCommittee, StateParty } from '@/types/state-legislature';

export type StateCommitteeLookup =
  | { status: 'found'; committee: StateCommittee }
  | { status: 'not_found' }
  | { status: 'unavailable' };

const OCD_ORG_PREFIX = 'ocd-organization/';

function normalizeParty(party: string | null | undefined): StateParty | undefined {
  if (!party) return undefined;
  if (party === 'Democratic' || party === 'Democrat') return 'Democratic';
  if (party === 'Republican') return 'Republican';
  if (party === 'Independent') return 'Independent';
  if (party === 'Green') return 'Green';
  if (party === 'Libertarian') return 'Libertarian';
  return 'Other';
}

export async function lookupStateCommittee(
  state: string,
  base64Id: string
): Promise<StateCommitteeLookup> {
  if (!/^[a-z]{2}$/i.test(state)) return { status: 'not_found' };

  // Reject malformed ids before spending OpenStates quota on them.
  const committeeId = decodeBase64Url(base64Id);
  if (!committeeId.startsWith(OCD_ORG_PREFIX) || committeeId.length <= OCD_ORG_PREFIX.length) {
    return { status: 'not_found' };
  }

  let committee: OpenStatesCommittee | null;
  try {
    committee = await openStatesAPI.getCommitteeById(committeeId, true, state);
  } catch (error) {
    logger.error('[StateCommitteeLookup] OpenStates unavailable', error as Error, {
      state,
      committeeId,
    });
    return { status: 'unavailable' };
  }

  if (!committee) {
    logger.warn('[StateCommitteeLookup] Committee not found', { state, committeeId });
    return { status: 'not_found' };
  }

  return {
    status: 'found',
    committee: {
      id: committee.id,
      name: committee.name,
      chamber: committee.chamber as 'upper' | 'lower',
      state: state.toUpperCase(),
      classification: committee.classification === 'committee' ? ('standing' as const) : undefined,
      members: committee.memberships?.map(m => ({
        legislator_id: m.person_id || '',
        legislator_name: m.person_name,
        role: m.role as 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member',
        party: normalizeParty(m.person?.party),
      })),
      website: committee.links?.[0]?.url,
      sources: committee.sources?.map(s => ({
        url: s.url,
        note: s.note || undefined,
      })),
      parent_id: committee.parent_id || undefined,
    },
  };
}
