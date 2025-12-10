/**
 * Parse Congressional Caucus Membership Data
 * Source: Congressional Data Coalition
 * https://congressionaldata.org/presenting-caucus-membership-as-data/
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Load the Excel file
const workbook = XLSX.readFile('/tmp/caucus-data.xlsx');

console.log('Sheets:', workbook.SheetNames);

// We want the 119th Congress data (current)
const sheet119 = workbook.Sheets['Member Data 119'];
const data119 = XLSX.utils.sheet_to_json(sheet119);

// Skip the first row (sources) and filter to actual member data
const members = data119.filter(row => row.BioguideID && row.BioguideID.length > 0);

console.log('\n119th Congress members with caucus data:', members.length);

// Define caucus column mappings
const caucusColumns = {
  'Blue Dogs': 'Blue Dog Coalition',
  'Problem Solvers': 'Problem Solvers Caucus',
  'Republican Governance Group / Tuesday Group': 'Republican Governance Group',
  'Freedom Caucus': 'House Freedom Caucus',
  'Main Street Caucus': 'Republican Main Street Caucus',
  'Republican Study Committee': 'Republican Study Committee',
  'Progressives': 'Congressional Progressive Caucus',
  'New Democrats': 'New Democrat Coalition'
};

// Build the caucus membership data
const caucusMembership = {};

members.forEach(member => {
  const bioguideId = member.BioguideID;
  const caucuses = [];

  // Check each caucus column
  Object.entries(caucusColumns).forEach(([column, caucusName]) => {
    if (member[column] && member[column].toLowerCase() === 'yes') {
      caucuses.push(caucusName);
    }
  });

  if (caucuses.length > 0) {
    caucusMembership[bioguideId] = {
      name: `${member.FirstName} ${member.LastName}`.trim(),
      party: member.Party,
      state: member['St/Dis'] ? member['St/Dis'].substring(0, 2) : null,
      district: member['St/Dis'] || null,
      caucuses: caucuses
    };
  }
});

// Create caucus summary
const caucusSummary = {};
Object.values(caucusMembership).forEach(member => {
  member.caucuses.forEach(caucus => {
    if (!caucusSummary[caucus]) {
      caucusSummary[caucus] = { name: caucus, members: 0, party: {} };
    }
    caucusSummary[caucus].members++;
    caucusSummary[caucus].party[member.party] = (caucusSummary[caucus].party[member.party] || 0) + 1;
  });
});

console.log('\nCaucus Summary:');
Object.values(caucusSummary)
  .sort((a, b) => b.members - a.members)
  .forEach(c => {
    console.log(`  ${c.name}: ${c.members} members (D: ${c.party.D || 0}, R: ${c.party.R || 0})`);
  });

// Create the output data structure
const outputData = {
  metadata: {
    source: 'Congressional Data Coalition',
    sourceUrl: 'https://congressionaldata.org/presenting-caucus-membership-as-data/',
    congress: 119,
    generatedAt: new Date().toISOString(),
    description: 'House caucus membership data for the 119th Congress',
    note: 'Caucus membership is self-reported and may not be complete. Some caucuses (e.g., Freedom Caucus) do not publish official rosters.'
  },
  caucuses: Object.values(caucusSummary).map(c => ({
    name: c.name,
    memberCount: c.members,
    partyBreakdown: c.party
  })).sort((a, b) => b.memberCount - a.memberCount),
  members: caucusMembership
};

// Write to public/data directory
const outputPath = path.join(process.cwd(), 'public/data/caucus-membership.json');
fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

console.log(`\nOutput written to: ${outputPath}`);
console.log(`Total members with caucus affiliations: ${Object.keys(caucusMembership).length}`);
