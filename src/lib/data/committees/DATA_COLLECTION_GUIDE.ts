/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Instructions for populating committee data for the 119th Congress
 *
 * STEP 1: Data Sources
 * - Wikipedia: https://en.wikipedia.org/wiki/119th_United_States_Congress#Committees
 * - House Committees: https://www.house.gov/committees
 * - Senate Committees: https://www.senate.gov/committees/
 * - Individual committee websites (most accurate for current membership)
 *
 * STEP 2: Required Information for Each Committee
 * 1. Committee ID (e.g., HSJU for House Judiciary)
 * 2. Full committee name
 * 3. Chair and Ranking Member with bioguide IDs
 * 4. All members with:
 *    - Full name
 *    - Bioguide ID (can be found on congress.gov)
 *    - Party (R/D/I)
 *    - State and district (for House)
 * 5. Subcommittees with chairs and ranking members
 * 6. Committee contact information
 *
 * STEP 3: Bioguide ID Lookup
 * - Search on congress.gov: https://www.congress.gov/members
 * - Or use: https://bioguide.congress.gov/search
 *
 * STEP 4: Creating Committee Files
 * 1. Copy committee-template.ts
 * 2. Rename to [chamber]/[committee-name].ts
 * 3. Fill in all member data
 * 4. Update the index.ts file to include the new committee
 *
 * PRIORITY COMMITTEES TO IMPLEMENT:
 *
 * HOUSE:
 * - [ ] Appropriations (HSAP)
 * - [ ] Armed Services (HSAS)
 * - [ ] Budget (HSBA)
 * - [ ] Education and the Workforce (HSED)
 * - [ ] Energy and Commerce (HSIF)
 * - [ ] Financial Services (HSSF)
 * - [ ] Foreign Affairs (HSFA)
 * - [ ] Homeland Security (HSHM)
 * - [ ] Judiciary (HSJU)
 * - [ ] Natural Resources (HSII)
 * - [ ] Oversight and Accountability (HSGO)
 * - [ ] Rules (HSRU)
 * - [ ] Science, Space, and Technology (HSSY)
 * - [ ] Small Business (HSSM)
 * - [ ] Transportation and Infrastructure (HSTG)
 * - [ ] Veterans' Affairs (HSVR)
 * - [ ] Ways and Means (HSWM)
 * - [ ] Intelligence (HSPW)
 * - [ ] Ethics (HSSO)
 *
 * SENATE:
 * - [ ] Agriculture, Nutrition, and Forestry (SSAF)
 * - [ ] Appropriations (SSAP)
 * - [ ] Armed Services (SSAS)
 * - [ ] Banking, Housing, and Urban Affairs (SSBA)
 * - [ ] Budget (SSBU)
 * - [ ] Commerce, Science, and Transportation (SSCI)
 * - [ ] Energy and Natural Resources (SSEG)
 * - [ ] Environment and Public Works (SSEV)
 * - [ ] Finance (SSFI)
 * - [ ] Foreign Relations (SSFR)
 * - [ ] Health, Education, Labor, and Pensions (SSHR)
 * - [ ] Homeland Security and Governmental Affairs (SSGA)
 * - [ ] Judiciary (SSJU)
 * - [ ] Rules and Administration (SSRA)
 * - [ ] Small Business and Entrepreneurship (SSSB)
 * - [ ] Veterans' Affairs (SSVA)
 * - [ ] Indian Affairs (SLIA)
 * - [ ] Intelligence (SSIS)
 * - [ ] Ethics (SSSO)
 * - [ ] Aging (SSAG)
 *
 * JOINT:
 * - [ ] Economic (JSEC)
 * - [ ] Library (JSLC)
 * - [ ] Printing (JSPR)
 * - [ ] Taxation (JSTX)
 */

// Example of committee member data structure for reference
export const COMMITTEE_MEMBER_EXAMPLE = {
  bioguideId: 'J000299', // Jim Jordan
  name: 'Jim Jordan',
  party: 'R',
  state: 'OH',
  district: '04',
  role: 'Chair',
  committees: [
    {
      name: 'House Committee on the Judiciary',
      role: 'Chair',
      subcommittees: ['Subcommittee on the Administrative State, Regulatory Reform, and Antitrust'],
    },
  ],
};

// Common committee jurisdictions for reference
export const COMMITTEE_JURISDICTIONS = {
  HSJU:
    'The House Committee on the Judiciary has jurisdiction over matters relating to the administration of justice in federal courts, administrative bodies, and law enforcement agencies. Its jurisdiction includes: ' +
    'The judiciary and judicial proceedings, civil and criminal; ' +
    'Administrative practice and procedure; ' +
    'Apportionment of Representatives; ' +
    'Bankruptcy, mutiny, espionage, and counterfeiting; ' +
    'Civil liberties; ' +
    'Constitutional amendments; ' +
    'Criminal law enforcement; ' +
    'Federal courts and judges, and local courts in the Territories and possessions; ' +
    'Immigration policy and non-border enforcement; ' +
    'Interstate compacts generally; ' +
    'Claims against the United States; ' +
    'Members of Congress, attendance of members, Delegates, and the Resident Commissioner; and their acceptance of incompatible offices; ' +
    'National penitentiaries; ' +
    'Patents, the Patent and Trademark Office, copyrights, and trademarks; ' +
    'Presidential succession; ' +
    'Protection of trade and commerce against unlawful restraints and monopolies; ' +
    'Revision and codification of the Statutes of the United States; ' +
    'State and territorial boundary lines; ' +
    'Subversive activities affecting the internal security of the United States.',

  HSWM:
    'The House Committee on Ways and Means has jurisdiction over: ' +
    'Revenue measures generally; ' +
    'Reciprocal trade agreements; ' +
    'Revenue measures relating to insular possessions; ' +
    'Bonded debt of the United States, subject to the last sentence of clause 4(f); ' +
    'Deposit of public monies; ' +
    'Transportation of dutiable goods; ' +
    'Tax exempt foundations and charitable trusts; ' +
    'National social security (except health care and facilities programs that are supported from general revenues as opposed to payroll deductions and except work incentive programs).',
};

// Types for committee validation
interface CommitteeMemberRepresentative {
  bioguideId?: string;
  name?: string;
}

interface CommitteeMember {
  representative?: CommitteeMemberRepresentative;
}

interface CommitteeData {
  id?: string;
  name?: string;
  chamber?: string;
  leadership?: {
    chair?: unknown;
    rankingMember?: unknown;
  };
  members?: CommitteeMember[];
}

// Helper function to validate committee data
export function validateCommitteeData(committee: CommitteeData): string[] {
  const errors: string[] = [];

  if (!committee.id) errors.push('Missing committee ID');
  if (!committee.name) errors.push('Missing committee name');
  if (!committee.chamber) errors.push('Missing chamber');
  if (!committee.leadership?.chair) errors.push('Missing committee chair');
  if (!committee.leadership?.rankingMember) errors.push('Missing ranking member');
  if (!committee.members || committee.members.length === 0) errors.push('No members listed');

  // Validate each member has required fields
  committee.members?.forEach((member: CommitteeMember, index: number) => {
    if (!member.representative?.bioguideId) {
      errors.push(`Member ${index + 1} missing bioguide ID`);
    }
    if (!member.representative?.name) {
      errors.push(`Member ${index + 1} missing name`);
    }
  });

  return errors;
}
