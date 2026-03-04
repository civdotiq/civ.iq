/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress Members Dataset Generator
 *
 * All current members of the 119th Congress with party, state,
 * district, chamber, contact info, and years of service.
 * Source: unitedstates/congress-legislators via RepresentativesCoreService.
 */

import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

const COLUMNS: DatasetColumn[] = [
  {
    key: 'bioguideId',
    label: 'Bioguide ID',
    description: 'Official Congressional bioguide identifier',
    type: 'string',
  },
  { key: 'fullName', label: 'Full Name', description: 'Official full name', type: 'string' },
  { key: 'firstName', label: 'First Name', description: 'First name', type: 'string' },
  { key: 'lastName', label: 'Last Name', description: 'Last name', type: 'string' },
  { key: 'party', label: 'Party Affiliation', description: 'Political party', type: 'string' },
  { key: 'state', label: 'State', description: 'Two-letter state code', type: 'string' },
  {
    key: 'district',
    label: 'District',
    description: 'Congressional district number (House only)',
    type: 'string',
  },
  { key: 'chamber', label: 'Chamber', description: 'House or Senate', type: 'string' },
  {
    key: 'role',
    label: 'Role',
    description: 'Constitutional role (Representative, Senator, Delegate)',
    type: 'string',
  },
  { key: 'phone', label: 'Phone', description: 'Office phone number', type: 'string' },
  { key: 'website', label: 'Website', description: 'Official website URL', type: 'string' },
  {
    key: 'yearsInOffice',
    label: 'Years in Office',
    description: 'Approximate years of service in current chamber',
    type: 'number',
  },
  {
    key: 'nextElection',
    label: 'Next Election',
    description: 'Year of next election',
    type: 'string',
  },
  { key: 'termStart', label: 'Term Start', description: 'Current term start date', type: 'date' },
  { key: 'termEnd', label: 'Term End', description: 'Current term end date', type: 'date' },
];

export async function generateCongressMembers(): Promise<DatasetResult> {
  const representatives = await RepresentativesCoreService.getAllRepresentatives();

  const data = representatives.map(rep => ({
    bioguideId: rep.bioguideId,
    fullName: rep.name,
    firstName: rep.firstName,
    lastName: rep.lastName,
    party: rep.party,
    state: rep.state,
    district: rep.district ?? '',
    chamber: rep.chamber,
    role: rep.role ?? rep.title,
    phone: rep.currentTerm?.phone ?? '',
    website: rep.currentTerm?.website ?? '',
    yearsInOffice: rep.yearsInOffice ?? 0,
    nextElection: rep.nextElection ?? '',
    termStart: rep.currentTerm?.start ?? '',
    termEnd: rep.currentTerm?.end ?? '',
  }));

  return {
    metadata: {
      name: 'Congress Members (119th Congress)',
      slug: 'congress-members',
      description:
        'All current members of the 119th United States Congress including party affiliation, state, district, contact information, and years of service.',
      source: 'unitedstates/congress-legislators',
      sourceUrl: 'https://github.com/unitedstates/congress-legislators',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}
