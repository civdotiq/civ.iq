import type { HttpClient } from '../http.js';
import type {
  DistrictDetailResponse,
  DistrictListResponse,
  GeocodeResponse,
  GeocodeInput,
} from '../types.js';

export class DistrictsResource {
  constructor(private readonly http: HttpClient) {}

  /** Get district info and its representatives. */
  get(districtId: string): Promise<DistrictDetailResponse> {
    return this.http.get(`/v1/districts/${encodeURIComponent(districtId)}`);
  }

  /** List all 435 congressional districts. */
  list(params?: { limit?: number; offset?: number }): Promise<DistrictListResponse> {
    return this.http.get('/districts/all', params as Record<string, unknown>);
  }

  /** Resolve an address or coordinates to a congressional district. */
  geocode(input: GeocodeInput): Promise<GeocodeResponse> {
    return this.http.post('/geocode', input);
  }
}
