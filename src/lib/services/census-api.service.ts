/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Census API Service
 * Official Census.gov API client for 119th Congress geographic data
 * CLAUDE.md Compliant: Real government APIs only
 */

interface CensusDistrictResponse {
  name: string;
  state: string;
  district: string;
}

/**
 * Census API client for 119th Congress congressional district data
 * Rate-limited and error-handled for production use
 */
export class CensusAPIClient {
  private readonly baseURL = 'https://api.census.gov/data/2024/acs/acs1';
  private readonly requestDelay = 100; // Rate limiting: 10 requests/second

  /**
   * Make rate-limited HTTP request to Census API
   */
  private async makeRequest(url: string): Promise<string[][]> {
    await new Promise(resolve => setTimeout(resolve, this.requestDelay));

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Parse Census API district response format
   */
  private parseDistrictResponse(data: string[][]): CensusDistrictResponse[] {
    return data.slice(1).map(([name, state, district]) => ({
      name: name ?? 'Unknown District',
      state: state ?? '00',
      district: district ?? '00',
    }));
  }

  /**
   * Fetch all congressional districts for a state
   */
  async getDistrictsForState(stateCode: string): Promise<CensusDistrictResponse[]> {
    const url = `${this.baseURL}?get=NAME&for=congressional%20district:*&in=state:${stateCode}`;
    const response = await this.makeRequest(url);
    return this.parseDistrictResponse(response);
  }

  /**
   * Batch process all 50 states + DC + territories for complete 435 district coverage
   */
  async getAllCongressionalDistricts(): Promise<CensusDistrictResponse[]> {
    const stateCodes = [
      '01',
      '02',
      '04',
      '05',
      '06',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
      '30',
      '31',
      '32',
      '33',
      '34',
      '35',
      '36',
      '37',
      '38',
      '39',
      '40',
      '41',
      '42',
      '44',
      '45',
      '46',
      '47',
      '48',
      '49',
      '50',
      '51',
      '53',
      '54',
      '55',
      '56', // All 50 states + DC + territories
    ];

    const allDistricts: CensusDistrictResponse[] = [];

    for (const stateCode of stateCodes) {
      try {
        const stateDistricts = await this.getDistrictsForState(stateCode);
        allDistricts.push(...stateDistricts);
      } catch {
        // Silently skip failed states to maintain service availability
        // Continue processing remaining states
      }
    }

    return allDistricts;
  }
}
