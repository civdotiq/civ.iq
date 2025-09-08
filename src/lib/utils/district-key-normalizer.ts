// State name to abbreviation mapping
const STATE_NAME_TO_ABBR: { [key: string]: string } = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

/**
 * Creates a standardized district identifier from state and district codes.
 * Handles at-large districts and standard numbered districts.
 * Example outputs: "CA-12", "WY-AL", "PR-AL"
 *
 * @param state - The state name (e.g., "California") or abbreviation (e.g., "CA")
 * @param district - The district identifier (e.g., "12", "At-Large", "00", "01").
 * @returns A normalized string identifier for the district.
 */
export function normalizeDistrictKey(state: string, district: string | number): string {
  // Convert state name to abbreviation if needed
  let stateAbbr = state.toUpperCase().trim();
  
  // If it's a full state name, convert to abbreviation
  if (stateAbbr.length > 2) {
    const found = STATE_NAME_TO_ABBR[state.trim()];
    if (found) {
      stateAbbr = found;
    } else {
      console.warn(`Unknown state name: "${state}"`);
    }
  }
  
  const districtStr = String(district).trim();

  // Handle at-large districts, which can be represented in multiple ways
  if (
    districtStr === '00' || 
    districtStr === '0' ||
    districtStr.toLowerCase() === 'at-large' ||
    districtStr.toLowerCase() === 'at large'
  ) {
    return `${stateAbbr}-AL`;
  }

  // For standard districts, parse the number to remove leading zeros (e.g., "01" -> "1")
  const districtNum = parseInt(districtStr, 10);
  
  // Handle invalid district numbers
  if (isNaN(districtNum) || districtNum < 1) {
    console.warn(`Invalid district number: "${districtStr}" for state ${state}`);
    return `${stateAbbr}-INVALID`;
  }
  
  // Format with zero-padding to match Census format (e.g., "1" -> "01")
  return `${stateAbbr}-${districtNum.toString().padStart(2, '0')}`;
}

/**
 * Creates a standardized district key for Congressional districts.
 * This is the main function that should be used throughout the application
 * to ensure consistent district key generation.
 * 
 * @param state - State abbreviation (e.g., "CA", "WY")  
 * @param district - District number or identifier
 * @returns Normalized district key (e.g., "CA-12", "WY-AL")
 */
export function createDistrictKey(state: string, district: string | number): string {
  return normalizeDistrictKey(state, district);
}