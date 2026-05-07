/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Loader for the redesigned RollCallDetail. Reuses the existing
 * vote.service so federal House + Senate roll calls share one ingestion path.
 */

import { findBioguideId } from '@/lib/data/senate-member-mappings';
import logger from '@/lib/logging/simple-logger';
import { getVoteDetailsService, type UnifiedVoteDetail } from '@/lib/services/vote.service';
import type { PartyTally, Position, RollCallDetailData, RollCallMember } from './types';

function emptyTally(): PartyTally {
  return { total: 0, yea: 0, nay: 0, present: 0, absent: 0 };
}

function tallyFor(members: RollCallMember[], party: 'D' | 'R' | 'I'): PartyTally {
  const filtered = members.filter(m => m.party === party);
  return {
    total: filtered.length,
    yea: filtered.filter(m => m.position === 'Yea').length,
    nay: filtered.filter(m => m.position === 'Nay').length,
    present: filtered.filter(m => m.position === 'Present').length,
    absent: filtered.filter(m => m.position === 'Not Voting').length,
  };
}

function normalizeMember(raw: UnifiedVoteDetail['members'][number]): RollCallMember {
  const bioguideId =
    raw.bioguideId ??
    findBioguideId({
      firstName: raw.firstName,
      lastName: raw.lastName,
      fullName: raw.fullName,
      state: raw.state,
      bioguideId: raw.bioguideId,
    }) ??
    undefined;

  return {
    id: raw.id,
    bioguideId,
    fullName: raw.fullName,
    firstName: raw.firstName,
    lastName: raw.lastName,
    state: raw.state,
    district: raw.district,
    party: raw.party,
    position: raw.position as Position,
  };
}

export async function loadRollCallDetailData(params: {
  voteId: string;
  fromBioguideId?: string;
  fromRepName?: string;
}): Promise<RollCallDetailData | null> {
  const { voteId, fromBioguideId, fromRepName } = params;

  let vote: UnifiedVoteDetail | null = null;
  try {
    vote = (await getVoteDetailsService(voteId)) as UnifiedVoteDetail | null;
  } catch (error) {
    logger.error('RollCallDetail: failed to fetch vote details', error as Error, { voteId });
    return null;
  }

  if (!vote) return null;

  const members = (vote.members ?? []).map(normalizeMember);

  const totals = {
    yea: vote.yeas,
    nay: vote.nays,
    present: vote.present,
    absent: vote.absent,
    total: vote.totalVotes,
    voting: vote.yeas + vote.nays,
  };

  const partyTallies = members.length
    ? {
        democrat: tallyFor(members, 'D'),
        republican: tallyFor(members, 'R'),
        independent: tallyFor(members, 'I'),
      }
    : { democrat: emptyTally(), republican: emptyTally(), independent: emptyTally() };

  return {
    voteId,
    vote,
    members,
    totals,
    partyTallies,
    fromBioguideId,
    fromRepName,
  };
}
