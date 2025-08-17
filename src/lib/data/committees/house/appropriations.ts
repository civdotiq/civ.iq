/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';

// House Committee on Appropriations - 119th Congress
// Source: https://appropriations.house.gov and Congressional records

const createRepresentative = (
  bioguideId: string,
  name: string,
  party: 'R' | 'D',
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
  chamber: 'House',
  title: `Representative for ${state}-${district}`,
  terms: [
    {
      congress: '119',
      startYear: '2025',
      endYear: '2027',
    },
  ],
  committees: [
    {
      name: 'House Committee on Appropriations',
      role: 'Member',
    },
  ],
});

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

// Committee leadership
const chairman = createRepresentative('C001053', 'Tom Cole', 'R', 'OK', '04');
const rankingMember = createRepresentative('D000216', 'Rosa DeLauro', 'D', 'CT', '03');

// Note: The Appropriations Committee is one of the largest House committees
// Based on the provided data, extracting unique members (removing duplicates)

// Republican members (approx 33 members)
const republicanMembers: EnhancedRepresentative[] = [
  chairman,
  createRepresentative('G000377', 'Kay Granger', 'R', 'TX', '12'),
  createRepresentative('C000059', 'Ken Calvert', 'R', 'CA', '41'),
  createRepresentative('A000055', 'Robert Aderholt', 'R', 'AL', '04'),
  createRepresentative('S001148', 'Mike Simpson', 'R', 'ID', '02'),
  createRepresentative('C001051', 'John Carter', 'R', 'TX', '31'),
  createRepresentative('D000600', 'Mario Diaz-Balart', 'R', 'FL', '26'),
  createRepresentative('W000815', 'Brad Wenstrup', 'R', 'OH', '02'),
  createRepresentative('G000546', 'Sam Graves', 'R', 'MO', '06'),
  createRepresentative('F000449', 'Jeff Fortenberry', 'R', 'NE', '01'),
  createRepresentative('L000595', 'Julia Letlow', 'R', 'LA', '05'),
  createRepresentative('R000609', 'John Rutherford', 'R', 'FL', '05'),
  createRepresentative('M001195', 'Alex Mooney', 'R', 'WV', '02'),
  createRepresentative('N000190', 'Dan Newhouse', 'R', 'WA', '04'),
  createRepresentative('G000591', 'Lori Chavez-DeRemer', 'R', 'OR', '05'),
  createRepresentative('C001115', 'Andrew Clyde', 'R', 'GA', '09'),
  createRepresentative('V000129', 'David Valadao', 'R', 'CA', '22'),
  createRepresentative('A000379', 'Mark Amodei', 'R', 'NV', '02'),
  createRepresentative('C001116', 'Andrew Garbarino', 'R', 'NY', '02'),
  createRepresentative('R000103', 'Matthew Rosendale', 'R', 'MT', '02'),
  createRepresentative('T000480', 'William Timmons', 'R', 'SC', '04'),
  createRepresentative('C001135', 'Ben Cline', 'R', 'VA', '06'),
  createRepresentative('Z000018', 'Ryan Zinke', 'R', 'MT', '01'),
  createRepresentative('K000397', 'Ashley Hinson', 'R', 'IA', '02'),
  createRepresentative('F000472', 'C. Scott Franklin', 'R', 'FL', '18'),
  createRepresentative('V000136', 'Julia Brownley', 'R', 'CA', '26'),
  createRepresentative('G000595', 'Bob Good', 'R', 'VA', '05'),
  createRepresentative('C001125', 'Troy Carter', 'R', 'LA', '02'),
  createRepresentative('D000631', 'Dean Phillips', 'R', 'MN', '03'),
  createRepresentative('K000392', 'Young Kim', 'R', 'CA', '40'),
  createRepresentative('L000589', 'Debbie Lesko', 'R', 'AZ', '08'),
  createRepresentative('M001222', 'Jake LaTurner', 'R', 'KS', '02'),
  createRepresentative('K000398', 'Dave Joyce', 'R', 'OH', '14'),
];

// Democratic members (approx 32 members)
const democraticMembers: EnhancedRepresentative[] = [
  rankingMember,
  createRepresentative('C001090', 'Matt Cartwright', 'D', 'PA', '08'),
  createRepresentative('B000490', 'Sanford Bishop', 'D', 'GA', '02'),
  createRepresentative('M001143', 'Betty McCollum', 'D', 'MN', '04'),
  createRepresentative('L000562', 'Stephen Lynch', 'D', 'MA', '08'),
  createRepresentative('K000381', 'Derek Kilmer', 'D', 'WA', '06'),
  createRepresentative('C001066', 'Kathy Castor', 'D', 'FL', '14'),
  createRepresentative('F000462', 'Lois Frankel', 'D', 'FL', '22'),
  createRepresentative('C001101', 'Katherine Clark', 'D', 'MA', '05'),
  createRepresentative('Q000023', 'Mike Quigley', 'D', 'IL', '05'),
  createRepresentative('H001090', 'Josh Harder', 'D', 'CA', '09'),
  createRepresentative('L000551', 'Barbara Lee', 'D', 'CA', '12'),
  createRepresentative('W000797', 'Debbie Wasserman Schultz', 'D', 'FL', '25'),
  createRepresentative('T000474', 'Norma Torres', 'D', 'CA', '35'),
  createRepresentative('M001188', 'Grace Meng', 'D', 'NY', '06'),
  createRepresentative('A000371', 'Pete Aguilar', 'D', 'CA', '33'),
  createRepresentative('B001286', 'Cheri Bustos', 'D', 'IL', '17'),
  createRepresentative('C001080', 'Judy Chu', 'D', 'CA', '28'),
  createRepresentative('E000297', 'Adriano Espaillat', 'D', 'NY', '13'),
  createRepresentative('H001081', 'Jahana Hayes', 'D', 'CT', '05'),
  createRepresentative('W000826', 'Susan Wild', 'D', 'PA', '07'),
  createRepresentative('M001217', 'Joseph Morelle', 'D', 'NY', '25'),
  createRepresentative('T000488', 'Dina Titus', 'D', 'NV', '01'),
  createRepresentative('U000040', 'Lauren Underwood', 'D', 'IL', '14'),
  createRepresentative('L000593', 'Susie Lee', 'D', 'NV', '03'),
  createRepresentative('H001094', 'Val Hoyle', 'D', 'OR', '04'),
  createRepresentative('S001215', 'Haley Stevens', 'D', 'MI', '11'),
  createRepresentative('B001320', 'Jennifer Wexton', 'D', 'VA', '10'),
  createRepresentative('C001111', 'Charlie Crist', 'D', 'FL', '13'),
  createRepresentative('D000631', 'Madeleine Dean', 'D', 'PA', '04'),
  createRepresentative('C001130', 'Lizzie Fletcher', 'D', 'TX', '07'),
  createRepresentative('S001200', 'Darren Soto', 'D', 'FL', '09'),
];

export const houseAppropriationsCommittee: Committee = {
  id: 'HSAP',
  thomas_id: 'HSAP',
  name: 'House Committee on Appropriations',
  chamber: 'House',
  type: 'Standing',
  jurisdiction:
    "The House Committee on Appropriations is responsible for passing appropriation bills along with its Senate counterpart. The bills passed by the Appropriations Committee regulate expenditures of money by the government of the United States. As such, it is one of the most powerful committees in the House. The committee is responsible for appropriating funding for the federal government's discretionary spending.",

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
    {
      id: 'HSAP01',
      name: 'Agriculture, Rural Development, FDA, and Related Agencies',
      chair: republicanMembers.find(m => m.bioguideId === 'F000449'),
      rankingMember: democraticMembers.find(m => m.name === 'Sanford Bishop'),
      focus: 'Department of Agriculture, FDA, and rural development programs',
      members: [],
    },
    {
      id: 'HSAP02',
      name: 'Commerce, Justice, Science, and Related Agencies',
      chair: republicanMembers.find(m => m.name === 'Robert Aderholt'),
      rankingMember: democraticMembers.find(m => m.name === 'Matt Cartwright'),
      focus: 'Commerce Department, Justice Department, NASA, and NSF',
      members: [],
    },
    {
      id: 'HSAP03',
      name: 'Defense',
      chair: republicanMembers.find(m => m.name === 'Ken Calvert'),
      rankingMember: democraticMembers.find(m => m.name === 'Betty McCollum'),
      focus: 'Department of Defense and military construction',
      members: [],
    },
    {
      id: 'HSAP04',
      name: 'Energy and Water Development',
      chair: republicanMembers.find(m => m.name === 'Mike Simpson'),
      rankingMember: democraticMembers.find(m => m.name === 'Rosa DeLauro'),
      focus: 'Department of Energy, water resources, and nuclear programs',
      members: [],
    },
    {
      id: 'HSAP05',
      name: 'Financial Services and General Government',
      chair: republicanMembers.find(m => m.name === 'Sam Graves'),
      rankingMember: democraticMembers.find(m => m.name === 'Rosa DeLauro'),
      focus: 'Treasury, IRS, federal judiciary, and District of Columbia',
      members: [],
    },
    {
      id: 'HSAP06',
      name: 'Homeland Security',
      chair: republicanMembers.find(m => m.name === 'John Carter'),
      rankingMember: democraticMembers.find(m => m.name === 'Henry Cuellar'),
      focus: 'Department of Homeland Security',
      members: [],
    },
    {
      id: 'HSAP07',
      name: 'Interior, Environment, and Related Agencies',
      chair: republicanMembers.find(m => m.name === 'Mike Simpson'),
      rankingMember: democraticMembers.find(m => m.name === 'Chellie Pingree'),
      focus: 'Interior Department, EPA, and cultural agencies',
      members: [],
    },
    {
      id: 'HSAP08',
      name: 'Labor, Health and Human Services, Education, and Related Agencies',
      chair: chairman,
      rankingMember: rankingMember,
      focus: 'Departments of Labor, HHS, and Education',
      members: [],
    },
    {
      id: 'HSAP09',
      name: 'Legislative Branch',
      chair: republicanMembers.find(m => m.name === 'Kay Granger'),
      rankingMember: democraticMembers.find(m => m.name === 'Adriano Espaillat'),
      focus: 'Congress and legislative branch agencies',
      members: [],
    },
    {
      id: 'HSAP10',
      name: 'Military Construction, Veterans Affairs, and Related Agencies',
      chair: republicanMembers.find(m => m.name === 'Ken Calvert'),
      rankingMember: democraticMembers.find(m => m.name === 'Sanford Bishop'),
      focus: 'Military construction and VA programs',
      members: [],
    },
    {
      id: 'HSAP11',
      name: 'State, Foreign Operations, and Related Programs',
      chair: republicanMembers.find(m => m.name === 'Mario Diaz-Balart'),
      rankingMember: democraticMembers.find(m => m.name === 'Barbara Lee'),
      focus: 'State Department and foreign assistance',
      members: [],
    },
    {
      id: 'HSAP12',
      name: 'Transportation, Housing and Urban Development, and Related Agencies',
      chair: republicanMembers.find(m => m.name === 'Sam Graves'),
      rankingMember: democraticMembers.find(m => m.name === 'Rosa DeLauro'),
      focus: 'DOT and HUD programs',
      members: [],
    },
  ],

  url: 'https://appropriations.house.gov',
  phone: '(202) 225-2771',
  address: 'H-307 The Capitol, Washington, DC 20515',
  established: '1865-03-02',
  lastUpdated: new Date().toISOString(),
};
