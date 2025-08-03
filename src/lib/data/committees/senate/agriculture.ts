/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Senate Agriculture, Nutrition, and Forestry Committee (SSAF) - 119th Congress
// This is a stub implementation - full committee data will be added later

import type { Committee } from '@/types/committee';

export const senateAgricultureCommittee: Committee = {
  id: 'SSAF',
  name: 'Senate Committee on Agriculture, Nutrition, and Forestry',
  chamber: 'Senate',
  jurisdiction:
    'Oversees agricultural policy, nutrition programs, forestry, food safety, rural development, and agricultural research including farm bills, SNAP, and agricultural trade.',
  type: 'Standing',
  leadership: {
    chair: undefined, // To be populated with actual data
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [], // To be populated with actual member data
  subcommittees: [], // To be populated with subcommittee data
  url: 'https://www.agriculture.senate.gov/',
  lastUpdated: new Date().toISOString(),
};
