/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Armed Services Committee (HSAS) - 119th Congress
// This is a stub implementation - full committee data will be added later

import type { Committee } from '@/types/committee';

export const houseArmedServicesCommittee: Committee = {
  id: 'HSAS',
  name: 'House Committee on Armed Services',
  chamber: 'House',
  jurisdiction:
    "Oversees the nation's defense policy, military operations, Department of Defense, military personnel, defense procurement, and military construction.",
  type: 'Standing',
  leadership: {
    chair: undefined, // To be populated with actual data
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [], // To be populated with actual member data
  subcommittees: [], // To be populated with subcommittee data
  url: 'https://armedservices.house.gov/',
  lastUpdated: new Date().toISOString(),
};
