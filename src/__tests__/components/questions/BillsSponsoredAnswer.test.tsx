/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for BillsSponsoredAnswer — the pod renderer for the
 * /ask/bills-sponsored/[id] page.
 *
 * These tests lock in the citizen-legibility invariants:
 * - The Policy areas pod counts ONLY sponsored bills. The page's question
 *   is "What bills has X sponsored?" — mixing cosponsored policy-area tags
 *   into the pod produces false claims for members who sponsor zero bills.
 * - Bill numbers render with the type prefix ("H.R. 7927", "H.Res. 1113"),
 *   so a resolution and a bill that share a number are not conflated.
 * - Raw Congress.gov `latestAction.text` sentences are mapped to short
 *   citizen-language statuses ("In committee", "Passed House", "Became law").
 * - The meaningless "Total legislation = sponsored + cosponsored" sum is gone.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { BillsSponsoredAnswer } from '@/components/questions/BillsSponsoredAnswer';

type Bill = {
  id: string;
  number: string;
  type: string;
  title: string;
  introducedDate: string;
  status: string;
  policyArea?: string;
  relationship: 'sponsored' | 'cosponsored';
};

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: overrides.id ?? 'hr-1',
    number: overrides.number ?? '1',
    type: overrides.type ?? 'HR',
    title: overrides.title ?? 'A Bill',
    introducedDate: overrides.introducedDate ?? '2026-01-03',
    status: overrides.status ?? 'Introduced in House',
    policyArea: overrides.policyArea,
    relationship: overrides.relationship ?? 'sponsored',
  };
}

describe('BillsSponsoredAnswer', () => {
  describe('PolicyAreasPod', () => {
    it('counts only SPONSORED bills — cosponsored policy areas do not leak in', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-1',
          policyArea: 'Government Operations',
          relationship: 'cosponsored',
        }),
        makeBill({
          id: 'hr-2',
          policyArea: 'Government Operations',
          relationship: 'cosponsored',
        }),
        makeBill({
          id: 'hr-3',
          policyArea: 'Health',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={2} />);

      // The previous bug surfaced "Government Operations 2 bills" on a page
      // titled "What bills has X sponsored?" even when X had cosponsored both.
      expect(screen.queryByText('Government Operations')).not.toBeInTheDocument();
      // "Health" shows in both the sponsored bill's meta row and the policy pod.
      expect(screen.getAllByText('Health').length).toBeGreaterThan(0);
      // The "1 bill" count next to the policy name is the pod's only source
      // of that exact phrase, so its presence proves the pod rendered.
      expect(screen.getByText(/^1 bill$/)).toBeInTheDocument();
    });

    it('shows the empty-state message when the rep has sponsored zero bills', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-1',
          policyArea: 'Government Operations',
          relationship: 'cosponsored',
        }),
        makeBill({
          id: 'hr-2',
          policyArea: 'Taxation',
          relationship: 'cosponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={0} cosponsoredCount={2} />);

      expect(
        screen.getByText(/policy area data is not available for these bills/i)
      ).toBeInTheDocument();
    });
  });

  describe('bill number prefixes', () => {
    it('renders "H.R. 7927" for a House bill, not the bare "7927"', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-7927',
          number: '7927',
          type: 'HR',
          title: 'Transparency Act',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText(/H\.R\. 7927: Transparency Act/)).toBeInTheDocument();
    });

    it('renders "H.Res. 1113" for a House resolution (not conflated with a bill)', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hres-1113',
          number: '1113',
          type: 'HRES',
          title: 'Commemorative Resolution',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText(/H\.Res\. 1113: Commemorative Resolution/)).toBeInTheDocument();
    });

    it('renders "S.Res. 17" for a Senate resolution', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'sres-17',
          number: '17',
          type: 'SRES',
          title: 'Senate Rules Resolution',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText(/S\.Res\. 17: Senate Rules Resolution/)).toBeInTheDocument();
    });
  });

  describe('status labels', () => {
    it('collapses long Congress.gov referral sentences to "In committee"', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-1',
          status:
            'Referred to the Committee on Homeland Security, and in addition to the Committee on Ways and Means, for a period to be subsequently determined by the Speaker…',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText('In committee')).toBeInTheDocument();
      expect(screen.queryByText(/Referred to the Committee on Homeland/)).not.toBeInTheDocument();
    });

    it('maps "Became Public Law" to "Became law"', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-1',
          status: 'Became Public Law No: 119-1.',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText('Became law')).toBeInTheDocument();
    });

    it('maps "Passed the House" to "Passed House"', () => {
      const bills: Bill[] = [
        makeBill({
          id: 'hr-1',
          status: 'Passed/agreed to in House: On passage Passed by recorded vote: 230 - 195.',
          relationship: 'sponsored',
        }),
      ];

      render(<BillsSponsoredAnswer bills={bills} sponsoredCount={1} cosponsoredCount={0} />);

      expect(screen.getByText('Passed House')).toBeInTheDocument();
    });
  });

  describe('Legislation stats pod', () => {
    it('does not render the meaningless "Total legislation" sum', () => {
      render(<BillsSponsoredAnswer bills={[]} sponsoredCount={5} cosponsoredCount={42} />);

      // The combined "47" would conflate authorship with signatures.
      expect(screen.queryByText(/total legislation/i)).not.toBeInTheDocument();
      expect(screen.queryByText('47')).not.toBeInTheDocument();
    });

    it('renders sponsored and cosponsored as separate numbers', () => {
      render(<BillsSponsoredAnswer bills={[]} sponsoredCount={5} cosponsoredCount={42} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });
});
