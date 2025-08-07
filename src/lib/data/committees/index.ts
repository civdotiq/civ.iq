/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee } from '@/types/committee';
import logger from '@/lib/logging/simple-logger';

// Index of all House and Senate committees for the 119th Congress
// This serves as the main registry for committee data

export interface CommitteeRegistry {
  house: {
    [committeeId: string]: () => Promise<Committee>;
  };
  senate: {
    [committeeId: string]: () => Promise<Committee>;
  };
  joint: {
    [committeeId: string]: () => Promise<Committee>;
  };
}

// House Committees
export const HOUSE_COMMITTEES = {
  HSAG: 'Agriculture',
  HSAP: 'Appropriations',
  HSAS: 'Armed Services',
  HSBA: 'Budget',
  HSED: 'Education and the Workforce',
  HSIF: 'Energy and Commerce',
  HSFA: 'Foreign Affairs',
  HSII: 'Natural Resources',
  HSGO: 'Oversight and Accountability',
  HSHA: 'House Administration',
  HSHM: 'Homeland Security',
  HSJU: 'Judiciary',
  HSRU: 'Rules',
  HSSM: 'Small Business',
  HSSO: 'Ethics',
  HSTG: 'Transportation and Infrastructure',
  HSVR: "Veterans' Affairs",
  HSWM: 'Ways and Means',
  HSPW: 'Permanent Select Committee on Intelligence',
  HSSY: 'Science, Space, and Technology',
  HSSF: 'Financial Services',
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

// Committee data loader functions
// These will lazy-load committee data only when needed
// Only includes committees with actual implementation files
export const committeeRegistry: CommitteeRegistry = {
  house: {
    HSAG: async () => {
      const { houseAgricultureCommittee } = await import('./house/agriculture');
      return houseAgricultureCommittee;
    },
    HSAP: async () => {
      const { houseAppropriationsCommittee } = await import('./house/appropriations');
      return houseAppropriationsCommittee;
    },
    HSAS: async () => {
      const { houseArmedServicesCommittee } = await import('./house/armed-services');
      return houseArmedServicesCommittee;
    },
    HSBA: async () => {
      const { houseBudgetCommittee } = await import('./house/budget');
      return houseBudgetCommittee;
    },
    HSED: async () => {
      const { houseEducationWorkforceCommittee } = await import('./house/education-workforce');
      return houseEducationWorkforceCommittee;
    },
    HSIF: async () => {
      const { houseEnergyCommerceCommittee } = await import('./house/energy-commerce');
      return houseEnergyCommerceCommittee;
    },
    HSFA: async () => {
      const { houseForeignAffairsCommittee } = await import('./house/foreign-affairs');
      return houseForeignAffairsCommittee;
    },
    HSJU: async () => {
      const { houseJudiciaryCommittee } = await import('./house/judiciary');
      return houseJudiciaryCommittee;
    },
    HSWM: async () => {
      const { houseWaysMeansCommittee } = await import('./house/ways-means');
      return houseWaysMeansCommittee;
    },
  },
  senate: {
    SSAF: async () => {
      const { senateAgricultureCommittee } = await import('./senate/agriculture');
      return senateAgricultureCommittee;
    },
  },
  joint: {
    // Joint committee implementations pending
  },
};

// Helper function to get any committee data
export async function getCommitteeData(committeeId: string): Promise<Committee | null> {
  const upperCommitteeId = committeeId.toUpperCase();

  // Check House committees
  if (committeeRegistry.house[upperCommitteeId]) {
    try {
      return await committeeRegistry.house[upperCommitteeId]();
    } catch (error) {
      logger.error('Failed to load House committee', error as Error, {
        committeeId: upperCommitteeId,
      });
      return null;
    }
  }

  // Check Senate committees
  if (committeeRegistry.senate[upperCommitteeId]) {
    try {
      return await committeeRegistry.senate[upperCommitteeId]();
    } catch (error) {
      logger.error('Failed to load Senate committee', error as Error, {
        committeeId: upperCommitteeId,
      });
      return null;
    }
  }

  // Check Joint committees
  if (committeeRegistry.joint[upperCommitteeId]) {
    try {
      return await committeeRegistry.joint[upperCommitteeId]();
    } catch (error) {
      logger.error('Failed to load Joint committee', error as Error, {
        committeeId: upperCommitteeId,
      });
      return null;
    }
  }

  return null;
}

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
