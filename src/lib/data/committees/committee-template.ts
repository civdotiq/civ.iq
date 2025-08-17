/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

/**
 * Template for creating committee data files
 * Copy this file and update with correct committee information
 */

// Helper function to create representative data
const createRepresentative = (
  bioguideId: string,
  name: string,
  party: 'R' | 'D' | 'I',
  state: string,
  district?: string
): EnhancedRepresentative => ({
  bioguideId,
  name,
  firstName: name.split(' ')[0] || name,
  lastName: name.split(' ').slice(-1)[0] || name,
  party,
  state,
  district,
  chamber: district ? 'House' : 'Senate', // Adjust based on committee type
  title: district ? `Representative for ${state}-${district}` : `Senator for ${state}`,
  terms: [
    {
      congress: '119',
      startYear: '2025',
      endYear: district ? '2027' : '2031',
    },
  ],
  committees: [
    {
      name: '[Committee Name]',
      role: 'Member',
    },
  ],
});

// Helper to create committee member
const createCommitteeMember = (
  rep: EnhancedRepresentative,
  role: 'Chair' | 'Ranking Member' | 'Vice Chair' | 'Member',
  rank: number,
  joinedDate: string = '2025-01-03'
): CommitteeMember => ({
  representative: rep,
  role,
  joinedDate,
  rank,
  subcommittees: [],
});

// TEMPLATE: Update committee leadership
const chairman = createRepresentative('[BIOGUIDE_ID]', '[Full Name]', 'R', '[STATE]', '[DISTRICT]');
const rankingMember = createRepresentative(
  '[BIOGUIDE_ID]',
  '[Full Name]',
  'D',
  '[STATE]',
  '[DISTRICT]'
);

// TEMPLATE: Add all Republican members
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  // Add members here...
];

// TEMPLATE: Add all Democratic members
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  // Add members here...
];

// TEMPLATE: Update committee details
export const templateCommittee: Committee = {
  id: '[COMMITTEE_ID]', // e.g., 'HSJU' for House Judiciary
  thomas_id: '[THOMAS_ID]', // Usually same as ID
  name: '[Full Committee Name]', // e.g., 'House Committee on the Judiciary'
  chamber: 'House', // or 'Senate' or 'Joint'
  type: 'Standing', // or 'Select' or 'Special'
  jurisdiction: '[Committee jurisdiction description]',

  leadership: {
    chair: createCommitteeMember(chairman, 'Chair', 1),
    rankingMember: createCommitteeMember(rankingMember, 'Ranking Member', 2),
  },

  members: [
    // Leadership
    createCommitteeMember(chairman, 'Chair', 1),
    createCommitteeMember(rankingMember, 'Ranking Member', 2),

    // Republican members (excluding chair)
    ...republicanMembers
      .slice(1)
      .map((rep, index) => createCommitteeMember(rep, 'Member', index + 3)),

    // Democratic members (excluding ranking member)
    ...democraticMembers
      .slice(1)
      .map((rep, index) =>
        createCommitteeMember(rep, 'Member', republicanMembers.length + index + 2)
      ),
  ],

  subcommittees: [
    // Add subcommittees with their members
    {
      id: '[SUBCOMMITTEE_ID]',
      name: '[Subcommittee Name]',
      chair: republicanMembers.find(m => m.name === '[Chair Name]'),
      rankingMember: democraticMembers.find(m => m.name === '[Ranking Member Name]'),
      focus: '[Subcommittee jurisdiction/focus]',
      members: [
        // Add subcommittee members
      ],
    },
  ],

  url: '[Committee website URL]',
  phone: '[Committee phone]',
  address: '[Committee office address]',
  established: '[YYYY-MM-DD]',
  lastUpdated: new Date().toISOString(),
};
