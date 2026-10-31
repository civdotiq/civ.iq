/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The two dates on a congressional district page (real-dates plan, PR 4).
 * Same rules as member profiles (profile-dates.ts):
 *
 * - Latest record: when the seat's member's congress-legislators entry last
 *   changed. It is the only fact in the server-rendered page dated to the
 *   day: ACS estimates are dated by year ("2020–2024"), the 2024 result
 *   predates every sitting member's roster entry, and the Gazetteer's date is
 *   when CIV.IQ built its file. Sections the browser loads (FEC, spending,
 *   bills) carry no stored date to the server render.
 * - Checked: when CIV.IQ fetched the record's Census and Wikidata data
 *   (fetchedAt, saved inside the 7-day cached fetch). The roster's fetch
 *   time isn't saved.
 *
 * The sitemap dates each district by districtLatestRecord, so it, the page
 * line and JSON-LD dateModified agree.
 */

import type { DistrictDetails } from './district-details';
import {
  combineProfileDates,
  rosterChangedOn,
  type ProfileDates,
} from '@/features/representatives/services/profile-dates';

/** A district page's Latest record: its member's roster change date, or null. */
export function districtLatestRecord(bioguideId: string | null | undefined): string | null {
  return bioguideId ? rosterChangedOn(bioguideId) : null;
}

/** A district page's dates, from the record it renders. No reads. */
export function getDistrictDates(district: DistrictDetails): ProfileDates {
  const fetched = district.demographics || district.wikidata ? district.fetchedAt : undefined;
  return combineProfileDates([
    {
      source: 'roster',
      date: districtLatestRecord(district.representative.bioguideId),
      checkedAt: null,
    },
    {
      source: 'census',
      date: null,
      checkedAt: fetched && !Number.isNaN(Date.parse(fetched)) ? fetched : null,
    },
  ]);
}
