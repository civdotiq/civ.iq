/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Budget Committee (HSBA) - 119th Congress
// This is a stub implementation - full committee data will be added later

import type { Committee } from '@/types/committee';

export const houseBudgetCommittee: Committee = {
  id: 'HSBA',
  name: 'House Committee on the Budget',
  chamber: 'House',
  jurisdiction:
    'Responsible for the federal budget process, fiscal policy oversight, budget resolution, deficit and debt issues, and budget enforcement.',
  type: 'Standing',
  leadership: {
    chair: undefined, // To be populated with actual data
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [], // To be populated with actual member data
  subcommittees: [], // To be populated with subcommittee data
  url: 'https://budget.house.gov/',
  lastUpdated: new Date().toISOString(),
};
