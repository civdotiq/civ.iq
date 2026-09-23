/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Senate roll-call XML identifies senators only by LIS id. When the legislator
 * dataset lacked a mapping, ingest stored the LIS id (S440) as the bioguide id,
 * so the member row, links and record-card baselines all keyed on "S440".
 * An unmapped id now stays out of the bioguide slot but is kept alongside, so
 * the vote still counts and can be re-resolved at read time.
 */

import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { compactRoll, expandRoll } from '@/features/representatives/services/roll-call-corpus';
import { computeChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

function member(lis: string, name: string, party: string, state: string, vote: string): string {
  return `<member><member_full>${name}</member_full><last_name>${name}</last_name><party>${party}</party><state>${state}</state><vote_cast>${vote}</vote_cast><lis_member_id>${lis}</lis_member_id></member>`;
}

const XML = `<roll_call_vote><congress>119</congress><session>2</session><vote_number>200</vote_number>
<vote_date>March 10, 2026,  02:15 PM</vote_date><vote_question_text>On Passage</vote_question_text><vote_result>Passed</vote_result>
<members>
${member('S440', 'Armstrong', 'R', 'OK', 'Yea')}
${member('S419', 'Mullin', 'R', 'OK', 'Yea')}
${member('S999', 'Unknown', 'D', 'ZZ', 'Nay')}
</members></roll_call_vote>`;

describe('Senate roll-call ingest: LIS → bioguide', () => {
  it('maps current and recently departed senators, and never stores an unmapped LIS id as a bioguide id', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML, 119, 2, 200);
    expect(roll).not.toBeNull();
    const votes = roll?.memberVotes ?? [];

    expect(votes.map(v => v.bioguideId)).toEqual(['A000383', 'M001190', '']);
    expect(votes[2]?.lisId).toBe('S999');
    expect(votes[0]?.lisId).toBeUndefined();
    // The unresolved senator still counts in the roll's totals.
    expect(roll?.totals).toMatchObject({ yea: 2, nay: 1 });
  });

  it('round-trips the raw LIS id through the compact corpus form', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML, 119, 2, 200);
    if (!roll) throw new Error('parse failed');

    const compact = compactRoll(roll);
    expect(compact.votes[2]).toEqual({ b: '', p: 'D', v: 'N', l: 'S999' });
    expect(compact.votes[0]).not.toHaveProperty('l');

    const expanded = expandRoll(compact, 119, 'Senate');
    expect(expanded.memberVotes[2]).toMatchObject({ bioguideId: '', lisId: 'S999' });
  });

  it('keeps unresolved senators out of the per-member baselines', async () => {
    const roll = await batchVotingService.parseSenateRollCallXML(XML, 119, 2, 200);
    if (!roll) throw new Error('parse failed');

    const baselines = computeChamberBaselines([roll], 'Senate', 119, true);
    expect(Object.keys(baselines.members).sort()).toEqual(['A000383', 'M001190']);
  });
});
