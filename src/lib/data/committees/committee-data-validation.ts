/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Committee data update status
export const COMMITTEE_DATA_STATUS = {
  HSAG: {
    lastUpdated: '2025-01-03',
    dataSource: 'Manual entry based on public information',
    accuracy: 'Sample data - may not reflect current membership',
    notes: [
      'Some members listed may no longer be serving in the 119th Congress',
      'Tom O\'Halleran (AZ-01) lost reelection in 2022',
      'For production use, implement dynamic fetching from official sources',
    ],
  },
};

// Known data issues that need correction
export const KNOWN_DATA_ISSUES = {
  outdatedMembers: [
    {
      bioguideId: 'O000171',
      name: 'Tom O\'Halleran',
      issue: 'Lost reelection in 2022, no longer serving',
      replacedBy: 'David Schweikert (R-AZ-01) as of 2023',
    },
  ],
  missingBioguideIds: [
    // Add any members with incorrect or placeholder bioguide IDs
  ],
};

/**
 * Validates committee member data and logs warnings for known issues
 */
export function validateCommitteeData(members: Array<{ bioguideId: string; name: string }>) {
  const warnings: string[] = [];
  
  members.forEach(member => {
    const knownIssue = KNOWN_DATA_ISSUES.outdatedMembers.find(
      issue => issue.bioguideId === member.bioguideId
    );
    
    if (knownIssue) {
      warnings.push(
        `Warning: ${knownIssue.name} - ${knownIssue.issue}. ${knownIssue.replacedBy}`
      );
    }
  });
  
  return warnings;
}
