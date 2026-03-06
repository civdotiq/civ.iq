/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * LDA Issue Code → Congress.gov PolicyArea Mapping
 *
 * Maps Senate LDA lobbying issue codes to Congress.gov policyArea strings.
 * Only maps codes with clear correspondence. Unmapped codes are excluded
 * from bill matching but their spending still counts in totals.
 *
 * Source: LDA issue codes from https://lda.senate.gov/api/v1/constants/filing/lobbyingactivityissues/
 * Target: Congress.gov policyArea values from policy-area-map.ts
 */

interface LDAIssueEntry {
  code: string;
  label: string;
  policyAreas: string[];
}

const LDA_ISSUES: LDAIssueEntry[] = [
  { code: 'ACC', label: 'Accounting', policyAreas: ['Finance and Financial Sector'] },
  { code: 'ADV', label: 'Advertising', policyAreas: ['Commerce'] },
  {
    code: 'AER',
    label: 'Aerospace',
    policyAreas: ['Science, Technology, Communications', 'Armed Forces and National Security'],
  },
  { code: 'AGR', label: 'Agriculture', policyAreas: ['Agriculture and Food'] },
  { code: 'ALC', label: 'Alcohol and Drug Abuse', policyAreas: ['Health'] },
  { code: 'ANI', label: 'Animals', policyAreas: ['Animals'] },
  { code: 'APP', label: 'Apparel/Clothing Industry/Textiles', policyAreas: ['Commerce'] },
  { code: 'ART', label: 'Arts/Entertainment', policyAreas: ['Arts, Culture, Religion'] },
  {
    code: 'AUT',
    label: 'Automotive Industry',
    policyAreas: ['Transportation and Public Works', 'Commerce'],
  },
  {
    code: 'AVI',
    label: 'Aviation/Aircraft/Airlines',
    policyAreas: ['Transportation and Public Works'],
  },
  { code: 'BAN', label: 'Banking', policyAreas: ['Finance and Financial Sector'] },
  { code: 'BNK', label: 'Bankruptcy', policyAreas: ['Finance and Financial Sector', 'Law'] },
  { code: 'BEV', label: 'Beverage Industry', policyAreas: ['Agriculture and Food', 'Commerce'] },
  { code: 'BUD', label: 'Budget/Appropriations', policyAreas: ['Economics and Public Finance'] },
  {
    code: 'CHM',
    label: 'Chemicals/Chemical Industry',
    policyAreas: ['Environmental Protection', 'Commerce'],
  },
  {
    code: 'CIV',
    label: 'Civil Rights/Civil Liberties',
    policyAreas: ['Civil Rights and Liberties, Minority Issues'],
  },
  {
    code: 'CAW',
    label: 'Clean Air and Water (Pollution)',
    policyAreas: ['Environmental Protection', 'Water Resources Development'],
  },
  {
    code: 'COM',
    label: 'Communications/Broadcasting/Radio/TV',
    policyAreas: ['Science, Technology, Communications'],
  },
  { code: 'CPI', label: 'Computer Industry', policyAreas: ['Science, Technology, Communications'] },
  { code: 'CSP', label: 'Consumer Issues/Safety/Products', policyAreas: ['Commerce'] },
  { code: 'CON', label: 'Constitution', policyAreas: ['Law'] },
  {
    code: 'CPT',
    label: 'Copyright/Patent/Trademark',
    policyAreas: ['Law', 'Science, Technology, Communications'],
  },
  { code: 'DEF', label: 'Defense', policyAreas: ['Armed Forces and National Security'] },
  { code: 'DIS', label: 'Disaster Planning/Emergencies', policyAreas: ['Emergency Management'] },
  {
    code: 'DOC',
    label: 'District of Columbia',
    policyAreas: ['Government Operations and Politics'],
  },
  { code: 'EDU', label: 'Education', policyAreas: ['Education'] },
  { code: 'ENG', label: 'Energy/Nuclear', policyAreas: ['Energy'] },
  { code: 'ENV', label: 'Environmental/Superfund', policyAreas: ['Environmental Protection'] },
  { code: 'FAM', label: 'Family Issues/Abortion/Adoption', policyAreas: ['Families'] },
  { code: 'FIR', label: 'Firearms/Guns/Ammunition', policyAreas: ['Crime and Law Enforcement'] },
  {
    code: 'FIN',
    label: 'Financial Institutions/Investments/Securities',
    policyAreas: ['Finance and Financial Sector'],
  },
  {
    code: 'FOO',
    label: 'Food Industry (Safety, Labeling, etc.)',
    policyAreas: ['Agriculture and Food'],
  },
  { code: 'FOR', label: 'Foreign Relations', policyAreas: ['International Affairs'] },
  { code: 'FUE', label: 'Fuel/Gas/Oil', policyAreas: ['Energy'] },
  { code: 'GAM', label: 'Gaming/Gambling/Casino', policyAreas: ['Commerce'] },
  { code: 'GOV', label: 'Government Issues', policyAreas: ['Government Operations and Politics'] },
  { code: 'HCR', label: 'Health Issues', policyAreas: ['Health'] },
  { code: 'HOM', label: 'Homeland Security', policyAreas: ['Emergency Management'] },
  { code: 'HOU', label: 'Housing', policyAreas: ['Housing and Community Development'] },
  { code: 'IMM', label: 'Immigration', policyAreas: ['Immigration'] },
  { code: 'IND', label: 'Indian/Native American Affairs', policyAreas: ['Native Americans'] },
  { code: 'INS', label: 'Insurance', policyAreas: ['Finance and Financial Sector'] },
  {
    code: 'INT',
    label: 'Intelligence and Surveillance',
    policyAreas: ['Armed Forces and National Security'],
  },
  { code: 'LBR', label: 'Labor Issues/Antitrust/Workplace', policyAreas: ['Labor and Employment'] },
  {
    code: 'LAW',
    label: 'Law Enforcement/Crime/Criminal Justice',
    policyAreas: ['Crime and Law Enforcement'],
  },
  { code: 'MAN', label: 'Manufacturing', policyAreas: ['Commerce'] },
  {
    code: 'MAR',
    label: 'Marine/Maritime/Boating/Fisheries',
    policyAreas: ['Public Lands and Natural Resources'],
  },
  {
    code: 'MIA',
    label: 'Media (Information/Publishing)',
    policyAreas: ['Science, Technology, Communications'],
  },
  { code: 'MED', label: 'Medical/Disease Research/Clinical Labs', policyAreas: ['Health'] },
  { code: 'MMM', label: 'Medicare/Medicaid', policyAreas: ['Health', 'Social Welfare'] },
  {
    code: 'MIN',
    label: 'Mining/Money/Gold Standard',
    policyAreas: ['Public Lands and Natural Resources'],
  },
  {
    code: 'MON',
    label: 'Minting/Money/Gold Standard',
    policyAreas: ['Economics and Public Finance'],
  },
  { code: 'NAT', label: 'Natural Resources', policyAreas: ['Public Lands and Natural Resources'] },
  { code: 'PHA', label: 'Pharmacy', policyAreas: ['Health'] },
  { code: 'POS', label: 'Postal', policyAreas: ['Government Operations and Politics'] },
  { code: 'RRR', label: 'Railroads', policyAreas: ['Transportation and Public Works'] },
  {
    code: 'RES',
    label: 'Real Estate/Land Use/Conservation',
    policyAreas: ['Housing and Community Development', 'Public Lands and Natural Resources'],
  },
  { code: 'REL', label: 'Religion', policyAreas: ['Arts, Culture, Religion'] },
  { code: 'RET', label: 'Retirement', policyAreas: ['Social Welfare', 'Labor and Employment'] },
  { code: 'ROD', label: 'Roads/Highway', policyAreas: ['Transportation and Public Works'] },
  {
    code: 'SCI',
    label: 'Science/Technology',
    policyAreas: ['Science, Technology, Communications'],
  },
  { code: 'SMB', label: 'Small Business', policyAreas: ['Commerce'] },
  { code: 'SPO', label: 'Sports/Athletics', policyAreas: ['Sports and Recreation'] },
  { code: 'TAX', label: 'Taxation/Internal Revenue Code', policyAreas: ['Taxation'] },
  {
    code: 'TEC',
    label: 'Telecommunications',
    policyAreas: ['Science, Technology, Communications'],
  },
  { code: 'TOB', label: 'Tobacco', policyAreas: ['Health', 'Agriculture and Food'] },
  { code: 'TOR', label: 'Tort Reform', policyAreas: ['Law'] },
  {
    code: 'TRD',
    label: 'Trade (Domestic and Foreign)',
    policyAreas: ['Foreign Trade and International Finance', 'Commerce'],
  },
  { code: 'TRA', label: 'Transportation', policyAreas: ['Transportation and Public Works'] },
  { code: 'TOU', label: 'Travel/Tourism', policyAreas: ['Commerce'] },
  { code: 'TRU', label: 'Trucking/Shipping', policyAreas: ['Transportation and Public Works'] },
  {
    code: 'URB',
    label: 'Urban Development/Municipalities',
    policyAreas: ['Housing and Community Development'],
  },
  { code: 'UNM', label: 'Unemployment', policyAreas: ['Labor and Employment'] },
  { code: 'UTI', label: 'Utilities', policyAreas: ['Energy'] },
  { code: 'VET', label: 'Veterans', policyAreas: ['Armed Forces and National Security'] },
  {
    code: 'WAS',
    label: 'Waste (Hazardous/Solid/Interstate/Nuclear)',
    policyAreas: ['Environmental Protection'],
  },
  { code: 'WEL', label: 'Welfare', policyAreas: ['Social Welfare'] },
];

// ── Lookup Indexes ───────────────────────────────────────────────────

/** Map from LDA issue code → policyArea strings. */
export const LDA_ISSUE_POLICY_MAP: Record<string, string[]> = Object.fromEntries(
  LDA_ISSUES.map(entry => [entry.code, entry.policyAreas])
);

const issueCodeToLabel: Record<string, string> = Object.fromEntries(
  LDA_ISSUES.map(entry => [entry.code, entry.label])
);

// ── Exports ──────────────────────────────────────────────────────────

/** Get human-readable label for an LDA issue code. */
export function getLDAIssueLabel(code: string): string {
  return issueCodeToLabel[code] ?? code;
}

/** Get Congress.gov policyArea strings for an LDA issue code. Returns empty array if unmapped. */
export function getPolicyAreasForLDAIssue(code: string): string[] {
  return LDA_ISSUE_POLICY_MAP[code] ?? [];
}

/** Get all known LDA issue codes. */
export function getAllLDAIssueCodes(): string[] {
  return LDA_ISSUES.map(entry => entry.code);
}
