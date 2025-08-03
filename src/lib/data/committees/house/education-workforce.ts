/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// House Education and the Workforce Committee (HSED) - 119th Congress
// This is a stub implementation - full committee data will be added later

import type { Committee } from '@/types/committee';

export const houseEducationWorkforceCommittee: Committee = {
  id: 'HSED',
  name: 'House Committee on Education and the Workforce',
  chamber: 'House',
  jurisdiction:
    'Oversees education policy, workforce development, labor relations, worker safety, and employment standards including K-12 education, higher education, and job training programs.',
  type: 'Standing',
  leadership: {
    chair: undefined, // To be populated with actual data
    rankingMember: undefined,
    vice_chair: undefined,
  },
  members: [], // To be populated with actual member data
  subcommittees: [], // To be populated with subcommittee data
  url: 'https://edworkforce.house.gov/',
  lastUpdated: new Date().toISOString(),
};
