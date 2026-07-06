/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CDC PLACES county-level health data.
 *
 * PLACES publishes model-based prevalence estimates (BRFSS) at county,
 * place, tract, and ZCTA level — it does NOT publish congressional-district
 * figures. This service returns the crude prevalence percentages for the
 * counties overlapping a district (Census CD-county crosswalk), presented
 * as county values, never synthesized into a fabricated district number.
 *
 * Dataset: https://data.cdc.gov/resource/swc5-untb (PLACES: County Data)
 */

import logger from '@/lib/logging/simple-logger';
import { getCountiesForDistrict } from '@/lib/data/county-district-mapping';

const PLACES_API = 'https://data.cdc.gov/resource/swc5-untb.json';

/**
 * Approved measure set (2026-07): outcomes + access + prevention + behavior.
 * measureId values are CDC PLACES identifiers; labels stay close to the
 * official CDC measure text.
 */
export const PLACES_MEASURES: ReadonlyArray<{ measureId: string; label: string }> = [
  { measureId: 'DIABETES', label: 'Diagnosed diabetes among adults' },
  { measureId: 'MHLTH', label: 'Frequent mental distress among adults' },
  { measureId: 'CHECKUP', label: 'Routine checkup in the past year among adults' },
  { measureId: 'ACCESS2', label: 'No health insurance, adults 18–64' },
  { measureId: 'OBESITY', label: 'Obesity among adults' },
  { measureId: 'CSMOKING', label: 'Current cigarette smoking among adults' },
];

export interface PlacesCountyValue {
  fips: string;
  name: string;
  value: number; // crude prevalence, percent of adults
  lowCI: number | null;
  highCI: number | null;
}

export interface PlacesMeasure {
  measureId: string;
  label: string;
  unit: '%';
  counties: PlacesCountyValue[]; // sorted by value descending
}

export interface DistrictPlacesData {
  dataYear: string | null; // BRFSS survey year of the PLACES release
  measures: PlacesMeasure[];
}

interface PlacesApiRecord {
  locationid?: string;
  locationname?: string;
  measureid?: string;
  data_value?: string;
  low_confidence_limit?: string;
  high_confidence_limit?: string;
  year?: string;
}

function parseNumeric(raw: string | undefined): number | null {
  if (raw == null) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Fetch PLACES crude prevalence for the counties overlapping a district.
 * Returns null when data is unavailable (no county mapping, fetch failure,
 * or empty result) — never a fabricated value.
 */
export async function fetchDistrictPlacesData(
  stateCode: string,
  districtNumber: number
): Promise<DistrictPlacesData | null> {
  const counties = getCountiesForDistrict(stateCode, districtNumber);
  if (counties.length === 0) {
    logger.warn('No county mapping for district in PLACES lookup', { stateCode, districtNumber });
    return null;
  }

  const measureIds = PLACES_MEASURES.map(m => m.measureId);
  const where = `locationid in(${counties.map(c => `'${c}'`).join(',')}) and measureid in(${measureIds.map(m => `'${m}'`).join(',')})`;
  const url =
    `${PLACES_API}?datavaluetypeid=CrdPrv` +
    `&$select=${encodeURIComponent('locationid,locationname,measureid,data_value,low_confidence_limit,high_confidence_limit,year')}` +
    `&$where=${encodeURIComponent(where)}` +
    `&$limit=${counties.length * measureIds.length + 50}`;

  try {
    logger.info('Fetching CDC PLACES county data', {
      stateCode,
      districtNumber,
      countyCount: counties.length,
    });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`CDC PLACES API error: ${response.status}`);
    }

    const records: unknown = await response.json();
    if (!Array.isArray(records) || records.length === 0) {
      logger.warn('CDC PLACES returned no records', { stateCode, districtNumber });
      return null;
    }

    let dataYear: string | null = null;
    const byMeasure = new Map<string, PlacesCountyValue[]>();

    for (const raw of records as PlacesApiRecord[]) {
      const value = parseNumeric(raw.data_value);
      if (!raw.measureid || !raw.locationid || value == null) continue;

      dataYear = dataYear ?? raw.year ?? null;
      const list = byMeasure.get(raw.measureid) ?? [];
      list.push({
        fips: raw.locationid,
        name: raw.locationname ?? raw.locationid,
        value,
        lowCI: parseNumeric(raw.low_confidence_limit),
        highCI: parseNumeric(raw.high_confidence_limit),
      });
      byMeasure.set(raw.measureid, list);
    }

    const measures: PlacesMeasure[] = PLACES_MEASURES.filter(m => byMeasure.has(m.measureId)).map(
      m => ({
        measureId: m.measureId,
        label: m.label,
        unit: '%' as const,
        counties: (byMeasure.get(m.measureId) ?? []).sort((a, b) => b.value - a.value),
      })
    );

    if (measures.length === 0) return null;

    return { dataYear, measures };
  } catch (error) {
    logger.error('Error fetching CDC PLACES data', error as Error, {
      stateCode,
      districtNumber,
    });
    return null;
  }
}
