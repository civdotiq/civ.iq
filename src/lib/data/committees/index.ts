/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Index of committee ID → name maps for the 119th Congress.
//
// Member rosters and leadership are served live from congress-legislators
// (see committee.service.ts); jurisdiction prose lives in
// committee-jurisdictions.ts. The former per-committee hardcoded files (with
// stale rosters) were retired 2026-06-12. This file now holds only the
// authoritative ID → name maps and lookup helpers.

// House Committees
// House committee systemCodes match Congress.gov / THOMAS (119th Congress),
// cross-validated against src/data/committees-with-subcommittees.json.
// HSBA = Financial Services (legacy "Banking" code); HSBU = Budget; HSPW =
// Transportation and Infrastructure. Prior iterations of this map carried
// HSBA: 'Budget' and a bogus HSSF: 'Financial Services' — both corrected.
export const HOUSE_COMMITTEES = {
  HSAG: 'Agriculture',
  HSAP: 'Appropriations',
  HSAS: 'Armed Services',
  HSBA: 'Financial Services',
  HSBU: 'Budget',
  HSED: 'Education and the Workforce',
  HSIF: 'Energy and Commerce',
  HSFA: 'Foreign Affairs',
  HSII: 'Natural Resources',
  HSGO: 'Oversight and Accountability',
  HSHA: 'House Administration',
  HSHM: 'Homeland Security',
  HSJU: 'Judiciary',
  HSPW: 'Transportation and Infrastructure',
  HSRU: 'Rules',
  HSSM: 'Small Business',
  HSSO: 'Ethics',
  HSSY: 'Science, Space, and Technology',
  HSVR: "Veterans' Affairs",
  HSWM: 'Ways and Means',
} as const;

// Senate Committees
export const SENATE_COMMITTEES = {
  SSAF: 'Agriculture, Nutrition, and Forestry',
  SSAP: 'Appropriations',
  SSAS: 'Armed Services',
  SSBA: 'Banking, Housing, and Urban Affairs',
  SSBU: 'Budget',
  SSCI: 'Commerce, Science, and Transportation',
  SSEG: 'Energy and Natural Resources',
  SSEV: 'Environment and Public Works',
  SSFI: 'Finance',
  SSFR: 'Foreign Relations',
  SSGA: 'Homeland Security and Governmental Affairs',
  SSHR: 'Health, Education, Labor, and Pensions',
  SSJU: 'Judiciary',
  SSRA: 'Rules and Administration',
  SSSB: 'Small Business and Entrepreneurship',
  SSVA: "Veterans' Affairs",
  SLIA: 'Indian Affairs',
  SSSO: 'Select Committee on Ethics',
  SSAG: 'Special Committee on Aging',
  SSIS: 'Select Committee on Intelligence',
} as const;

// Joint Committees
export const JOINT_COMMITTEES = {
  JSEC: 'Joint Economic Committee',
  JSLC: 'Joint Committee on the Library',
  JSPR: 'Joint Committee on Printing',
  JSTX: 'Joint Committee on Taxation',
} as const;

// Get all committee IDs
export function getAllCommitteeIds(): string[] {
  return [
    ...Object.keys(HOUSE_COMMITTEES),
    ...Object.keys(SENATE_COMMITTEES),
    ...Object.keys(JOINT_COMMITTEES),
  ];
}

// Get committee info by ID
export function getCommitteeInfo(
  committeeId: string
): { name: string; chamber: 'House' | 'Senate' | 'Joint' } | null {
  const upperCommitteeId = committeeId.toUpperCase();

  if (HOUSE_COMMITTEES[upperCommitteeId as keyof typeof HOUSE_COMMITTEES]) {
    return {
      name: `House Committee on ${HOUSE_COMMITTEES[upperCommitteeId as keyof typeof HOUSE_COMMITTEES]}`,
      chamber: 'House',
    };
  }

  if (SENATE_COMMITTEES[upperCommitteeId as keyof typeof SENATE_COMMITTEES]) {
    return {
      name: `Senate Committee on ${SENATE_COMMITTEES[upperCommitteeId as keyof typeof SENATE_COMMITTEES]}`,
      chamber: 'Senate',
    };
  }

  if (JOINT_COMMITTEES[upperCommitteeId as keyof typeof JOINT_COMMITTEES]) {
    return {
      name: JOINT_COMMITTEES[upperCommitteeId as keyof typeof JOINT_COMMITTEES],
      chamber: 'Joint',
    };
  }

  return null;
}
