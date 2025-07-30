/**
 * Representatives API service
 * Handles all representative-related API calls
 */

import { apiGet, apiPost } from './base';

export interface RepresentativeFilters {
  zip?: string;
  state?: string;
  party?: string;
  chamber?: 'House' | 'Senate';
  district?: string;
}

export interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
}

export interface RepresentativesResponse {
  representatives: Representative[];
  total: number;
  cached: boolean;
}

/**
 * Get representatives by ZIP code
 */
export const getRepresentativesByZip = (zip: string) =>
  apiGet<RepresentativesResponse>(`/representatives?zip=${zip}`);

/**
 * Get representatives with filters
 */
export const getRepresentatives = (filters?: RepresentativeFilters) =>
  apiPost<RepresentativesResponse>('/representatives', filters);

/**
 * Get individual representative details
 */
export const getRepresentative = (bioguideId: string) =>
  apiGet<Representative>(`/representative/${bioguideId}`);

/**
 * Get representative voting records
 */
export const getRepresentativeVotes = (bioguideId: string, limit = 20) =>
  apiGet(`/representative/${bioguideId}/votes?limit=${limit}`);

/**
 * Get representative bills
 */
export const getRepresentativeBills = (bioguideId: string, limit = 20) =>
  apiGet(`/representative/${bioguideId}/bills?limit=${limit}`);

/**
 * Get representative campaign finance data
 */
export const getRepresentativeFinance = (bioguideId: string) =>
  apiGet(`/representative/${bioguideId}/finance`);

/**
 * Get representative news
 */
export const getRepresentativeNews = (bioguideId: string, limit = 10) =>
  apiGet(`/representative/${bioguideId}/news?limit=${limit}`);

/**
 * Get representative party alignment
 */
export const getRepresentativePartyAlignment = (bioguideId: string) =>
  apiGet(`/representative/${bioguideId}/party-alignment`);
