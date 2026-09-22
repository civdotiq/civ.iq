/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  subcommitteeName,
  type CongressCommittee,
} from '@/features/representatives/services/congress.service';
import { isSubcommitteeId } from '@/lib/committee-id';

const committees: CongressCommittee[] = [
  {
    thomas_id: 'HSHM',
    type: 'house',
    name: 'House Committee on Homeland Security',
    subcommittees: [{ thomas_id: '09', name: 'Oversight, Investigations, and Accountability' }],
  },
];

describe('subcommittee resolution', () => {
  it('names a subcommittee seat by the subcommittee, not its parent', () => {
    expect(subcommitteeName(committees, 'HSHM09')).toBe(
      'Subcommittee on Oversight, Investigations, and Accountability'
    );
  });

  it('returns null for full committees and unknown subcommittees', () => {
    expect(subcommitteeName(committees, 'HSHM')).toBeNull();
    expect(subcommitteeName(committees, 'HSHM99')).toBeNull();
  });

  it('identifies subcommittee ids', () => {
    expect(isSubcommitteeId('HSAG22')).toBe(true);
    expect(isSubcommitteeId('HSAG')).toBe(false);
    expect(isSubcommitteeId(undefined)).toBe(false);
  });
});
