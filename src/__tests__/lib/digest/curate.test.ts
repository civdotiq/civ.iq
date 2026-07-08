/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  issueHighlights,
  delegationSplit,
  billStage,
  orderBills,
  orderVotes,
} from '@/lib/digest/curate';
import type { DigestBill, DigestVote } from '@/lib/digest/types';

function vote(overrides: Partial<DigestVote>): DigestVote {
  return {
    voteId: 'house-119-1',
    chamber: 'House',
    date: '2026-06-30',
    question: 'On Passage',
    result: 'Passed',
    yeas: 220,
    nays: 210,
    delegationPositions: [],
    ...overrides,
  };
}

function bill(overrides: Partial<DigestBill>): DigestBill {
  return {
    billId: '119-hr-1',
    congress: 119,
    type: 'HR',
    number: '1',
    title: 'A bill',
    latestActionDate: '2026-06-30',
    latestActionText: '',
    ...overrides,
  };
}

function position(party: string, pos: string, id: string) {
  return { bioguideId: id, name: id, party, position: pos };
}

describe('digest curation', () => {
  describe('issueHighlights', () => {
    it('finds the closest and most lopsided votes', () => {
      const close = vote({ voteId: 'v-close', yeas: 215, nays: 210 });
      const blowout = vote({ voteId: 'v-blowout', yeas: 420, nays: 0 });
      const highlights = issueHighlights([close, blowout], []);
      expect(highlights.closestVote?.voteId).toBe('v-close');
      expect(highlights.mostBipartisanVote?.voteId).toBe('v-blowout');
    });

    it('never highlights the same vote twice', () => {
      const only = vote({ voteId: 'v-only', yeas: 300, nays: 20 });
      const highlights = issueHighlights([only], []);
      expect(highlights.closestVote?.voteId).toBe('v-only');
      expect(highlights.mostBipartisanVote).toBeUndefined();
    });

    it('picks the furthest-advanced bill', () => {
      const referred = bill({ billId: 'b-1', latestActionText: 'Referred to the Committee.' });
      const passed = bill({ billId: 'b-2', latestActionText: 'Passed/agreed to in House.' });
      expect(issueHighlights([], [referred, passed]).furthestBill?.billId).toBe('b-2');
    });
  });

  describe('orderVotes', () => {
    it('separates substantive from procedural', () => {
      const passage = vote({ voteId: 'v-passage', question: 'On Passage' });
      const pq = vote({ voteId: 'v-pq', question: 'On Ordering the Previous Question' });
      const { substantive, procedural } = orderVotes([pq, passage]);
      expect(substantive.map(v => v.voteId)).toEqual(['v-passage']);
      expect(procedural.map(v => v.voteId)).toEqual(['v-pq']);
    });
  });

  describe('delegationSplit', () => {
    it('reports a clean party split', () => {
      const v = vote({
        delegationPositions: [
          position('Republican', 'Yea', 'r1'),
          position('Republican', 'Yea', 'r2'),
          position('Democratic', 'Nay', 'd1'),
          position('Democratic', 'Nay', 'd2'),
        ],
      });
      expect(delegationSplit(v)).toEqual({ yeas: 2, nays: 2, other: 0, note: 'split by party' });
    });

    it('reports unanimity and crossovers', () => {
      const unanimous = vote({
        delegationPositions: [position('R', 'Yea', 'r1'), position('D', 'Yea', 'd1')],
      });
      expect(delegationSplit(unanimous).note).toBe('unanimous');

      const crossed = vote({
        delegationPositions: [
          position('R', 'Yea', 'r1'),
          position('D', 'Nay', 'd1'),
          position('D', 'Yea', 'd2'),
        ],
      });
      expect(delegationSplit(crossed).note).toBe('crossed party lines');
    });

    it('counts non-voting members separately and stays quiet on tiny samples', () => {
      const v = vote({
        delegationPositions: [position('R', 'Not Voting', 'r1'), position('D', 'Yea', 'd1')],
      });
      expect(delegationSplit(v)).toEqual({ yeas: 1, nays: 0, other: 1, note: null });
    });
  });

  describe('billStage / orderBills', () => {
    it('ranks stages by progress', () => {
      expect(billStage('Became Public Law No: 119-21.').rank).toBe(7);
      expect(billStage('Presented to President.').rank).toBe(6);
      expect(billStage('Received in the Senate.').rank).toBe(5);
      expect(billStage('Ordered to be Reported by the Yeas and Nays: 39 - 0.').rank).toBe(4);
      expect(billStage('Placed on the Union Calendar, Calendar No. 623.').rank).toBe(3);
      expect(billStage('Subcommittee Hearings Held.').rank).toBe(2);
      expect(billStage('Referred to the Committee on Agriculture.').rank).toBe(1);
      expect(billStage('Star Print ordered.').rank).toBe(0);
    });

    it('orders bills furthest-first with stage labels attached', () => {
      const ordered = orderBills([
        bill({ billId: 'b-referred', latestActionText: 'Referred to the Committee.' }),
        bill({ billId: 'b-president', latestActionText: 'Presented to President.' }),
        bill({ billId: 'b-hearings', latestActionText: 'Subcommittee Hearings Held.' }),
      ]);
      expect(ordered.map(b => b.billId)).toEqual(['b-president', 'b-hearings', 'b-referred']);
      expect(ordered[0]?.stage.label).toBe('To President');
    });
  });
});
