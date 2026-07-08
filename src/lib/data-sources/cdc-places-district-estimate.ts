/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CDC PLACES district-level estimate.
 *
 * PLACES does not publish congressional-district figures, but it does publish
 * model-based prevalence at the census-tract level, and tracts nest inside
 * districts (Census CD-to-tract crosswalk). A defensible district figure is the
 * population-weighted mean of tract prevalence:
 *
 *   districtRate(m) = Σ_t ( tractRate(m, t) × adultPop(t) ) / Σ_t adultPop(t)
 *
 * Weights are the tract's 18+ population (`totalpop18plus`) — the PLACES
 * denominator population itself, so the weight vintage matches the estimate
 * vintage exactly. For a tract that straddles the district boundary the weight
 * is apportioned by the tract's land-area fraction inside the district.
 *
 * This is a like-for-like average of one measure's crude-prevalence rates. It
 * never mixes measures or value types, and it emits null (with a reason) rather
 * than a low-coverage number.
 *
 * Dataset: https://data.cdc.gov/resource/cwsq-ngmh (PLACES: Census Tract Data)
 */

import logger from '@/lib/logging/simple-logger';
import { getTractsForDistrict } from '@/lib/data/tract-district-mapping';
import { PLACES_MEASURES } from '@/lib/data-sources/cdc-places-service';

const PLACES_TRACT_API = 'https://data.cdc.gov/resource/cwsq-ngmh.json';

/**
 * Minimum share of the district's adult population that must be represented by
 * tracts carrying a value before a district number is emitted. Below this the
 * measure returns null + a reason, and the UI falls back to the county table.
 */
export const PLACES_COVERAGE_THRESHOLD = 0.8;

const PAGE_SIZE = 50000;
const MAX_PAGES = 12; // safeguard: 600k rows is far beyond any real district

export interface PlacesEstimateCoverage {
  tractsUsed: number; // tracts with a value for this measure
  tractsExcluded: number; // tracts with a value but no usable adult-population weight
  adultPopCovered: number; // Σ adult pop of tracts used (area-apportioned)
  districtAdultPop: number; // Σ adult pop across the district's PLACES tracts
  pctCovered: number; // adultPopCovered / districtAdultPop, 0-1
}

export interface PlacesDistrictMeasureEstimate {
  measureId: string;
  label: string;
  unit: '%';
  value: number | null; // population-weighted crude prevalence; null below threshold
  lowCI: number | null; // conservative pop-weighted mean of tract low CIs (approximation)
  highCI: number | null; // conservative pop-weighted mean of tract high CIs (approximation)
  coverage: PlacesEstimateCoverage;
  estimateUnavailableReason?: string;
}

export interface DistrictPlacesEstimate {
  dataYear: string | null; // BRFSS survey year of the PLACES tract release
  method: string;
  measures: PlacesDistrictMeasureEstimate[];
}

interface TractApiRecord {
  locationid?: string; // 11-digit tract GEOID
  measureid?: string;
  data_value?: string;
  low_confidence_limit?: string;
  high_confidence_limit?: string;
  totalpop18plus?: string;
  year?: string;
}

function parseNumeric(raw: string | undefined): number | null {
  if (raw == null) return null;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Fetch all PLACES tract records for the given counties and measures, paging
 * through the Socrata API so nothing is silently truncated.
 */
async function fetchTractRecords(
  countyFips: string[],
  measureIds: string[]
): Promise<TractApiRecord[] | null> {
  const where =
    `datavaluetypeid='CrdPrv'` +
    ` and countyfips in(${countyFips.map(c => `'${c}'`).join(',')})` +
    ` and measureid in(${measureIds.map(m => `'${m}'`).join(',')})`;
  const select =
    'locationid,measureid,data_value,low_confidence_limit,high_confidence_limit,totalpop18plus,year';

  const all: TractApiRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `${PLACES_TRACT_API}?$select=${encodeURIComponent(select)}` +
      `&$where=${encodeURIComponent(where)}` +
      `&$order=locationid` +
      `&$limit=${PAGE_SIZE}&$offset=${page * PAGE_SIZE}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`CDC PLACES tract API error: ${response.status}`);
    }
    const batch: unknown = await response.json();
    if (!Array.isArray(batch)) return null;
    all.push(...(batch as TractApiRecord[]));
    if (batch.length < PAGE_SIZE) return all;
    if (page === MAX_PAGES - 1) {
      logger.warn('CDC PLACES tract fetch hit page cap; result may be truncated', {
        countyCount: countyFips.length,
        rows: all.length,
      });
    }
  }
  return all;
}

/**
 * Compute a population-weighted district prevalence estimate per measure.
 * Returns null when there is no tract mapping or the fetch/parse fails —
 * never a fabricated value.
 */
export async function computeDistrictPlacesEstimate(
  stateCode: string,
  districtNumber: number
): Promise<DistrictPlacesEstimate | null> {
  const tracts = getTractsForDistrict(stateCode, districtNumber);
  if (tracts.length === 0) {
    logger.warn('No tract mapping for district in PLACES estimate', { stateCode, districtNumber });
    return null;
  }

  // Tract -> land-area fraction inside the district, and the counties to query.
  const areaFractionByTract = new Map<string, number>();
  const countySet = new Set<string>();
  for (const t of tracts) {
    areaFractionByTract.set(t.tract, t.areaFraction);
    countySet.add(t.tract.slice(0, 5));
  }

  const measureIds = PLACES_MEASURES.map(m => m.measureId);

  let records: TractApiRecord[] | null;
  try {
    logger.info('Fetching CDC PLACES tract data', {
      stateCode,
      districtNumber,
      countyCount: countySet.size,
      tractCount: tracts.length,
    });
    records = await fetchTractRecords([...countySet], measureIds);
  } catch (error) {
    logger.error('Error fetching CDC PLACES tract data', error as Error, {
      stateCode,
      districtNumber,
    });
    return null;
  }
  if (!records || records.length === 0) {
    logger.warn('CDC PLACES tract fetch returned no records', { stateCode, districtNumber });
    return null;
  }

  // Adult population per district tract (area-apportioned). Populated from any
  // record for the tract; totalpop18plus is identical across a tract's measures.
  const weightByTract = new Map<string, number>();
  let dataYear: string | null = null;

  interface MeasureAccumulator {
    weightedValue: number;
    weightedLow: number;
    weightedHigh: number;
    ciWeight: number; // Σ weight over tracts that also carry CIs
    coverWeight: number; // Σ weight over tracts with a value
    tractsUsed: number;
    tractsExcluded: number;
  }
  const acc = new Map<string, MeasureAccumulator>();
  const getAcc = (id: string): MeasureAccumulator => {
    let a = acc.get(id);
    if (!a) {
      a = {
        weightedValue: 0,
        weightedLow: 0,
        weightedHigh: 0,
        ciWeight: 0,
        coverWeight: 0,
        tractsUsed: 0,
        tractsExcluded: 0,
      };
      acc.set(id, a);
    }
    return a;
  };

  for (const raw of records) {
    const tract = raw.locationid;
    if (!tract) continue;
    const areaFraction = areaFractionByTract.get(tract);
    if (areaFraction == null) continue; // tract in the county but not this district

    dataYear = dataYear ?? raw.year ?? null;

    // Record the tract's district-apportioned adult-population weight once.
    if (!weightByTract.has(tract)) {
      const pop = parseNumeric(raw.totalpop18plus);
      weightByTract.set(tract, pop != null && pop > 0 ? pop * areaFraction : 0);
    }
    const weight = weightByTract.get(tract) ?? 0;

    if (!raw.measureid) continue;
    const value = parseNumeric(raw.data_value);
    if (value == null) continue; // suppressed value for this tract/measure

    const a = getAcc(raw.measureid);
    if (weight <= 0) {
      a.tractsExcluded += 1; // has a value but no usable weight
      continue;
    }
    a.tractsUsed += 1;
    a.coverWeight += weight;
    a.weightedValue += value * weight;

    const low = parseNumeric(raw.low_confidence_limit);
    const high = parseNumeric(raw.high_confidence_limit);
    if (low != null && high != null) {
      a.weightedLow += low * weight;
      a.weightedHigh += high * weight;
      a.ciWeight += weight;
    }
  }

  const districtAdultPop = [...weightByTract.values()].reduce((s, w) => s + w, 0);

  const round1 = (n: number): number => Math.round(n * 10) / 10;

  const measures: PlacesDistrictMeasureEstimate[] = PLACES_MEASURES.map(m => {
    const a = acc.get(m.measureId);
    const coverWeight = a?.coverWeight ?? 0;
    const pctCovered = districtAdultPop > 0 ? coverWeight / districtAdultPop : 0;
    const coverage: PlacesEstimateCoverage = {
      tractsUsed: a?.tractsUsed ?? 0,
      tractsExcluded: a?.tractsExcluded ?? 0,
      adultPopCovered: Math.round(coverWeight),
      districtAdultPop: Math.round(districtAdultPop),
      pctCovered: Math.round(pctCovered * 1000) / 1000,
    };

    if (districtAdultPop <= 0) {
      return {
        measureId: m.measureId,
        label: m.label,
        unit: '%' as const,
        value: null,
        lowCI: null,
        highCI: null,
        coverage,
        estimateUnavailableReason: 'No adult-population weights available for this district',
      };
    }
    if (!a || coverWeight <= 0) {
      return {
        measureId: m.measureId,
        label: m.label,
        unit: '%' as const,
        value: null,
        lowCI: null,
        highCI: null,
        coverage,
        estimateUnavailableReason: 'No tract values available for this measure',
      };
    }
    if (pctCovered < PLACES_COVERAGE_THRESHOLD) {
      return {
        measureId: m.measureId,
        label: m.label,
        unit: '%' as const,
        value: null,
        lowCI: null,
        highCI: null,
        coverage,
        estimateUnavailableReason: `Tract coverage ${Math.round(pctCovered * 100)}% is below the ${Math.round(
          PLACES_COVERAGE_THRESHOLD * 100
        )}% threshold`,
      };
    }

    return {
      measureId: m.measureId,
      label: m.label,
      unit: '%' as const,
      value: round1(a.weightedValue / coverWeight),
      lowCI: a.ciWeight > 0 ? round1(a.weightedLow / a.ciWeight) : null,
      highCI: a.ciWeight > 0 ? round1(a.weightedHigh / a.ciWeight) : null,
      coverage,
    };
  });

  return {
    dataYear,
    method:
      'Population-weighted mean of census-tract crude prevalence, weighted by adult population. ' +
      'Confidence limits are the population-weighted mean of tract limits, an approximation.',
    measures,
  };
}
