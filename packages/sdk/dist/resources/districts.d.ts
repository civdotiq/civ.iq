import type { HttpClient } from '../http.js';
import type {
  DistrictDetailResponse,
  DistrictListResponse,
  GeocodeResponse,
  GeocodeInput,
} from '../types.js';
export declare class DistrictsResource {
  private readonly http;
  constructor(http: HttpClient);
  /** Get district info and its representatives. */
  get(districtId: string): Promise<DistrictDetailResponse>;
  /** List all 435 congressional districts. */
  list(params?: { limit?: number; offset?: number }): Promise<DistrictListResponse>;
  /** Resolve an address or coordinates to a congressional district. */
  geocode(input: GeocodeInput): Promise<GeocodeResponse>;
}
//# sourceMappingURL=districts.d.ts.map
