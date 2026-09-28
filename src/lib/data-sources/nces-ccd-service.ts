/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NCES Common Core of Data (CCD) public-school staffing for a congressional
 * district, via the Urban Institute Education Data API.
 *
 * The CCD school directory tags every public school with the congressional
 * district it sits in, so the district figure is a direct sum over the
 * schools inside it — no state average, no sampling. Replaces api.ed.gov,
 * which stopped resolving in 2026.
 *
 * Vintage: the 2024 directory (school year 2024-25) uses 119th Congress
 * districts; 2022 still used 116th-Congress lines. Bump CCD_YEAR only after
 * checking a redrawn state (e.g. NC-13 moved from Wake to Johnston County).
 */

import logger from '@/lib/logging/simple-logger';
import { parseDistrictId } from '@/lib/services/spending.service';
import { isDelegateJurisdiction } from '@/lib/data/us-states';

export const CCD_YEAR = 2024;
const BASE_URL = 'https://educationdata.urban.org/api/v1/schools/ccd/directory';
const MAX_PAGES = 10;
const WALK_BUDGET_MS = 10_000;

interface CcdSchool {
  enrollment: number | null;
  teachers_fte: number | null;
}

interface CcdPage {
  count: number;
  next: string | null;
  results: CcdSchool[];
}

export interface DistrictStaffing {
  studentsPerTeacher: number;
  /** Schools with both enrollment and teacher FTE reported (the ratio's basis). */
  schoolsReporting: number;
  schoolsTotal: number;
  year: number;
}

/**
 * Students per full-time-equivalent teacher across public schools in the
 * district. null when the district id is invalid, the upstream fails, or no
 * school reports both enrollment and teachers.
 */
export async function fetchDistrictStaffing(
  districtId: string,
  stateFips: string
): Promise<DistrictStaffing | null> {
  const parsed = parseDistrictId(districtId);
  if (!parsed) return null;

  // Urban encodes the district as state FIPS + 2-digit district (Census CD
  // codes): at-large is 00, but DC and territory delegate seats are 98.
  const districtCode = isDelegateJurisdiction(parsed.state) ? '98' : parsed.district;
  const congressDistrictId = `${Number(stateFips)}${districtCode}`;
  let url: string | null =
    `${BASE_URL}/${CCD_YEAR}/?fips=${Number(stateFips)}&congress_district_id=${congressDistrictId}`;

  // One budget for the whole walk: the API can take 50s+ per page, and the
  // services-health route runs under a 20s maxDuration. Past the budget,
  // staffing is reported unavailable rather than 504ing the route.
  const signal = AbortSignal.timeout(WALK_BUDGET_MS);

  try {
    const schools: CcdSchool[] = [];
    let total = 0;
    for (let page = 0; url && page < MAX_PAGES; page++) {
      const response = await fetch(url, {
        signal,
        // The API answers 403 to Node's default "node" User-Agent.
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CivIQ-Hub/2.0 (+https://civdotiq.org)',
        },
      });
      if (!response.ok) throw new Error(`Education Data API error: ${response.status}`);
      const data = (await response.json()) as CcdPage;
      total = data.count;
      schools.push(...data.results);
      url = data.next;
    }

    // A truncated walk would understate the district; report nothing instead.
    if (schools.length < total) {
      logger.warn('CCD school list incomplete; not reporting staffing', {
        districtId,
        fetched: schools.length,
        total,
      });
      return null;
    }

    let students = 0;
    let teachers = 0;
    let reporting = 0;
    for (const school of schools) {
      const enrollment = school.enrollment ?? 0;
      const fte = school.teachers_fte ?? 0;
      if (enrollment > 0 && fte > 0) {
        students += enrollment;
        teachers += fte;
        reporting++;
      }
    }

    if (teachers === 0) return null;

    return {
      studentsPerTeacher: students / teachers,
      schoolsReporting: reporting,
      schoolsTotal: total,
      year: CCD_YEAR,
    };
  } catch (error) {
    logger.error('Error fetching CCD district staffing', error as Error, { districtId });
    return null;
  }
}
