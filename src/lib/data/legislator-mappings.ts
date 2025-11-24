/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import logger from '@/lib/logging/simple-logger';

interface LegislatorIds {
  bioguide?: string;
  fec?: string[];
  govtrack?: number;
  votesmart?: number;
  opensecrets?: string;
  lis?: string;
  thomas?: string;
  wikipedia?: string;
  ballotpedia?: string;
}

interface Legislator {
  id: LegislatorIds;
  name: {
    first: string;
    last: string;
    official_full?: string;
  };
  bio: {
    gender?: string;
    birthday?: string;
  };
  terms: Array<{
    type: 'sen' | 'rep';
    start: string;
    end: string;
    state: string;
    district?: number;
    party: string;
  }>;
}

/**
 * Full legislator info including name, party, state, district
 */
export interface LegislatorInfo {
  bioguideId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  party: 'D' | 'R' | 'I';
  state: string;
  district?: number;
  chamber: 'House' | 'Senate';
}

let LEGISLATOR_MAP: Map<string, LegislatorIds> | null = null;
let LEGISLATOR_INFO_MAP: Map<string, LegislatorInfo> | null = null;
let LOAD_PROMISE: Promise<Map<string, LegislatorIds>> | null = null;
let LOAD_INFO_PROMISE: Promise<Map<string, LegislatorInfo>> | null = null;

export async function getLegislatorMap(): Promise<Map<string, LegislatorIds>> {
  if (LEGISLATOR_MAP) return LEGISLATOR_MAP;

  if (LOAD_PROMISE) return LOAD_PROMISE;

  LOAD_PROMISE = loadLegislatorMap();
  return LOAD_PROMISE;
}

async function loadLegislatorMap(): Promise<Map<string, LegislatorIds>> {
  try {
    const yamlPath = path.join(process.cwd(), 'data', 'legislators-current.yaml');

    if (!fs.existsSync(yamlPath)) {
      logger.error('legislators-current.yaml not found at:', yamlPath);
      return new Map();
    }

    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const legislators = yaml.load(fileContents) as Legislator[];

    LEGISLATOR_MAP = new Map();

    legislators.forEach(legislator => {
      if (legislator.id?.bioguide) {
        LEGISLATOR_MAP!.set(legislator.id.bioguide, legislator.id);
      }
    });

    logger.info(`✅ Loaded ${LEGISLATOR_MAP.size} legislator ID mappings`);
    return LEGISLATOR_MAP;
  } catch (error) {
    logger.error('❌ Failed to load legislators:', error);
    LEGISLATOR_MAP = new Map();
    return LEGISLATOR_MAP;
  }
}

export async function bioguideToFEC(bioguideId: string): Promise<string[]> {
  try {
    const map = await getLegislatorMap();
    const legislator = map.get(bioguideId);
    return legislator?.fec || [];
  } catch (error) {
    logger.error(`Error getting FEC IDs for ${bioguideId}:`, error);
    return [];
  }
}

export async function getFECIdFromBioguide(bioguideId: string): Promise<string | null> {
  const fecIds = await bioguideToFEC(bioguideId);
  return fecIds.length > 0 ? fecIds[0] || null : null;
}

export async function hasFECMapping(bioguideId: string): Promise<boolean> {
  const fecIds = await bioguideToFEC(bioguideId);
  return fecIds.length > 0;
}

// Export the mapping for other uses
export async function getAllMappings(): Promise<Map<string, LegislatorIds>> {
  return getLegislatorMap();
}

/**
 * Get full legislator info map (name, party, state, district)
 */
export async function getLegislatorInfoMap(): Promise<Map<string, LegislatorInfo>> {
  if (LEGISLATOR_INFO_MAP) return LEGISLATOR_INFO_MAP;

  if (LOAD_INFO_PROMISE) return LOAD_INFO_PROMISE;

  LOAD_INFO_PROMISE = loadLegislatorInfoMap();
  return LOAD_INFO_PROMISE;
}

async function loadLegislatorInfoMap(): Promise<Map<string, LegislatorInfo>> {
  try {
    const yamlPath = path.join(process.cwd(), 'data', 'legislators-current.yaml');

    if (!fs.existsSync(yamlPath)) {
      logger.error('legislators-current.yaml not found at:', yamlPath);
      return new Map();
    }

    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const legislators = yaml.load(fileContents) as Legislator[];

    LEGISLATOR_INFO_MAP = new Map();

    legislators.forEach(legislator => {
      if (legislator.id?.bioguide && legislator.terms?.length > 0) {
        // Get the most recent term for current info
        const latestTerm = legislator.terms[legislator.terms.length - 1];
        if (!latestTerm) return;

        // Map party string to party code
        let party: 'D' | 'R' | 'I' = 'I';
        const partyStr = latestTerm.party?.toLowerCase() || '';
        if (partyStr.includes('democrat')) party = 'D';
        else if (partyStr.includes('republican')) party = 'R';

        const info: LegislatorInfo = {
          bioguideId: legislator.id.bioguide,
          firstName: legislator.name.first,
          lastName: legislator.name.last,
          fullName:
            legislator.name.official_full || `${legislator.name.first} ${legislator.name.last}`,
          party,
          state: latestTerm.state,
          district: latestTerm.district,
          chamber: latestTerm.type === 'sen' ? 'Senate' : 'House',
        };

        LEGISLATOR_INFO_MAP!.set(legislator.id.bioguide, info);
      }
    });

    logger.info(`✅ Loaded ${LEGISLATOR_INFO_MAP.size} legislator info records`);
    return LEGISLATOR_INFO_MAP;
  } catch (error) {
    logger.error('❌ Failed to load legislator info:', error);
    LEGISLATOR_INFO_MAP = new Map();
    return LEGISLATOR_INFO_MAP;
  }
}

/**
 * Get full legislator info by bioguide ID
 */
export async function getLegislatorInfo(bioguideId: string): Promise<LegislatorInfo | null> {
  const map = await getLegislatorInfoMap();
  return map.get(bioguideId) || null;
}
