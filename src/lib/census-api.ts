import { cache } from 'react';

export interface CongressionalDistrict {
  state: string;
  stateCode: string;
  district: string;
  districtName: string;
}

// ZIP to Congressional District mapping for major cities (fallback data)
// Source: US Census Bureau
const ZIP_TO_DISTRICT: Record<string, { state: string; district: string }> = {
  // Michigan
  '48221': { state: 'MI', district: '13' }, // Detroit
  '48201': { state: 'MI', district: '13' }, // Detroit
  '48226': { state: 'MI', district: '13' }, // Detroit
  '49503': { state: 'MI', district: '03' }, // Grand Rapids
  
  // California
  '90210': { state: 'CA', district: '36' }, // Beverly Hills
  '94102': { state: 'CA', district: '11' }, // San Francisco
  '92101': { state: 'CA', district: '50' }, // San Diego
  
  // New York
  '10001': { state: 'NY', district: '12' }, // Manhattan
  '10013': { state: 'NY', district: '10' }, // Manhattan
  '11201': { state: 'NY', district: '07' }, // Brooklyn
  
  // Add more as needed...
};

// State names mapping
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
  'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
  'MS': 'Mississippi', 'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska',
  'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico',
  'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas',
  'UT': 'Utah', 'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington',
  'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
};

/**
 * Get congressional district from ZIP code
 * Uses hardcoded mapping for MVP, will integrate with Census API later
 */
export const getCongressionalDistrictFromZip = cache(async (zipCode: string): Promise<CongressionalDistrict | null> => {
  // Check our hardcoded mapping first
  const mapping = ZIP_TO_DISTRICT[zipCode];
  if (mapping) {
    const stateName = STATE_NAMES[mapping.state] || mapping.state;
    const districtNumber = mapping.district === '00' ? 'At-Large' : parseInt(mapping.district, 10).toString();
    
    return {
      state: mapping.state,
      stateCode: mapping.state,
      district: mapping.district,
      districtName: `${stateName} ${districtNumber === 'At-Large' ? 'At-Large' : `District ${districtNumber}`}`
    };
  }
  
  // For MVP, if ZIP not in our mapping, try to extract state from ZIP ranges
  // This is a simplified approach for demo purposes
  const zipNum = parseInt(zipCode, 10);
  
  // Basic ZIP code range to state mapping (simplified)
  let state = '';
  let stateName = '';
  
  if (zipNum >= 35000 && zipNum <= 36999) {
    state = 'AL'; stateName = 'Alabama';
  } else if (zipNum >= 99500 && zipNum <= 99999) {
    state = 'AK'; stateName = 'Alaska';
  } else if (zipNum >= 85000 && zipNum <= 86999) {
    state = 'AZ'; stateName = 'Arizona';
  } else if (zipNum >= 71600 && zipNum <= 72999) {
    state = 'AR'; stateName = 'Arkansas';
  } else if (zipNum >= 90000 && zipNum <= 96699) {
    state = 'CA'; stateName = 'California';
  } else if (zipNum >= 80000 && zipNum <= 81999) {
    state = 'CO'; stateName = 'Colorado';
  } else if (zipNum >= 6000 && zipNum <= 6999) {
    state = 'CT'; stateName = 'Connecticut';
  } else if (zipNum >= 19700 && zipNum <= 19999) {
    state = 'DE'; stateName = 'Delaware';
  } else if (zipNum >= 32000 && zipNum <= 34999) {
    state = 'FL'; stateName = 'Florida';
  } else if (zipNum >= 30000 && zipNum <= 31999) {
    state = 'GA'; stateName = 'Georgia';
  } else if (zipNum >= 96700 && zipNum <= 96899) {
    state = 'HI'; stateName = 'Hawaii';
  } else if (zipNum >= 83200 && zipNum <= 83999) {
    state = 'ID'; stateName = 'Idaho';
  } else if (zipNum >= 60000 && zipNum <= 62999) {
    state = 'IL'; stateName = 'Illinois';
  } else if (zipNum >= 46000 && zipNum <= 47999) {
    state = 'IN'; stateName = 'Indiana';
  } else if (zipNum >= 50000 && zipNum <= 52999) {
    state = 'IA'; stateName = 'Iowa';
  } else if (zipNum >= 66000 && zipNum <= 67999) {
    state = 'KS'; stateName = 'Kansas';
  } else if (zipNum >= 40000 && zipNum <= 42999) {
    state = 'KY'; stateName = 'Kentucky';
  } else if (zipNum >= 70000 && zipNum <= 71599) {
    state = 'LA'; stateName = 'Louisiana';
  } else if (zipNum >= 3900 && zipNum <= 4999) {
    state = 'ME'; stateName = 'Maine';
  } else if (zipNum >= 20600 && zipNum <= 21999) {
    state = 'MD'; stateName = 'Maryland';
  } else if (zipNum >= 1000 && zipNum <= 2799) {
    state = 'MA'; stateName = 'Massachusetts';
  } else if (zipNum >= 48000 && zipNum <= 49999) {
    state = 'MI'; stateName = 'Michigan';
  } else if (zipNum >= 55000 && zipNum <= 56799) {
    state = 'MN'; stateName = 'Minnesota';
  } else if (zipNum >= 38600 && zipNum <= 39999) {
    state = 'MS'; stateName = 'Mississippi';
  } else if (zipNum >= 63000 && zipNum <= 65999) {
    state = 'MO'; stateName = 'Missouri';
  } else if (zipNum >= 59000 && zipNum <= 59999) {
    state = 'MT'; stateName = 'Montana';
  } else if (zipNum >= 68000 && zipNum <= 69999) {
    state = 'NE'; stateName = 'Nebraska';
  } else if (zipNum >= 88900 && zipNum <= 89999) {
    state = 'NV'; stateName = 'Nevada';
  } else if (zipNum >= 3000 && zipNum <= 3899) {
    state = 'NH'; stateName = 'New Hampshire';
  } else if (zipNum >= 7000 && zipNum <= 8999) {
    state = 'NJ'; stateName = 'New Jersey';
  } else if (zipNum >= 87000 && zipNum <= 88499) {
    state = 'NM'; stateName = 'New Mexico';
  } else if (zipNum >= 10000 && zipNum <= 14999) {
    state = 'NY'; stateName = 'New York';
  } else if (zipNum >= 27000 && zipNum <= 28999) {
    state = 'NC'; stateName = 'North Carolina';
  } else if (zipNum >= 58000 && zipNum <= 58999) {
    state = 'ND'; stateName = 'North Dakota';
  } else if (zipNum >= 43000 && zipNum <= 45999) {
    state = 'OH'; stateName = 'Ohio';
  } else if (zipNum >= 73000 && zipNum <= 74999) {
    state = 'OK'; stateName = 'Oklahoma';
  } else if (zipNum >= 97000 && zipNum <= 97999) {
    state = 'OR'; stateName = 'Oregon';
  } else if (zipNum >= 15000 && zipNum <= 19699) {
    state = 'PA'; stateName = 'Pennsylvania';
  } else if (zipNum >= 2800 && zipNum <= 2999) {
    state = 'RI'; stateName = 'Rhode Island';
  } else if (zipNum >= 29000 && zipNum <= 29999) {
    state = 'SC'; stateName = 'South Carolina';
  } else if (zipNum >= 57000 && zipNum <= 57999) {
    state = 'SD'; stateName = 'South Dakota';
  } else if (zipNum >= 37000 && zipNum <= 38599) {
    state = 'TN'; stateName = 'Tennessee';
  } else if (zipNum >= 75000 && zipNum <= 79999) {
    state = 'TX'; stateName = 'Texas';
  } else if (zipNum >= 84000 && zipNum <= 84999) {
    state = 'UT'; stateName = 'Utah';
  } else if (zipNum >= 5000 && zipNum <= 5999) {
    state = 'VT'; stateName = 'Vermont';
  } else if (zipNum >= 22000 && zipNum <= 24699) {
    state = 'VA'; stateName = 'Virginia';
  } else if (zipNum >= 98000 && zipNum <= 99499) {
    state = 'WA'; stateName = 'Washington';
  } else if (zipNum >= 24700 && zipNum <= 26999) {
    state = 'WV'; stateName = 'West Virginia';
  } else if (zipNum >= 53000 && zipNum <= 54999) {
    state = 'WI'; stateName = 'Wisconsin';
  } else if (zipNum >= 82000 && zipNum <= 83199) {
    state = 'WY'; stateName = 'Wyoming';
  }
  
  if (state) {
    // For demo purposes, assign a random district (would need real data)
    const district = '01'; // Default to district 1
    
    return {
      state: state,
      stateCode: state,
      district: district,
      districtName: `${stateName} District 1`
    };
  }
  
  return null;
});

/**
 * Alternative method using one-line address endpoint
 * For future implementation with full Census API integration
 */
export const getCongressionalDistrictFromAddress = cache(async (address: string): Promise<CongressionalDistrict | null> => {
  // Placeholder for future Census API integration
  // For now, try to extract ZIP and use our fallback method
  const zipMatch = address.match(/\b\d{5}\b/);
  if (zipMatch) {
    return getCongressionalDistrictFromZip(zipMatch[0]);
  }
  
  return null;
});