/**
 * District Boundary Utilities
 *
 * Utilities for working with real congressional district boundaries
 * using Census TIGER/Line data and PMTiles format.
 */

// Types for district boundary data
export interface DistrictBoundary {
  id: string;
  state_fips: string;
  state_name: string;
  state_abbr: string;
  district_num: string;
  name: string;
  full_name: string;
  centroid: [number, number]; // [lng, lat]
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  area_sqm: number;
  geoid: string;
}

export interface DistrictMetadata {
  districts: Record<string, DistrictBoundary>;
  states: Record<string, StateMetadata>;
  summary: {
    total_districts: number;
    states_with_districts: number;
    last_updated: string;
    source: string;
  };
}

export interface StateMetadata {
  fips: string;
  name: string;
  abbr: string;
  district_count: number;
  districts: string[];
}

export interface PointInDistrictResult {
  found: boolean;
  district?: DistrictBoundary;
  confidence: number;
  method: 'pmtiles' | 'bbox' | 'fallback';
}

class DistrictBoundaryService {
  private metadata: DistrictMetadata | null = null;
  private pmtilesUrl: string;
  private metadataUrl: string;

  constructor() {
    this.pmtilesUrl = '/maps/congressional_districts_119_real.pmtiles';
    this.metadataUrl = '/api/district-boundaries/metadata';
  }

  /**
   * Initialize the service by loading district metadata
   */
  async initialize(): Promise<void> {
    if (this.metadata) return;

    try {
      // Determine the base URL for API calls
      const baseUrl =
        typeof window !== 'undefined'
          ? window.location.origin
          : `http://localhost:${process.env.PORT || 3000}`;

      const metadataUrl = `${baseUrl}${this.metadataUrl}`;

      try {
        const response = await fetch(metadataUrl);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch district metadata: ${response.status} ${response.statusText}`
          );
        }

        this.metadata = await response.json();

        if (!this.metadata || !this.metadata.districts) {
          throw new Error('Invalid metadata format received from API');
        }
      } catch {
        // Silently provide a fallback empty structure to prevent complete failure
        // The error is already handled by the API returning appropriate status
        this.metadata = {
          districts: {},
          states: {},
          summary: {
            total_districts: 0,
            states_with_districts: 0,
            last_updated: new Date().toISOString(),
            source: 'Fallback - Metadata API unavailable',
          },
        };
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize district boundary service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get district metadata for a specific district ID
   */
  getDistrictById(districtId: string): DistrictBoundary | null {
    if (!this.metadata) {
      throw new Error('District boundary service not initialized');
    }

    return this.metadata.districts[districtId] || null;
  }

  /**
   * Get all districts for a state
   */
  getDistrictsByState(stateFips: string): DistrictBoundary[] {
    if (!this.metadata) {
      throw new Error('District boundary service not initialized');
    }

    const stateInfo = this.metadata.states[stateFips];
    if (!stateInfo) return [];

    return stateInfo.districts
      .map(districtId => this.metadata!.districts[districtId])
      .filter((district): district is DistrictBoundary => Boolean(district));
  }

  /**
   * Find district containing a specific point (latitude, longitude)
   */
  async findDistrictByPoint(lat: number, lng: number): Promise<PointInDistrictResult> {
    if (!this.metadata) {
      await this.initialize();
    }

    // First, try fast bounding box check
    const bboxCandidates = this.findDistrictsByBoundingBox(lat, lng);

    if (bboxCandidates.length === 1) {
      return {
        found: true,
        district: bboxCandidates[0],
        confidence: 0.9,
        method: 'bbox',
      };
    }

    if (bboxCandidates.length > 1) {
      // Multiple candidates, need precise geometry check
      // This would require point-in-polygon against PMTiles data
      // For now, return the closest by centroid distance
      const closest = this.findClosestDistrict(lat, lng, bboxCandidates);
      return {
        found: closest !== null,
        district: closest ?? undefined,
        confidence: 0.7,
        method: 'fallback',
      };
    }

    // No bounding box matches, find closest district overall
    const closest = this.findClosestDistrict(lat, lng);
    return {
      found: closest !== null,
      district: closest ?? undefined,
      confidence: 0.3,
      method: 'fallback',
    };
  }

  /**
   * Find districts whose bounding boxes contain the point
   */
  private findDistrictsByBoundingBox(lat: number, lng: number): DistrictBoundary[] {
    if (!this.metadata) return [];

    const candidates: DistrictBoundary[] = [];

    for (const district of Object.values(this.metadata.districts)) {
      const [minLng, minLat, maxLng, maxLat] = district.bbox;

      if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
        candidates.push(district);
      }
    }

    return candidates;
  }

  /**
   * Find the closest district to a point by centroid distance
   */
  private findClosestDistrict(
    lat: number,
    lng: number,
    candidates?: DistrictBoundary[]
  ): DistrictBoundary | null {
    if (!this.metadata) return null;

    const searchDistricts = candidates || Object.values(this.metadata.districts);
    let closest: DistrictBoundary | null = null;
    let minDistance = Infinity;

    for (const district of searchDistricts) {
      const [districtLng, districtLat] = district.centroid;
      const distance = this.calculateDistance(lat, lng, districtLat, districtLng);

      if (distance < minDistance) {
        minDistance = distance;
        closest = district;
      }
    }

    return closest;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLng = this.degreesToRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get districts within a bounding box
   */
  getDistrictsInBounds(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number
  ): DistrictBoundary[] {
    if (!this.metadata) return [];

    const results: DistrictBoundary[] = [];

    for (const district of Object.values(this.metadata.districts)) {
      const [dMinLng, dMinLat, dMaxLng, dMaxLat] = district.bbox;

      // Check if bounding boxes overlap
      if (dMaxLng >= minLng && dMinLng <= maxLng && dMaxLat >= minLat && dMinLat <= maxLat) {
        results.push(district);
      }
    }

    return results;
  }

  /**
   * Search districts by name or state
   */
  searchDistricts(query: string): DistrictBoundary[] {
    if (!this.metadata) return [];

    const lowerQuery = query.toLowerCase();
    const results: DistrictBoundary[] = [];

    for (const district of Object.values(this.metadata.districts)) {
      if (
        district.name.toLowerCase().includes(lowerQuery) ||
        district.full_name.toLowerCase().includes(lowerQuery) ||
        district.state_name.toLowerCase().includes(lowerQuery) ||
        district.state_abbr.toLowerCase().includes(lowerQuery)
      ) {
        results.push(district);
      }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get the PMTiles URL for use with MapLibre GL JS
   */
  getPMTilesUrl(): string {
    return this.pmtilesUrl;
  }

  /**
   * Get summary statistics
   */
  getSummary(): DistrictMetadata['summary'] | null {
    return this.metadata?.summary || null;
  }

  /**
   * Get all state information
   */
  getAllStates(): StateMetadata[] {
    if (!this.metadata) return [];

    return Object.values(this.metadata.states).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Generate bounds for a district (useful for map fitting)
   */
  getDistrictBounds(districtId: string): [[number, number], [number, number]] | null {
    const district = this.getDistrictById(districtId);
    if (!district) return null;

    const [minLng, minLat, maxLng, maxLat] = district.bbox;
    return [
      [minLat, minLng],
      [maxLat, maxLng],
    ]; // [[sw], [ne]] format for Leaflet
  }

  /**
   * Get centroid for a district (useful for map centering)
   */
  getDistrictCenter(districtId: string): [number, number] | null {
    const district = this.getDistrictById(districtId);
    if (!district) return null;

    const [lng, lat] = district.centroid;
    return [lat, lng]; // [lat, lng] format for Leaflet
  }
}

// Create singleton instance
export const districtBoundaryService = new DistrictBoundaryService();

/**
 * Helper function to format district name for display
 */
export function formatDistrictName(district: DistrictBoundary): string {
  const districtNum = parseInt(district.district_num);

  if (districtNum === 1 && district.state_name === 'At Large') {
    return `${district.state_abbr} At-Large`;
  }

  return `${district.state_abbr}-${districtNum.toString().padStart(2, '0')}`;
}

/**
 * Helper function to get district color based on political data
 */
export function getDistrictColor(
  district: DistrictBoundary,
  politicalData?: { party?: string; lean?: string }
): string {
  if (!politicalData?.party) {
    return '#6b7280'; // Default gray
  }

  switch (politicalData.party.toLowerCase()) {
    case 'democratic':
    case 'democrat':
      return '#3b82f6'; // Blue
    case 'republican':
      return '#ef4444'; // Red
    case 'independent':
      return '#8b5cf6'; // Purple
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Validation function for district boundaries data
 */
export function validateDistrictBoundary(data: unknown): data is DistrictBoundary {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.state_fips === 'string' &&
    typeof obj.district_num === 'string' &&
    Array.isArray(obj.centroid) &&
    obj.centroid.length === 2 &&
    typeof obj.centroid[0] === 'number' &&
    typeof obj.centroid[1] === 'number' &&
    Array.isArray(obj.bbox) &&
    obj.bbox.length === 4 &&
    obj.bbox.every((coord: unknown) => typeof coord === 'number')
  );
}
