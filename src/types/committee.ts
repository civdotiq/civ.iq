/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { EnhancedRepresentative } from './representative';

export interface Committee {
  id: string;
  thomas_id?: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  jurisdiction: string;
  type: 'Standing' | 'Select' | 'Special' | 'Joint';

  leadership: {
    chair?: CommitteeMember;
    rankingMember?: CommitteeMember;
    vice_chair?: CommitteeMember;
  };

  members: CommitteeMember[];
  subcommittees: Subcommittee[];

  // Metadata
  url?: string;
  phone?: string;
  address?: string;
  established?: string;
  lastUpdated: string;
}

export interface CommitteeMember {
  representative: EnhancedRepresentative;
  role: 'Chair' | 'Ranking Member' | 'Vice Chair' | 'Member';
  joinedDate: string;
  endDate?: string;
  rank?: number;
  subcommittees: string[];
}

export interface Subcommittee {
  id: string;
  name: string;
  chair?: EnhancedRepresentative;
  rankingMember?: EnhancedRepresentative;
  focus: string;
  members: Array<{
    representative: EnhancedRepresentative;
    role: string;
    joinedDate: string;
  }>;
}

export interface CommitteeAPIResponse {
  committee: Committee;
  metadata: {
    dataSource: 'congress.gov' | 'mock';
    lastUpdated: string;
    memberCount: number;
    subcommitteeCount: number;
    cacheable: boolean;
  };
  errors?: Array<{
    code: string;
    message: string;
  }>;
}

// Committee ID mapping for better URLs
export const COMMITTEE_ID_MAP: Record<string, { name: string; chamber: string }> = {
  HSAG: { name: 'House Committee on Agriculture', chamber: 'House' },
  HSAG22: { name: 'House Committee on Agriculture', chamber: 'House' },
  HSHM: { name: 'House Committee on Homeland Security', chamber: 'House' },
  HSHM09: { name: 'House Committee on Homeland Security', chamber: 'House' },
  HSJU: { name: 'House Committee on the Judiciary', chamber: 'House' },
  HSED: { name: 'House Committee on Education and Labor', chamber: 'House' },
  HSWM: { name: 'House Committee on Ways and Means', chamber: 'House' },
  HSIF: { name: 'House Committee on Energy and Commerce', chamber: 'House' },
  HSAP: { name: 'House Committee on Appropriations', chamber: 'House' },
  HSBA: { name: 'House Committee on Financial Services', chamber: 'House' },
  HSPW: { name: 'House Committee on Transportation and Infrastructure', chamber: 'House' },
  HSGO: { name: 'House Committee on Oversight and Reform', chamber: 'House' },
  HSSM: { name: 'House Committee on Small Business', chamber: 'House' },
  HSSY: { name: 'House Committee on Science, Space, and Technology', chamber: 'House' },
  HSVR: { name: "House Committee on Veterans' Affairs", chamber: 'House' },
  HSAS: { name: 'House Committee on Armed Services', chamber: 'House' },
  HSRU: { name: 'House Committee on Rules', chamber: 'House' },
  HSHA: { name: 'House Committee on House Administration', chamber: 'House' },
  HSBU: { name: 'House Committee on the Budget', chamber: 'House' },
  HSII: { name: 'House Committee on Natural Resources', chamber: 'House' },
  HSFA: { name: 'House Committee on Foreign Affairs', chamber: 'House' },
  HLIG: { name: 'House Permanent Select Committee on Intelligence', chamber: 'House' },
  HSCX: { name: 'House Select Committee on Strategic Competition', chamber: 'House' },

  // Senate committees
  SSAG: { name: 'Senate Committee on Agriculture, Nutrition, and Forestry', chamber: 'Senate' },
  SSAP: { name: 'Senate Committee on Appropriations', chamber: 'Senate' },
  SSAS: { name: 'Senate Committee on Armed Services', chamber: 'Senate' },
  SSBA: { name: 'Senate Committee on Banking, Housing, and Urban Affairs', chamber: 'Senate' },
  SSBU: { name: 'Senate Committee on the Budget', chamber: 'Senate' },
  SSCM: { name: 'Senate Committee on Commerce, Science, and Transportation', chamber: 'Senate' },
  SSEG: { name: 'Senate Committee on Energy and Natural Resources', chamber: 'Senate' },
  SSEV: { name: 'Senate Committee on Environment and Public Works', chamber: 'Senate' },
  SSFI: { name: 'Senate Committee on Finance', chamber: 'Senate' },
  SSGA: {
    name: 'Senate Committee on Homeland Security and Governmental Affairs',
    chamber: 'Senate',
  },
  SSHR: { name: 'Senate Committee on Health, Education, Labor and Pensions', chamber: 'Senate' },
  SSJU: { name: 'Senate Committee on the Judiciary', chamber: 'Senate' },
  SSRA: { name: 'Senate Committee on Rules and Administration', chamber: 'Senate' },
  SSSB: { name: 'Senate Committee on Small Business and Entrepreneurship', chamber: 'Senate' },
  SSVA: { name: "Senate Committee on Veterans' Affairs", chamber: 'Senate' },
  SSFR: { name: 'Senate Committee on Foreign Relations', chamber: 'Senate' },
  SLIN: { name: 'Senate Select Committee on Intelligence', chamber: 'Senate' },
};

export function getCommitteeDisplayName(committeeId: string): string {
  return COMMITTEE_ID_MAP[committeeId]?.name || `Committee ${committeeId}`;
}

export function getCommitteeChamber(committeeId: string): string {
  return COMMITTEE_ID_MAP[committeeId]?.chamber || 'Unknown';
}
