/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getAllStateLegislatures } from '@/lib/data/static-state-legislatures';
import { firstDistrictPerChamber } from '@/lib/sitemap/state-district-urls';
import { StateDistrictsDirectory, type FirstDistricts } from './StateDistrictsDirectory';

// The roster corpus is committed and refreshed weekly; a day is plenty.
export const revalidate = 86400;

export default async function StateDistrictsPage() {
  const codes = Object.keys(getAllStateLegislatures()).filter(code => code !== 'DC');
  const firsts = await Promise.all(codes.map(firstDistrictPerChamber));
  const firstDistricts: FirstDistricts = Object.fromEntries(
    codes.map((code, i) => [
      code,
      Object.fromEntries((firsts[i] ?? []).map(f => [f.chamber, f.district])),
    ])
  );
  return <StateDistrictsDirectory firstDistricts={firstDistricts} />;
}
