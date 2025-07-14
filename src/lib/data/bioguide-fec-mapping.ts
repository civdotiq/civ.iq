/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

// Bioguide ID to FEC Candidate ID mapping
// This mapping helps match Congressional representatives to their FEC campaign finance records
// Format: bioguideId -> { fecId, name, state, district?, office, lastUpdated }

export interface FECMapping {
  fecId: string;
  name: string;
  state: string;
  district?: string;
  office: 'H' | 'S'; // House or Senate
  lastUpdated: string;
}

// Known mappings for prominent members (to be expanded)
export const bioguideToFECMapping: Record<string, FECMapping> = {
  // Senate mappings
  'S000148': {
    fecId: 'S8NY00082',
    name: 'SCHUMER, CHARLES E',
    state: 'NY',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'P000197': {
    fecId: 'H8CA05035',
    name: 'PELOSI, NANCY',
    state: 'CA',
    district: '11',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'M000355': {
    fecId: 'S0KY00012',
    name: 'MCCONNELL, MITCH',
    state: 'KY',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'W000779': {
    fecId: 'S6OR00110',
    name: 'WYDEN, RON',
    state: 'OR',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'S000033': {
    fecId: 'S4VT00033',
    name: 'SANDERS, BERNARD',
    state: 'VT',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'W000817': {
    fecId: 'S2MA00170',
    name: 'WARREN, ELIZABETH',
    state: 'MA',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'C001098': {
    fecId: 'S4TX00289',
    name: 'CRUZ, TED',
    state: 'TX',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'G000359': {
    fecId: 'S0SC00149',
    name: 'GRAHAM, LINDSEY',
    state: 'SC',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  
  // House mappings
  'J000299': {
    fecId: 'H8LA01087',
    name: 'JOHNSON, MIKE',
    state: 'LA',
    district: '04',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'J000298': {
    fecId: 'H8OH04082',
    name: 'JEFFRIES, HAKEEM',
    state: 'NY',
    district: '08',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'O000172': {
    fecId: 'H8NY14267',
    name: 'OCASIO-CORTEZ, ALEXANDRIA',
    state: 'NY',
    district: '14',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'G000596': {
    fecId: 'H0FL19113',
    name: 'GAETZ, MATT',
    state: 'FL',
    district: '01',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'O000173': {
    fecId: 'H0MN05263',
    name: 'OMAR, ILHAN',
    state: 'MN',
    district: '05',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'P000618': {
    fecId: 'H8MN03235',
    name: 'PORTER, KATIE',
    state: 'CA',
    district: '47',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'S001216': {
    fecId: 'H8CA45104',
    name: 'SCHIFF, ADAM',
    state: 'CA',
    district: '30',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'J000289': {
    fecId: 'H0OH04082',
    name: 'JORDAN, JIM',
    state: 'OH',
    district: '04',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'P000595': {
    fecId: 'S2MI00109',
    name: 'PETERS, GARY',
    state: 'MI',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'A000014': {
    fecId: 'H0AL06027',
    name: 'ADERHOLT, ROBERT',
    state: 'AL',
    district: '04',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'B000574': {
    fecId: 'H8OR03083',
    name: 'BLUMENAUER, EARL',
    state: 'OR',
    district: '03',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  'B001135': {
    fecId: 'S8NC00219',
    name: 'BUDD, TED',
    state: 'NC',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'C001035': {
    fecId: 'S6ME00109',
    name: 'COLLINS, SUSAN',
    state: 'ME',
    office: 'S',
    lastUpdated: '2024-01-01'
  },
  'R000582': {
    fecId: 'H8TN01133',
    name: 'ROE, DAVID',
    state: 'TN',
    district: '01',
    office: 'H',
    lastUpdated: '2024-01-01'
  },
  
  // Add more mappings as needed...
};

// Helper function to get FEC ID from Bioguide ID
export function getFECIdFromBioguide(bioguideId: string): string | null {
  const mapping = bioguideToFECMapping[bioguideId];
  return mapping ? mapping.fecId : null;
}

// Helper function to check if a mapping exists
export function hasFECMapping(bioguideId: string): boolean {
  return bioguideId in bioguideToFECMapping;
}

// Function to add or update a mapping (for future use)
export function addFECMapping(bioguideId: string, mapping: FECMapping): void {
  bioguideToFECMapping[bioguideId] = mapping;
}