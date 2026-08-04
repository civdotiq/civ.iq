/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NOAA Climate Data Service
 *
 * Queries NOAA CDO for climate normals and severe weather events.
 *
 * API: https://www.ncdc.noaa.gov/cdo-web/api/v2/
 * Requires NOAA_TOKEN.
 *
 * Severe weather: https://www.ncdc.noaa.gov/stormevents/
 */

import { cachedFetch } from '@/lib/cache';
import { parseUpstreamTotal } from '@/lib/data-sources/upstream-total';
import logger from '@/lib/logging/simple-logger';
import type {
  NoaaClimateNormals,
  NoaaSevereWeatherEvent,
  NoaaCdoResponse,
  RawNoaaDataValue,
  RawNoaaStormEvent,
} from '@/types/noaa';

const CDO_BASE = 'https://www.ncdc.noaa.gov/cdo-web/api/v2';
const STORM_EVENTS_BASE = 'https://www.ncdc.noaa.gov/stormevents/csv';

const MIN_REQUEST_INTERVAL_MS = 500;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

/** FIPS state codes for NOAA API (FIPS:XX format) */
const STATE_FIPS: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
  DC: '11',
};

function getToken(): string | null {
  return process.env.NOAA_TOKEN ?? null;
}

async function rateLimitedCdoFetch(url: string): Promise<Response> {
  const token = getToken();
  if (!token) throw new Error('NOAA_TOKEN not configured');

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      token,
      'User-Agent': 'CIV.IQ (civdotiq.org)',
    },
    signal: AbortSignal.timeout(30_000),
  });
}

function parseDamageAmount(value: string | null | undefined): number {
  if (!value || value === '0') return 0;
  const match = value.match(/^([\d.]+)([KMB])?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1] ?? '0');
  const suffix = (match[2] ?? '').toUpperCase();
  if (suffix === 'K') return num * 1_000;
  if (suffix === 'M') return num * 1_000_000;
  if (suffix === 'B') return num * 1_000_000_000;
  return num;
}

export class NoaaService {
  /**
   * Get climate normals for a state (30-year averages).
   */
  async getClimateNormals(stateAbbrev: string): Promise<NoaaClimateNormals | null> {
    const token = getToken();
    if (!token) {
      logger.warn('NOAA_TOKEN not configured');
      return null;
    }

    const state = stateAbbrev.toUpperCase();
    const fips = STATE_FIPS[state];
    if (!fips) {
      logger.warn('Unknown state for NOAA lookup', { state });
      return null;
    }

    const cacheKey = `noaa-normals:${state}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const currentYear = new Date().getFullYear();
          const startDate = `${currentYear - 1}-01-01`;
          const endDate = `${currentYear - 1}-12-31`;

          // Get annual normals: temperature, precipitation, snowfall
          const datatypes = 'TAVG,TMIN,TMAX,PRCP,SNOW';
          const url = `${CDO_BASE}/data?datasetid=NORMAL_ANN&datatypeid=${datatypes}&locationid=FIPS:${fips}&startdate=${startDate}&enddate=${endDate}&units=standard&limit=1000`;

          logger.info('NOAA climate normals', { state, fips });
          const response = await rateLimitedCdoFetch(url);

          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`NOAA CDO API returned ${response.status}`);
          }

          const data: NoaaCdoResponse<RawNoaaDataValue> = await response.json();
          const results = data.results ?? [];

          let avgTemp: number | null = null;
          let avgMin: number | null = null;
          let avgMax: number | null = null;
          let avgPrecip: number | null = null;
          let avgSnow: number | null = null;
          const stations = new Set<string>();

          for (const r of results) {
            stations.add(r.station);
            // NOAA normals values are in tenths (temp) or hundredths (precip)
            switch (r.datatype) {
              case 'TAVG':
                avgTemp = r.value / 10;
                break;
              case 'TMIN':
                avgMin = r.value / 10;
                break;
              case 'TMAX':
                avgMax = r.value / 10;
                break;
              case 'PRCP':
                avgPrecip = r.value / 100;
                break;
              case 'SNOW':
                avgSnow = r.value / 10;
                break;
            }
          }

          return {
            state,
            stations: stations.size,
            avgTemperature: avgTemp,
            avgMinTemperature: avgMin,
            avgMaxTemperature: avgMax,
            avgPrecipitation: avgPrecip,
            avgSnowfall: avgSnow,
            period: `${currentYear - 1} annual normals`,
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NoaaService.getClimateNormals failed', error as Error);
      return null;
    }
  }

  /**
   * Get severe weather events for a state, optionally filtered by year.
   * Uses the NOAA Storm Events API.
   */
  async getSevereWeatherEvents(
    stateAbbrev: string,
    year?: number
  ): Promise<NoaaSevereWeatherEvent[]> {
    return (await this.getSevereWeatherEventsDetailed(stateAbbrev, year)).events;
  }

  /**
   * As `getSevereWeatherEvents`, but says what the rows actually are.
   *
   * The Storm Events database is the only source here carrying casualties and
   * damage. When it is unreachable this falls back to GHCND daily weather-type
   * flags (fog, thunder, hail observed at a station), which are real
   * observations but are not events and carry no impact data at all — the
   * transform fills those fields with zero.
   *
   * A caller that sums those zeros publishes "0 deaths" as a measurement. So
   * the shape of the answer travels with it: `hasImpactData` is false for the
   * fallback, and casualty and damage figures must then be withheld rather
   * than reported as zero.
   */
  async getSevereWeatherEventsDetailed(
    stateAbbrev: string,
    year?: number
  ): Promise<{
    events: NoaaSevereWeatherEvent[];
    /** True only for Storm Events rows, which carry casualties and damage. */
    hasImpactData: boolean;
    /** Rows matching upstream, when reported. */
    totalAvailable: number | null;
  }> {
    const token = getToken();
    if (!token) {
      logger.warn('NOAA_TOKEN not configured');
      return { events: [], hasImpactData: false, totalAvailable: null };
    }

    const state = stateAbbrev.toUpperCase();
    const fips = STATE_FIPS[state];
    if (!fips) {
      logger.warn('Unknown state for NOAA storm events', { state });
      return { events: [], hasImpactData: false, totalAvailable: null };
    }

    const targetYear = year ?? new Date().getFullYear() - 1;
    const cacheKey = `noaa-storms:${state}:${targetYear}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Use CDO storm events dataset
          const startDate = `${targetYear}-01-01`;
          const endDate = `${targetYear}-12-31`;
          const url = `${CDO_BASE}/data?datasetid=GHCND&locationid=FIPS:${fips}&startdate=${startDate}&enddate=${endDate}&datatypeid=TMAX,TMIN,PRCP&limit=25`;

          logger.info('NOAA severe weather events', { state, targetYear });

          // Storm events are best fetched from the Storm Events Database API
          const stormUrl = `${STORM_EVENTS_BASE}?state=${state}&beginDate_yyyy=${targetYear}&endDate_yyyy=${targetYear}`;

          try {
            const response = await rateLimitedCdoFetch(stormUrl);
            if (response.ok) {
              const text = await response.text();
              // Parse CSV if available
              const events = parseStormEventsCsv(text, state);
              return { events, hasImpactData: true, totalAvailable: events.length };
            }
          } catch {
            // Fall through to CDO approach
          }

          // Fallback: Use CDO extreme events dataset
          const cdoUrl = `${CDO_BASE}/data?datasetid=GHCND&locationid=FIPS:${fips}&startdate=${startDate}&enddate=${endDate}&datatypeid=WT01,WT02,WT03,WT04,WT05,WT06,WT08&limit=100`;

          try {
            const cdoResponse = await rateLimitedCdoFetch(cdoUrl);
            if (cdoResponse.ok) {
              const data: NoaaCdoResponse<RawNoaaDataValue> = await cdoResponse.json();
              const events = (data.results ?? []).map(r => ({
                eventId: `${r.station}-${r.date}-${r.datatype}`,
                eventType: mapWeatherType(r.datatype),
                state,
                countyOrZone: '',
                beginDate: r.date,
                endDate: r.date,
                injuries: 0,
                deaths: 0,
                damageProperty: 0,
                damageCrops: 0,
                source: 'NOAA GHCND',
                narrative: null,
              }));
              return {
                events,
                // GHCND weather-type flags: no casualties or damage recorded.
                hasImpactData: false,
                totalAvailable: parseUpstreamTotal(data.metadata?.resultset?.count),
              };
            }
          } catch {
            // Return empty on failure
          }

          return { events: [], hasImpactData: false, totalAvailable: null };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('NoaaService.getSevereWeatherEvents failed', error as Error);
      return { events: [], hasImpactData: false, totalAvailable: null };
    }
  }
}

function mapWeatherType(datatype: string): string {
  const map: Record<string, string> = {
    WT01: 'Fog',
    WT02: 'Heavy Fog',
    WT03: 'Thunder',
    WT04: 'Ice Pellets',
    WT05: 'Hail',
    WT06: 'Rime',
    WT08: 'Smoke/Haze',
  };
  return map[datatype] ?? datatype;
}

function parseStormEventsCsv(csv: string, state: string): NoaaSevereWeatherEvent[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0]?.split(',').map(h => h.trim().toUpperCase()) ?? [];
  const eventTypeIdx = headers.indexOf('EVENT_TYPE');
  const beginIdx = headers.indexOf('BEGIN_DATE_TIME');
  const endIdx = headers.indexOf('END_DATE_TIME');
  const czIdx = headers.indexOf('CZ_NAME');
  const injIdx = headers.indexOf('INJURIES_DIRECT');
  const deathIdx = headers.indexOf('DEATHS_DIRECT');
  const dmgPropIdx = headers.indexOf('DAMAGE_PROPERTY');
  const dmgCropIdx = headers.indexOf('DAMAGE_CROPS');
  const srcIdx = headers.indexOf('SOURCE');
  const narrIdx = headers.indexOf('EVENT_NARRATIVE');

  if (eventTypeIdx === -1) return [];

  const events: NoaaSevereWeatherEvent[] = [];
  for (let i = 1; i < Math.min(lines.length, 101); i++) {
    const cols = lines[i]?.split(',') ?? [];
    if (cols.length < 5) continue;

    events.push({
      eventId: `${state}-${i}`,
      eventType: cols[eventTypeIdx] ?? '',
      state,
      countyOrZone: cols[czIdx] ?? '',
      beginDate: cols[beginIdx] ?? '',
      endDate: cols[endIdx] ?? '',
      injuries: parseInt(cols[injIdx] ?? '0', 10) || 0,
      deaths: parseInt(cols[deathIdx] ?? '0', 10) || 0,
      damageProperty: parseDamageAmount(cols[dmgPropIdx]),
      damageCrops: parseDamageAmount(cols[dmgCropIdx]),
      source: cols[srcIdx] ?? 'NOAA Storm Events',
      narrative: cols[narrIdx] || null,
    });
  }

  return events;
}

export const noaaService = new NoaaService();
