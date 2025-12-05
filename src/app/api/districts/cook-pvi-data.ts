// Cook Partisan Voting Index (PVI) data
// Source: Cook Political Report
// Note: This should be updated regularly as new PVI calculations are released

export const COOK_PVI_DATA: { [key: string]: string } = {
  // Alabama
  'AL-01': 'R+15',
  'AL-02': 'R+16',
  'AL-03': 'R+14',
  'AL-04': 'R+29',
  'AL-05': 'R+16',
  'AL-06': 'R+25',
  'AL-07': 'D+14',

  // Alaska
  'AK-00': 'R+8',
  'AK-01': 'R+8',

  // Arizona
  'AZ-01': 'R+2',
  'AZ-02': 'R+6',
  'AZ-03': 'D+13',
  'AZ-04': 'D+2',
  'AZ-05': 'R+10',
  'AZ-06': 'R+3',
  'AZ-07': 'D+20',
  'AZ-08': 'R+7',
  'AZ-09': 'R+7',

  // Arkansas
  'AR-01': 'R+14',
  'AR-02': 'R+11',
  'AR-03': 'R+21',
  'AR-04': 'R+20',

  // California
  'CA-01': 'R+11',
  'CA-02': 'D+21',
  'CA-03': 'R+3',
  'CA-04': 'D+5',
  'CA-05': 'R+3',
  'CA-06': 'D+21',
  'CA-07': 'D+14',
  'CA-08': 'D+21',
  'CA-09': 'D+5',
  'CA-10': 'D+13',
  'CA-11': 'D+37',
  'CA-12': 'D+40',
  'CA-13': 'R+3',
  'CA-14': 'D+23',
  'CA-15': 'D+19',
  'CA-16': 'D+11',
  'CA-17': 'D+23',
  'CA-18': 'D+13',
  'CA-19': 'D+21',
  'CA-20': 'D+5',
  'CA-21': 'D+11',
  'CA-22': 'R+5',
  'CA-23': 'D+8',
  'CA-24': 'D+8',
  'CA-25': 'D+8',
  'CA-26': 'D+4',
  'CA-27': 'R+2',
  'CA-28': 'D+20',
  'CA-29': 'D+23',
  'CA-30': 'D+35',
  'CA-31': 'D+17',
  'CA-32': 'D+17',
  'CA-33': 'D+11',
  'CA-34': 'D+27',
  'CA-35': 'D+19',
  'CA-36': 'D+17',
  'CA-37': 'D+27',
  'CA-38': 'D+17',
  'CA-39': 'D+10',
  'CA-40': 'R+1',
  'CA-41': 'R+2',
  'CA-42': 'D+14',
  'CA-43': 'D+33',
  'CA-44': 'D+21',
  'CA-45': 'D+2',
  'CA-46': 'D+12',
  'CA-47': 'D+5',
  'CA-48': 'R+1',
  'CA-49': 'D+4',
  'CA-50': 'D+14',
  'CA-51': 'D+21',
  'CA-52': 'D+12',

  // Colorado
  'CO-01': 'D+26',
  'CO-02': 'D+19',
  'CO-03': 'R+7',
  'CO-04': 'R+13',
  'CO-05': 'R+9',
  'CO-06': 'D+4',
  'CO-07': 'D+3',
  'CO-08': 'EVEN',

  // Connecticut
  'CT-01': 'D+8',
  'CT-02': 'D+3',
  'CT-03': 'D+9',
  'CT-04': 'D+8',
  'CT-05': 'D+3',

  // Delaware
  'DE-00': 'D+7',
  'DE-01': 'D+7',

  // Florida
  'FL-01': 'R+20',
  'FL-02': 'R+9',
  'FL-03': 'R+18',
  'FL-04': 'R+11',
  'FL-05': 'R+9',
  'FL-06': 'R+8',
  'FL-07': 'R+5',
  'FL-08': 'R+12',
  'FL-09': 'D+7',
  'FL-10': 'D+15',
  'FL-11': 'R+18',
  'FL-12': 'R+14',
  'FL-13': 'R+6',
  'FL-14': 'D+7',
  'FL-15': 'R+1',
  'FL-16': 'R+8',
  'FL-17': 'R+13',
  'FL-18': 'R+9',
  'FL-19': 'R+16',
  'FL-20': 'D+27',
  'FL-21': 'R+7',
  'FL-22': 'D+5',
  'FL-23': 'D+8',
  'FL-24': 'D+25',
  'FL-25': 'D+4',
  'FL-26': 'R+5',
  'FL-27': 'R+2',
  'FL-28': 'R+11',

  // Georgia
  'GA-01': 'R+9',
  'GA-02': 'D+3',
  'GA-03': 'R+18',
  'GA-04': 'D+26',
  'GA-05': 'D+30',
  'GA-06': 'R+9',
  'GA-07': 'D+8',
  'GA-08': 'R+14',
  'GA-09': 'R+28',
  'GA-10': 'R+15',
  'GA-11': 'R+13',
  'GA-12': 'R+9',
  'GA-13': 'D+18',
  'GA-14': 'R+22',

  // Hawaii
  'HI-01': 'D+14',
  'HI-02': 'D+13',

  // Idaho
  'ID-01': 'R+18',
  'ID-02': 'R+13',

  // Illinois
  'IL-01': 'D+23',
  'IL-02': 'D+25',
  'IL-03': 'D+12',
  'IL-04': 'D+36',
  'IL-05': 'D+21',
  'IL-06': 'D+3',
  'IL-07': 'D+36',
  'IL-08': 'D+8',
  'IL-09': 'D+18',
  'IL-10': 'D+10',
  'IL-11': 'D+5',
  'IL-12': 'R+5',
  'IL-13': 'D+3',
  'IL-14': 'D+5',
  'IL-15': 'R+4',
  'IL-16': 'R+4',
  'IL-17': 'D+2',

  // Indiana
  'IN-01': 'D+8',
  'IN-02': 'R+11',
  'IN-03': 'R+16',
  'IN-04': 'R+19',
  'IN-05': 'R+7',
  'IN-06': 'R+17',
  'IN-07': 'D+19',
  'IN-08': 'R+15',
  'IN-09': 'R+13',

  // Iowa
  'IA-01': 'D+1',
  'IA-02': 'R+1',
  'IA-03': 'R+3',
  'IA-04': 'R+11',

  // Kansas
  'KS-01': 'R+24',
  'KS-02': 'R+11',
  'KS-03': 'D+3',
  'KS-04': 'R+9',

  // Kentucky
  'KY-01': 'R+23',
  'KY-02': 'R+19',
  'KY-03': 'D+8',
  'KY-04': 'R+17',
  'KY-05': 'R+29',
  'KY-06': 'R+9',

  // Louisiana
  'LA-01': 'R+20',
  'LA-02': 'D+19',
  'LA-03': 'R+21',
  'LA-04': 'R+15',
  'LA-05': 'R+14',
  'LA-06': 'R+8',

  // Maine
  'ME-01': 'D+6',
  'ME-02': 'R+6',

  // Maryland
  'MD-01': 'R+7',
  'MD-02': 'D+11',
  'MD-03': 'D+12',
  'MD-04': 'D+32',
  'MD-05': 'D+15',
  'MD-06': 'D+2',
  'MD-07': 'D+25',
  'MD-08': 'D+16',

  // Massachusetts
  'MA-01': 'D+14',
  'MA-02': 'D+11',
  'MA-03': 'D+8',
  'MA-04': 'D+10',
  'MA-05': 'D+14',
  'MA-06': 'D+9',
  'MA-07': 'D+35',
  'MA-08': 'D+17',
  'MA-09': 'D+9',

  // Michigan
  'MI-01': 'R+8',
  'MI-02': 'R+5',
  'MI-03': 'D+1',
  'MI-04': 'R+8',
  'MI-05': 'R+2',
  'MI-06': 'D+4',
  'MI-07': 'D+2',
  'MI-08': 'R+1',
  'MI-09': 'R+5',
  'MI-10': 'R+3',
  'MI-11': 'D+5',
  'MI-12': 'D+16',
  'MI-13': 'D+23',

  // Minnesota
  'MN-01': 'R+5',
  'MN-02': 'D+1',
  'MN-03': 'D+8',
  'MN-04': 'D+14',
  'MN-05': 'D+23',
  'MN-06': 'R+8',
  'MN-07': 'R+11',
  'MN-08': 'R+3',

  // Mississippi
  'MS-01': 'R+13',
  'MS-02': 'D+11',
  'MS-03': 'R+13',
  'MS-04': 'R+16',

  // Missouri
  'MO-01': 'D+25',
  'MO-02': 'R+8',
  'MO-03': 'R+9',
  'MO-04': 'R+14',
  'MO-05': 'D+12',
  'MO-06': 'R+13',
  'MO-07': 'R+23',
  'MO-08': 'R+24',

  // Montana
  'MT-01': 'R+7',
  'MT-02': 'R+11',

  // Nebraska
  'NE-01': 'R+9',
  'NE-02': 'EVEN',
  'NE-03': 'R+29',

  // Nevada
  'NV-01': 'D+7',
  'NV-02': 'R+5',
  'NV-03': 'D+1',
  'NV-04': 'D+3',

  // New Hampshire
  'NH-01': 'EVEN',
  'NH-02': 'D+2',

  // New Jersey
  'NJ-01': 'D+12',
  'NJ-02': 'R+1',
  'NJ-03': 'R+2',
  'NJ-04': 'R+12',
  'NJ-05': 'D+2',
  'NJ-06': 'D+9',
  'NJ-07': 'R+1',
  'NJ-08': 'D+26',
  'NJ-09': 'D+17',
  'NJ-10': 'D+35',
  'NJ-11': 'D+5',
  'NJ-12': 'D+16',

  // New Mexico
  'NM-01': 'D+9',
  'NM-02': 'R+5',
  'NM-03': 'D+5',

  // New York
  'NY-01': 'R+2',
  'NY-02': 'R+2',
  'NY-03': 'D+2',
  'NY-04': 'D+5',
  'NY-05': 'D+29',
  'NY-06': 'D+16',
  'NY-07': 'D+25',
  'NY-08': 'D+29',
  'NY-09': 'D+31',
  'NY-10': 'D+30',
  'NY-11': 'R+5',
  'NY-12': 'D+35',
  'NY-13': 'D+30',
  'NY-14': 'D+28',
  'NY-15': 'D+40',
  'NY-16': 'D+15',
  'NY-17': 'D+3',
  'NY-18': 'R+1',
  'NY-19': 'EVEN',
  'NY-20': 'D+7',
  'NY-21': 'R+4',
  'NY-22': 'R+8',
  'NY-23': 'R+11',
  'NY-24': 'R+6',
  'NY-25': 'D+3',
  'NY-26': 'D+8',

  // North Carolina
  'NC-01': 'R+1',
  'NC-02': 'D+4',
  'NC-03': 'R+10',
  'NC-04': 'D+16',
  'NC-05': 'R+12',
  'NC-06': 'D+2',
  'NC-07': 'R+9',
  'NC-08': 'R+13',
  'NC-09': 'R+8',
  'NC-10': 'R+15',
  'NC-11': 'R+14',
  'NC-12': 'D+16',
  'NC-13': 'R+2',
  'NC-14': 'D+11',

  // North Dakota
  'ND-00': 'R+20',

  // Ohio
  'OH-01': 'D+2',
  'OH-02': 'R+17',
  'OH-03': 'D+19',
  'OH-04': 'R+18',
  'OH-05': 'R+15',
  'OH-06': 'R+14',
  'OH-07': 'R+11',
  'OH-08': 'R+17',
  'OH-09': 'D+3',
  'OH-10': 'R+11',
  'OH-11': 'D+25',
  'OH-12': 'R+11',
  'OH-13': 'R+1',
  'OH-14': 'R+7',
  'OH-15': 'R+6',

  // Oklahoma
  'OK-01': 'R+17',
  'OK-02': 'R+24',
  'OK-03': 'R+27',
  'OK-04': 'R+13',
  'OK-05': 'R+5',

  // Oregon
  'OR-01': 'D+8',
  'OR-02': 'R+11',
  'OR-03': 'D+24',
  'OR-04': 'D+2',
  'OR-05': 'D+2',
  'OR-06': 'D+3',

  // Pennsylvania
  'PA-01': 'R+1',
  'PA-02': 'D+25',
  'PA-03': 'D+30',
  'PA-04': 'D+11',
  'PA-05': 'D+13',
  'PA-06': 'D+5',
  'PA-07': 'R+2',
  'PA-08': 'R+4',
  'PA-09': 'R+22',
  'PA-10': 'R+2',
  'PA-11': 'R+15',
  'PA-12': 'D+8',
  'PA-13': 'R+17',
  'PA-14': 'R+13',
  'PA-15': 'R+20',
  'PA-16': 'R+8',
  'PA-17': 'D+1',

  // Rhode Island
  'RI-01': 'D+13',
  'RI-02': 'D+8',

  // South Carolina
  'SC-01': 'R+7',
  'SC-02': 'R+11',
  'SC-03': 'R+19',
  'SC-04': 'R+14',
  'SC-05': 'R+8',
  'SC-06': 'D+12',
  'SC-07': 'R+18',

  // South Dakota
  'SD-00': 'R+16',

  // Tennessee
  'TN-01': 'R+30',
  'TN-02': 'R+20',
  'TN-03': 'R+18',
  'TN-04': 'R+20',
  'TN-05': 'D+5',
  'TN-06': 'R+23',
  'TN-07': 'R+15',
  'TN-08': 'R+19',
  'TN-09': 'D+26',

  // Texas
  'TX-01': 'R+25',
  'TX-02': 'R+13',
  'TX-03': 'R+13',
  'TX-04': 'R+25',
  'TX-05': 'R+16',
  'TX-06': 'R+15',
  'TX-07': 'D+9',
  'TX-08': 'R+26',
  'TX-09': 'D+18',
  'TX-10': 'R+13',
  'TX-11': 'R+32',
  'TX-12': 'R+16',
  'TX-13': 'R+33',
  'TX-14': 'R+13',
  'TX-15': 'R+1',
  'TX-16': 'D+13',
  'TX-17': 'R+14',
  'TX-18': 'D+23',
  'TX-19': 'R+26',
  'TX-20': 'D+13',
  'TX-21': 'R+10',
  'TX-22': 'R+10',
  'TX-23': 'R+5',
  'TX-24': 'R+9',
  'TX-25': 'R+10',
  'TX-26': 'R+18',
  'TX-27': 'R+13',
  'TX-28': 'D+5',
  'TX-29': 'D+19',
  'TX-30': 'D+25',
  'TX-31': 'R+12',
  'TX-32': 'D+12',
  'TX-33': 'D+16',
  'TX-34': 'R+9',
  'TX-35': 'D+18',
  'TX-36': 'R+29',
  'TX-37': 'D+18',
  'TX-38': 'R+20',

  // Utah
  'UT-01': 'R+19',
  'UT-02': 'R+11',
  'UT-03': 'R+19',
  'UT-04': 'R+16',

  // Vermont
  'VT-00': 'D+16',

  // Virginia
  'VA-01': 'R+6',
  'VA-02': 'R+2',
  'VA-03': 'D+16',
  'VA-04': 'D+16',
  'VA-05': 'R+7',
  'VA-06': 'R+13',
  'VA-07': 'D+1',
  'VA-08': 'D+26',
  'VA-09': 'R+22',
  'VA-10': 'D+6',
  'VA-11': 'D+16',

  // Washington
  'WA-01': 'D+12',
  'WA-02': 'D+10',
  'WA-03': 'R+5',
  'WA-04': 'R+11',
  'WA-05': 'R+7',
  'WA-06': 'D+5',
  'WA-07': 'D+33',
  'WA-08': 'D+1',
  'WA-09': 'D+23',
  'WA-10': 'D+5',

  // West Virginia
  'WV-01': 'R+22',
  'WV-02': 'R+22',

  // Wisconsin
  'WI-01': 'R+3',
  'WI-02': 'D+16',
  'WI-03': 'R+4',
  'WI-04': 'D+31',
  'WI-05': 'R+12',
  'WI-06': 'R+10',
  'WI-07': 'R+8',
  'WI-08': 'R+10',

  // Wyoming
  'WY-00': 'R+25',
};

export function getCookPVI(state: string, district: string): string {
  const key = `${state}-${district.padStart(2, '0')}`;
  let pvi = COOK_PVI_DATA[key];

  // Handle at-large districts - check both 00 and 01
  if (!pvi && district === '01') {
    pvi = COOK_PVI_DATA[`${state}-00`];
  }

  return pvi || 'EVEN';
}

/**
 * Parse Cook PVI string to extract party and margin
 * Example: "R+15" -> { party: 'R', margin: 15 }
 * Example: "D+5" -> { party: 'D', margin: 5 }
 * Example: "EVEN" -> { party: null, margin: 0 }
 */
export function parseCookPVI(pvi: string): { party: 'R' | 'D' | null; margin: number } {
  if (pvi === 'EVEN') {
    return { party: null, margin: 0 };
  }

  const match = pvi.match(/^([RD])\+(\d+)$/);
  if (match) {
    return {
      party: match[1] as 'R' | 'D',
      margin: parseInt(match[2] || '0', 10),
    };
  }

  return { party: null, margin: 0 };
}

/**
 * Estimate election margin from Cook PVI
 * Cook PVI roughly correlates to expected margin:
 * R+5 suggests ~5% Republican margin in a neutral election year
 * This is an ESTIMATE, not actual election results
 */
export function estimateMarginFromPVI(pvi: string): number {
  const parsed = parseCookPVI(pvi);
  // Return the margin as a positive number (the party info is in cookPVI)
  return parsed.margin;
}

/**
 * Determine if a district is competitive based on Cook PVI
 * Competitive is typically defined as ±5 points or EVEN
 */
export function isCompetitiveDistrict(pvi: string): boolean {
  if (pvi === 'EVEN') return true;
  const parsed = parseCookPVI(pvi);
  return parsed.margin <= 5;
}

/**
 * Get total count of competitive districts from Cook PVI data
 */
export function getCompetitiveDistrictCount(): number {
  return Object.values(COOK_PVI_DATA).filter(pvi => isCompetitiveDistrict(pvi)).length;
}
