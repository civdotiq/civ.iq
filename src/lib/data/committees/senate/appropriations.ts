/**
 * Senate Committee on Appropriations data
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee } from '@/types/committee';

export const senateAppropriationsCommittee: Committee = {
  id: 'SSAP',
  thomas_id: 'SSAP',
  name: 'Senate Committee on Appropriations',
  chamber: 'Senate',
  jurisdiction: 'Responsible for federal spending bills and discretionary budget allocations.',
  type: 'Standing',
  leadership: {
    chair: undefined, // Will be populated by real data
    rankingMember: undefined, // Will be populated by real data
  },
  members: [], // Will be populated by real data
  subcommittees: [], // Will be populated by real data
  url: 'https://www.congress.gov/committee/ssap',
  lastUpdated: new Date().toISOString(),
};
