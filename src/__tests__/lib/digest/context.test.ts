/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  voteQuestionContext,
  fecFormContext,
  billActionContext,
  extractBillRefs,
} from '@/lib/digest/context';

describe('digest context', () => {
  describe('voteQuestionContext', () => {
    it('explains procedural vote types', () => {
      const ctx = voteQuestionContext('On Ordering the Previous Question');
      expect(ctx?.kind).toBe('procedural');
      expect(ctx?.text).toContain('Ends debate');
    });

    it('prefers the longest matching prefix', () => {
      const suspend = voteQuestionContext('On Motion to Suspend the Rules and Pass, as Amended');
      expect(suspend?.kind).toBe('substantive');
      expect(suspend?.text).toContain('two-thirds');
    });

    it('is case-insensitive and returns null for unknown questions', () => {
      expect(voteQuestionContext('ON PASSAGE')).not.toBeNull();
      expect(voteQuestionContext('On Some Novel Question')).toBeNull();
    });
  });

  describe('fecFormContext', () => {
    it('explains common form codes', () => {
      expect(fecFormContext('F2')).toContain('Statement of Candidacy');
      expect(fecFormContext('F3X')).toContain('PAC or party');
      expect(fecFormContext('F6')).toContain('48-hour');
    });

    it('resolves amendment and termination variants to the base form', () => {
      expect(fecFormContext('F3A')).toContain('Amended filing');
      expect(fecFormContext('F3A')).toContain('House or Senate campaign');
      expect(fecFormContext('F1T')).toContain('Termination filing');
    });

    it('returns null for unknown or missing codes', () => {
      expect(fecFormContext('F77')).toBeNull();
      expect(fecFormContext(undefined)).toBeNull();
    });
  });

  describe('billActionContext', () => {
    it('explains committee-stage jargon', () => {
      expect(
        billActionContext(
          'Ordered to be Reported in the Nature of a Substitute by the Yeas and Nays: 39 - 0.'
        )
      ).toContain('committee approved');
      expect(
        billActionContext('Referred to the House Committee on Oversight and Government Reform.')
      ).toContain('Assigned to a committee');
      expect(billActionContext('Placed on the Union Calendar, Calendar No. 623.')).toContain(
        'floor vote'
      );
      expect(billActionContext('Subcommittee Hearings Held')).toContain('subcommittee heard');
    });

    it('explains end-stage actions', () => {
      expect(billActionContext('Became Public Law No: 119-21.')).toBe('Signed into law.');
      expect(billActionContext('Presented to President.')).toContain('signature or veto');
    });

    it('returns null when no pattern matches', () => {
      expect(billActionContext('Star Print ordered on the bill.')).toBeNull();
      expect(billActionContext(undefined)).toBeNull();
    });
  });

  describe('extractBillRefs', () => {
    const ruleTitle =
      'Providing for consideration of the bill (H.R. 8800) to authorize appropriations ' +
      'for fiscal year 2027 for military activities of the Department of Defense; providing for ' +
      'consideration of the bill (H.R. 8595) making appropriations for national security; ' +
      'providing for consideration of the bill (H.R. 8884) to amend title II of the Social ' +
      'Security Act; and providing for consideration of the resolution (H. Res. 1383) ' +
      'commemorating the one-year anniversary of the Working Families Tax Cuts.';

    it('extracts every referenced measure in document order', () => {
      const refs = extractBillRefs(ruleTitle, 119);
      expect(refs.map(r => r.billId)).toEqual([
        '119-hr-8800',
        '119-hr-8595',
        '119-hr-8884',
        '119-hres-1383',
      ]);
      expect(refs[0]?.label).toBe('H.R. 8800');
      expect(refs[3]?.label).toBe('H.Res. 1383');
    });

    it('excludes the measure being voted on and dedupes repeats', () => {
      const refs = extractBillRefs(ruleTitle, 119, '119-hr-8800');
      expect(refs.map(r => r.billId)).toEqual(['119-hr-8595', '119-hr-8884', '119-hres-1383']);
    });

    it('handles Senate measures and caps at four refs', () => {
      const senate = 'Consideration of S. 042, S.J. Res. 7, S. Con. Res. 12, S. Res. 501, S. 999';
      const refs = extractBillRefs(senate, 119);
      expect(refs).toHaveLength(4);
      expect(refs[0]?.billId).toBe('119-s-042');
      expect(refs[1]?.billId).toBe('119-sjres-7');
    });

    it('returns empty for missing text', () => {
      expect(extractBillRefs(undefined, 119)).toEqual([]);
    });
  });
});
